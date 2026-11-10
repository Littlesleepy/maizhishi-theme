from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import tempfile

from .locking import exclusive_file_lock


class PatchError(RuntimeError):
    pass


def digest(data):
    return hashlib.sha256(data).hexdigest()


def relative_path(value):
    if not isinstance(value, str):
        raise PatchError('Invalid patch path')
    path = PurePosixPath(value)
    if not path.parts or path.is_absolute() or '..' in path.parts or '\\' in value or ':' in value or '\x00' in value:
        raise PatchError('Unsafe patch path')
    return path


def confined(root, value):
    relative = relative_path(value)
    path = root.joinpath(*relative.parts)
    if not path.resolve().is_relative_to(root) or path == root:
        raise PatchError('Patch path escapes root')
    cursor = root
    for part in relative.parts:
        cursor = cursor / part
        if cursor.is_symlink():
            raise PatchError('Symlinked patch paths are not supported')
    return path


class PatchInstaller:
    def __init__(self, static_root, data_dir, payload_dir):
        self.static = Path(static_root).resolve()
        self.data = Path(data_dir).resolve()
        self.payload = Path(payload_dir).resolve()
        self.state_path = self.data / 'patch-state.json'
        target_key = digest(os.path.normcase(str(self.static)).encode('utf-8'))[:16]
        self.target_lock_path = self.static.parent / ('.maizhishi-' + target_key + '.lock')
        self.owner_path = self.static.parent / ('.maizhishi-' + target_key + '.owner.json')

    def atomic_write(self, path, data):
        path.parent.mkdir(parents=True, exist_ok=True)
        old_mode = stat.S_IMODE(path.stat().st_mode) if path.exists() else 0o644
        descriptor, name = tempfile.mkstemp(prefix='.maizhishi-', dir=str(path.parent))
        temp = Path(name)
        try:
            with os.fdopen(descriptor, 'wb') as output:
                output.write(data)
                output.flush()
                os.fsync(output.fileno())
            temp.chmod(old_mode)
            os.replace(temp, path)
        finally:
            if temp.exists():
                temp.unlink()

    def _write_state(self, state):
        self.atomic_write(self.state_path, json.dumps(state, ensure_ascii=False, indent=2).encode('utf-8'))

    @contextmanager
    def _locked(self):
        if self.data == self.static or self.data.is_relative_to(self.static):
            raise PatchError('Private patch state must be outside the public static directory')
        if self.state_path.is_symlink():
            raise PatchError('Patch state must not be a symlink')
        self.data.mkdir(mode=0o700, parents=True, exist_ok=True)
        lock = self.data / 'patch.lock'
        if lock.is_symlink() or self.target_lock_path.is_symlink() or self.owner_path.is_symlink():
            raise PatchError('Patch lock must not be a symlink')
        try:
            with exclusive_file_lock(self.target_lock_path):
                with exclusive_file_lock(lock):
                    self._check_owner()
                    yield
        except (BlockingIOError, PermissionError) as error:
            raise PatchError('Patch lock or target access denied; another transaction may be active') from error

    def _check_owner(self):
        if self.owner_path.exists():
            owner = json.loads(self.owner_path.read_text('utf-8'))
            if owner != {'target': str(self.static), 'data_dir': str(self.data)}:
                raise PatchError('Static directory belongs to another patch receipt; restore it first')

    def _claim_owner(self):
        self._check_owner()
        self.atomic_write(self.owner_path, json.dumps({'target': str(self.static), 'data_dir': str(self.data)}).encode('utf-8'))
        self.owner_path.chmod(0o600)

    def _release_owner(self):
        self._check_owner()
        if self.owner_path.exists():
            self.owner_path.unlink()

    def _manifest(self):
        raw = (self.payload / 'patch-manifest.json').read_bytes()
        manifest = json.loads(raw)
        if manifest['dashboard_version'] != '1.9.12':
            raise PatchError('Only the verified Dashboard 1.9.12 build is supported')
        for key in ['baseline', 'files']:
            values = manifest[key]
            if not isinstance(values, dict) or 'index.html' not in values:
                raise PatchError('Patch requires a complete index fingerprint')
            for name, expected in values.items():
                relative_path(name)
                if not isinstance(expected, str) or not re.fullmatch('[a-f0-9]{64}', expected):
                    raise PatchError('Invalid file fingerprint')
        for name, expected in manifest['files'].items():
            file = confined(self.payload, name)
            if not file.is_file() or digest(file.read_bytes()) != expected:
                raise PatchError('Payload verification failed: ' + name)
        return manifest, digest(raw)

    def _state(self):
        if not self.state_path.exists():
            return None
        state = json.loads(self.state_path.read_text(encoding='utf-8'))
        if state['target'] != str(self.static):
            raise PatchError('Patch receipt belongs to another static directory')
        return state

    def _verify_owned(self, state):
        for change in state['changes']:
            path = confined(self.static, change['path'])
            if not path.is_file() or digest(path.read_bytes()) != change['after']:
                raise PatchError('Installed file was changed by another owner: ' + change['path'])
            if change['before'] is not None:
                backup = confined(self.data / 'originals', change['path'])
                if not backup.is_file() or digest(backup.read_bytes()) != change['before']:
                    raise PatchError('Original backup verification failed')

    def _restore_changes(self, changes):
        # Restore the original entry first, then remove only assets created by this patch.
        for change in sorted(changes, key=lambda row: row['path'] != 'index.html'):
            target = confined(self.static, change['path'])
            if change['before'] is None:
                if target.exists():
                    target.unlink()
            else:
                self.atomic_write(target, confined(self.data / 'originals', change['path']).read_bytes())
                target.chmod(change['mode'])

    def _verify_recoverable(self, state):
        # Validate the entire transaction before restoring any part of a mixed state.
        for change in state['changes']:
            path = confined(self.static, change['path'])
            if path.exists() and not path.is_file():
                raise PatchError('Recovery found a non-file path: ' + change['path'])
            current = digest(path.read_bytes()) if path.is_file() else None
            if current not in {change['before'], change['after']}:
                raise PatchError('Recovery found a file changed by another owner: ' + change['path'])
            if change['before'] is not None:
                backup = confined(self.data / 'originals', change['path'])
                if not backup.is_file() or digest(backup.read_bytes()) != change['before']:
                    raise PatchError('Original backup verification failed')

    def _recover_locked(self, state):
        self._verify_recoverable(state)
        state['phase'] = 'restoring'
        self._write_state(state)
        self._restore_changes(state['changes'])
        state['phase'] = 'restored'
        self._write_state(state)
        self._release_owner()
        return 'restored'

    def recover(self):
        """Restore a verified receipt; does not require the original payload folder."""
        with self._locked():
            state = self._state()
            if not state or state['phase'] == 'restored':
                self._release_owner()
                return 'not-installed'
            if state['phase'] not in {'installing', 'active', 'restoring'}:
                raise PatchError('Unknown transaction phase')
            return self._recover_locked(state)

    def install(self):
        with self._locked():
            manifest, payload_id = self._manifest()
            state = self._state()
            if state and state['phase'] == 'active':
                self._verify_owned(state)
                if state['payload_id'] != payload_id:
                    raise PatchError('Prototype requires restoring before changing payload versions')
                self._claim_owner()
                return 'already-installed'
            if state and state['phase'] in {'installing', 'restoring'}:
                self._recover_locked(state)
            for name, expected in manifest['baseline'].items():
                path = confined(self.static, name)
                if not path.is_file() or digest(path.read_bytes()) != expected:
                    raise PatchError('Original frontend differs from the verified baseline: ' + name)
            changes = []
            for name, expected in manifest['files'].items():
                target = confined(self.static, name)
                if target.exists():
                    if not target.is_file():
                        raise PatchError('An asset path is not a regular file: ' + name)
                    before_bytes = target.read_bytes()
                    before = digest(before_bytes)
                    if before == expected:
                        continue
                    if manifest['baseline'].get(name) != before:
                        raise PatchError('An asset is owned by another installation: ' + name)
                    backup = confined(self.data / 'originals', name)
                    self.atomic_write(backup, before_bytes)
                    mode = stat.S_IMODE(target.stat().st_mode)
                else:
                    before, mode = None, 0o644
                changes.append({'path': name, 'before': before, 'after': expected, 'mode': mode})
            state = {'phase': 'installing', 'target': str(self.static), 'payload_id': payload_id, 'changes': changes}
            self._claim_owner()
            self._write_state(state)
            try:
                for change in sorted(changes, key=lambda row: row['path'] == 'index.html'):
                    target = confined(self.static, change['path'])
                    self.atomic_write(target, confined(self.payload, change['path']).read_bytes())
                self._verify_owned(state)
                state['phase'] = 'active'
                self._write_state(state)
                return 'installed'
            except Exception as error:
                self._recover_locked(state)
                raise PatchError('Patch transaction failed and was rolled back') from error

    def uninstall(self):
        with self._locked():
            state = self._state()
            if not state or state['phase'] == 'restored':
                self._release_owner()
                return 'not-installed'
            if state['phase'] == 'active':
                self._verify_owned(state)
            elif state['phase'] not in {'installing', 'restoring'}:
                raise PatchError('Unknown transaction phase')
            return self._recover_locked(state)
