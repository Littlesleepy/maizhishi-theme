import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from maizhishi_patch.installer import PatchError, PatchInstaller


def sha(data):
    return hashlib.sha256(data).hexdigest()


def tree(path):
    return {p.relative_to(path).as_posix(): p.read_bytes() for p in path.rglob('*') if p.is_file()}


class InstallerTests(unittest.TestCase):
    def setUp(self):
        test_root = Path(__file__).resolve().parents[1] / '.test-tmp'
        test_root.mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(prefix='case-', dir=str(test_root))
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        assert self.root.resolve().is_relative_to(test_root.resolve())
        self.static = self.root / 'static'
        self.payload = self.root / 'payload'
        self.data = self.root / 'private-state'
        for p in [self.static / 'assets', self.payload / 'assets']:
            p.mkdir(parents=True)
        self.original = {
            'index.html': b'<html>original three themes</html>',
            'assets/original.js': b'original code',
        }
        for name, content in self.original.items():
            (self.static / name).write_bytes(content)
        self.replacement = {
            'index.html': b'<html>four themes <script src="/assets/maizhishi.js"></script></html>',
            'assets/maizhishi.js': b'new theme',
        }
        for name, content in self.replacement.items():
            (self.payload / name).write_bytes(content)
        self.manifest = {'dashboard_version': '1.9.12', 'baseline': {p: sha(b) for p, b in self.original.items()}, 'files': {p: sha(b) for p, b in self.replacement.items()}}
        self.save_manifest()
        self.installer = PatchInstaller(self.static, self.data, self.payload)

    def save_manifest(self):
        (self.payload / 'patch-manifest.json').write_text(json.dumps(self.manifest), encoding='utf-8')

    def test_install_and_restore_all_original_bytes(self):
        self.assertEqual(self.installer.install(), 'installed')
        self.assertEqual((self.static / 'index.html').read_bytes(), self.replacement['index.html'])
        self.assertEqual((self.static / 'assets/original.js').read_bytes(), b'original code')
        self.assertEqual(self.installer.uninstall(), 'restored')
        self.assertEqual(tree(self.static), self.original)

    def test_repeated_install_is_idempotent(self):
        self.installer.install()
        self.assertEqual(self.installer.install(), 'already-installed')
        self.installer.uninstall()
        self.assertEqual(tree(self.static), self.original)

    def test_unknown_original_entry_is_not_overwritten(self):
        (self.static / 'index.html').write_bytes(b'customized installation')
        before = tree(self.static)
        with self.assertRaises(PatchError):
            self.installer.install()
        self.assertEqual(tree(self.static), before)

    def test_new_asset_name_collision_is_not_overwritten(self):
        (self.static / 'assets/maizhishi.js').write_bytes(b'other plugin owns this')
        before = tree(self.static)
        with self.assertRaises(PatchError):
            self.installer.install()
        self.assertEqual(tree(self.static), before)

    def test_changed_installed_file_blocks_destructive_restore(self):
        self.installer.install()
        (self.static / 'index.html').write_bytes(b'updated by another owner')
        before = tree(self.static)
        with self.assertRaises(PatchError):
            self.installer.uninstall()
        self.assertEqual(tree(self.static), before)

    def test_payload_corruption_is_detected_before_target_changes(self):
        (self.payload / 'assets/maizhishi.js').write_bytes(b'corrupt')
        with self.assertRaises(PatchError):
            self.installer.install()
        self.assertEqual(tree(self.static), self.original)

    def test_traversal_manifest_cannot_write_outside_static_root(self):
        self.manifest['files']['../outside'] = sha(b'escape')
        self.save_manifest()
        with self.assertRaises(PatchError):
            self.installer.install()
        self.assertFalse((self.root / 'outside').exists())
        self.assertEqual(tree(self.static), self.original)

    def test_unknown_dashboard_version_is_rejected(self):
        self.manifest['dashboard_version'] = '1.9.13'
        self.save_manifest()
        with self.assertRaises(PatchError):
            self.installer.install()
        self.assertEqual(tree(self.static), self.original)

    def test_state_cannot_be_stored_in_public_static_directory(self):
        with self.assertRaises(PatchError):
            PatchInstaller(self.static, self.static / 'backup', self.payload).install()
        self.assertEqual(tree(self.static), self.original)

    def test_write_failure_rolls_back_installed_assets_and_entry(self):
        original_write = self.installer.atomic_write
        once = False

        def fail_entry(path, data):
            nonlocal once
            if path == self.static / 'index.html' and not once:
                once = True
                raise PermissionError('simulated filesystem write failure')
            return original_write(path, data)

        with patch.object(self.installer, 'atomic_write', side_effect=fail_entry):
            with self.assertRaises(PatchError):
                self.installer.install()
        self.assertEqual(tree(self.static), self.original)

    def test_shared_identical_asset_survives_uninstall(self):
        self.manifest['files']['assets/original.js'] = sha(b'original code')
        (self.payload / 'assets/original.js').write_bytes(b'original code')
        self.save_manifest()
        self.installer.install()
        self.installer.uninstall()
        self.assertEqual(tree(self.static), self.original)

    def test_reinstall_after_restore_works(self):
        self.installer.install()
        self.installer.uninstall()
        self.assertEqual(self.installer.install(), 'installed')
        self.installer.uninstall()
        self.assertEqual(tree(self.static), self.original)


if __name__ == '__main__':
    unittest.main()
