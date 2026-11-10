from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo
import argparse
import hashlib
import json
import os
import tempfile

REPO = Path(__file__).resolve().parents[1]
ROOT_FILES = ('.gitignore', '_manifest.json', 'icon.png', 'plugin.py', 'requirements.txt', 'LICENSE', 'README.md', 'THIRD_PARTY_NOTICES.md')
EXCLUDED = {'.git', 'node_modules', 'dist', '.vite', '__pycache__', '.venv', 'config.toml', 'patch-state.json'}
SOURCE_ROOT_FILES = {'package.json', 'package-lock.json', 'bun.lock', 'bun.lockb', 'pnpm-lock.yaml',
                     'index.html', 'vite.config.ts', 'vitest.config.ts', 'eslint.config.js',
                     'electron.vite.config.ts', 'components.json', 'README.md', 'LICENSE',
                     'app-version.ts', 'tailwind.config.js', 'bunfig.toml', 'pnpm-workspace.yaml',
                     'source-manifest.json'}
SOURCE_DIRECTORIES = {'src', 'public', 'scripts', 'electron'}
REQUIRED_SOURCE_FILES = {'package.json', 'package-lock.json', 'index.html', 'vite.config.ts',
                         'app-version.ts', 'tsconfig.json', 'tsconfig.app.json',
                         'tsconfig.node.json', 'src/main.tsx'}


def source_file_allowed(relative):
    if any(part in EXCLUDED or part.startswith('.') for part in relative.parts):
        return False
    if relative.suffix.lower() in {'.pem', '.key', '.pfx', '.p12', '.env'}:
        return False
    if len(relative.parts) == 1:
        return relative.name in SOURCE_ROOT_FILES or (relative.name.startswith('tsconfig') and relative.suffix == '.json')
    return relative.parts[0] in SOURCE_DIRECTORIES


def build_archive(output: Path, frontend_source: Path | None = None) -> dict:
    """Use an allowlist so instance settings/backups never enter the distributable."""
    frontend_source = frontend_source if frontend_source is not None else REPO / 'frontend-source'
    missing = sorted(name for name in REQUIRED_SOURCE_FILES if not (frontend_source / name).is_file())
    if missing:
        raise ValueError('Missing frontend build inputs: ' + ', '.join(missing))
    files = {name: REPO / name for name in ROOT_FILES}
    for name in ('CHANGELOG.md', '.gitattributes'):
        if (REPO / name).is_file():
            files[name] = REPO / name
    for directory in ('maizhishi_patch', 'tools', 'tests', 'docs'):
        for path in sorted((REPO / directory).rglob('*')):
            relative = path.relative_to(REPO)
            suffixes = {'.md', '.json', '.txt'} if directory == 'docs' else {'.py'}
            if path.suffix.lower() not in suffixes:
                continue
            if path.is_file() and not any(part in EXCLUDED for part in relative.parts):
                if path.is_symlink() or not path.resolve().is_relative_to((REPO / directory).resolve()):
                    raise ValueError('Source path escapes its root')
                files[relative.as_posix()] = path
    for path in sorted(frontend_source.rglob('*')):
        relative = path.relative_to(frontend_source)
        if path.is_file() and source_file_allowed(relative):
            if path.is_symlink() or not path.resolve().is_relative_to(frontend_source.resolve()):
                raise ValueError('Frontend source path escapes its root')
            files['frontend-source/' + relative.as_posix()] = path
    source_manifest = frontend_source / 'source-manifest.json'
    expected_source = json.loads(source_manifest.read_text('utf-8'))['files']
    actual_source = {name.removeprefix('frontend-source/'): path for name, path in files.items()
                     if name.startswith('frontend-source/') and name != 'frontend-source/source-manifest.json'}
    if not isinstance(expected_source, dict) or not expected_source:
        raise ValueError('Frontend source inventory must contain files')
    if set(actual_source) != set(expected_source):
        raise ValueError('Frontend source inventory mismatch; missing: ' +
                         ', '.join(sorted(set(expected_source) - set(actual_source))) + '; unexpected: ' +
                         ', '.join(sorted(set(actual_source) - set(expected_source))))
    for name, path in actual_source.items():
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected_source[name]:
            raise ValueError('Frontend source checksum mismatch: ' + name)
    manifest = json.loads((REPO / 'payload/patch-manifest.json').read_text('utf-8'))
    files['payload/patch-manifest.json'] = REPO / 'payload/patch-manifest.json'
    for name, expected in manifest['files'].items():
        path = REPO / 'payload' / name
        if path.is_symlink() or not path.resolve().is_relative_to((REPO / 'payload').resolve()):
            raise ValueError('Payload path escapes its root')
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError('Payload checksum mismatch: ' + name)
        files['payload/' + name] = path
    output = output.resolve()
    if output.is_relative_to(REPO / 'payload') or output.is_relative_to(frontend_source.resolve()):
        raise ValueError('Output must be outside input trees')
    if any(output == path.resolve() for path in files.values()):
        raise ValueError('Output would overwrite an input file')
    contents = {}
    for name, path in files.items():
        if path.is_symlink() or not path.resolve().is_relative_to(REPO.resolve() if not name.startswith('frontend-source/') else frontend_source.resolve()):
            raise ValueError('Input path escapes its root: ' + name)
        contents[name] = path.read_bytes()
    output.parent.mkdir(parents=True, exist_ok=True)
    descriptor, name = tempfile.mkstemp(prefix='.' + output.name + '-', suffix='.tmp', dir=output.parent)
    os.close(descriptor)
    staged = Path(name)
    try:
        with ZipFile(staged, 'w', compression=ZIP_DEFLATED, compresslevel=6) as archive:
            for name, data in sorted(contents.items()):
                info = ZipInfo(name, date_time=(2026, 11, 10, 0, 0, 0))
                info.compress_type = ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                archive.writestr(info, data)
        os.replace(staged, output)
    finally:
        staged.unlink(missing_ok=True)
    return {'file': str(output), 'files': len(files), 'bytes': output.stat().st_size,
            'sha256': hashlib.sha256(output.read_bytes()).hexdigest()}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Build plugin ZIP with the embedded matching frontend source')
    parser.add_argument('--frontend-source', type=Path, help='Optional source override; default: project/frontend-source')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(build_archive(args.output, args.frontend_source), indent=2))
