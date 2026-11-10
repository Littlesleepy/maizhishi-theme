from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
import hashlib
import json
import shutil
import unittest
import zipfile


BUILD_INPUTS = {
    'package.json': '{"name":"source-fixture","scripts":{"build":"tsc -b && vite build"}}',
    'package-lock.json': '{}',
    'index.html': '<div id="root"></div>',
    'app-version.ts': 'export const dashboardVersionDefine = {}',
    'vite.config.ts': 'import { dashboardVersionDefine } from "./app-version"',
    'tsconfig.json': '{}',
    'tsconfig.app.json': '{}',
    'tsconfig.node.json': '{}',
    'src/main.tsx': 'console.log("fixture")',
}


def write_build_inputs(source):
    for name, content in BUILD_INPUTS.items():
        target = source / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, 'utf-8')
    manifest = {name: hashlib.sha256((source / name).read_bytes()).hexdigest() for name in BUILD_INPUTS}
    (source / 'source-manifest.json').write_text(json.dumps({'files': manifest}), 'utf-8')


def make_project(root):
    """A real small project copy, with no environment or external source dependency."""
    repo = Path(__file__).resolve().parents[1]
    for name in ('.gitignore', '_manifest.json', 'icon.png', 'plugin.py', 'requirements.txt', 'LICENSE', 'README.md', 'THIRD_PARTY_NOTICES.md'):
        shutil.copyfile(repo / name, root / name)
    (root / 'tools').mkdir()
    shutil.copyfile(repo / 'tools/build_package.py', root / 'tools/build_package.py')
    write_build_inputs(root / 'frontend-source')
    (root / 'payload').mkdir()
    (root / 'payload/index.html').write_bytes(b'<html>fixture</html>')
    (root / 'payload/patch-manifest.json').write_text(json.dumps({
        'files': {'index.html': '3ec85d118c49f07362673b7837c60410d3f39e6fa73414a7c6fcd58094f87eb4'}
    }), 'utf-8')


class PackageTests(unittest.TestCase):
    def test_archive_contains_payload_and_source_without_private_state(self):
        from tools.build_package import build_archive
        repo = Path(__file__).resolve().parents[1]
        with TemporaryDirectory(dir=repo / '.test-tmp') as directory:
            root = Path(directory)
            source = root / 'frontend'
            write_build_inputs(source)
            (source / '.env.local').write_text('TEST_TOKEN=must-not-ship', 'utf-8')
            (source / 'private.pem').write_text('must-not-ship', 'utf-8')
            first = root / 'first.zip'
            second = root / 'second.zip'
            build_archive(first, source)
            build_archive(second, source)
            self.assertEqual(first.read_bytes(), second.read_bytes())
            with zipfile.ZipFile(first) as archive:
                names = archive.namelist()
                manifest = json.loads(archive.read('_manifest.json'))
                self.assertEqual(manifest['host_application'], {'min_version': '1.3.18', 'max_version': '1.3.18'})
                self.assertEqual(manifest['sdk'], {'min_version': '2.19.0', 'max_version': '2.19.0'})
                self.assertIn('frontend-source/package.json', names)
                self.assertNotIn('frontend-source/.env.local', names)
                self.assertNotIn('frontend-source/private.pem', names)
                self.assertIn('maizhishi_patch/__main__.py', names)
                self.assertFalse(any(part in name.split('/') for name in names
                                     for part in ('.venv', 'node_modules', '__pycache__', 'config.toml', 'patch-state.json')))
                payload = json.loads(archive.read('payload/patch-manifest.json'))
                for name, expected in payload['files'].items():
                    self.assertEqual(hashlib.sha256(archive.read('payload/' + name)).hexdigest(), expected)

    def test_default_archive_can_be_repacked_without_external_checkout(self):
        from tools import build_package
        repo = Path(__file__).resolve().parents[1]
        with TemporaryDirectory(dir=repo / '.test-tmp') as directory:
            root = Path(directory)
            project = root / 'project'
            project.mkdir()
            make_project(project)
            first = root / 'first.zip'
            with patch.object(build_package, 'REPO', project):
                build_package.build_archive(first)
            unpacked = root / 'unpacked'
            with zipfile.ZipFile(first) as archive:
                self.assertEqual(archive.read('frontend-source/app-version.ts'), b'export const dashboardVersionDefine = {}')
                self.assertEqual(archive.read('frontend-source/src/main.tsx'), b'console.log("fixture")')
                archive.extractall(unpacked)
            second = root / 'second.zip'
            with patch.object(build_package, 'REPO', unpacked):
                build_package.build_archive(second)
            self.assertEqual(first.read_bytes(), second.read_bytes())

    def test_missing_build_input_does_not_create_archive(self):
        from tools import build_package
        repo = Path(__file__).resolve().parents[1]
        with TemporaryDirectory(dir=repo / '.test-tmp') as directory:
            root = Path(directory)
            make_project(root)
            source = root / 'frontend-source'
            (source / 'app-version.ts').unlink()
            output = root / 'invalid.zip'
            with patch.object(build_package, 'REPO', root):
                with self.assertRaisesRegex(ValueError, 'app-version.ts'):
                    build_package.build_archive(output, source)
            self.assertFalse(output.exists())

    def test_missing_transitive_source_does_not_create_archive(self):
        from tools import build_package
        repo = Path(__file__).resolve().parents[1]
        with TemporaryDirectory(dir=repo / '.test-tmp') as directory:
            root = Path(directory)
            make_project(root)
            source = root / 'frontend-source'
            (source / 'src/router.tsx').write_text('export const router = {}', 'utf-8')
            files = {name: hashlib.sha256((source / name).read_bytes()).hexdigest()
                     for name in (*BUILD_INPUTS, 'src/router.tsx')}
            (source / 'source-manifest.json').write_text(json.dumps({'files': files}), 'utf-8')
            (source / 'src/router.tsx').unlink()
            output = root / 'invalid.zip'
            with patch.object(build_package, 'REPO', root):
                with self.assertRaisesRegex(ValueError, 'src/router.tsx'):
                    build_package.build_archive(output, source)
            self.assertFalse(output.exists())

    def test_missing_plugin_license_preserves_existing_output(self):
        from tools import build_package
        repo = Path(__file__).resolve().parents[1]
        with TemporaryDirectory(dir=repo / '.test-tmp') as directory:
            root = Path(directory)
            make_project(root)
            (root / 'LICENSE').unlink()
            output = root / 'previous.zip'
            output.write_bytes(b'previous-release')
            with patch.object(build_package, 'REPO', root):
                with self.assertRaises(FileNotFoundError):
                    build_package.build_archive(output, root / 'frontend-source')
            self.assertEqual(output.read_bytes(), b'previous-release')

    def test_output_cannot_overwrite_project_source(self):
        from tools import build_package
        repo = Path(__file__).resolve().parents[1]
        with TemporaryDirectory(dir=repo / '.test-tmp') as directory:
            root = Path(directory)
            make_project(root)
            output = root / 'plugin.py'
            original = output.read_bytes()
            with patch.object(build_package, 'REPO', root):
                with self.assertRaisesRegex(ValueError, 'overwrite'):
                    build_package.build_archive(output, root / 'frontend-source')
            self.assertEqual(output.read_bytes(), original)

    def test_corrupt_payload_does_not_create_archive(self):
        from tools import build_package
        repo = Path(__file__).resolve().parents[1]
        with TemporaryDirectory(dir=repo / '.test-tmp') as directory:
            root = Path(directory)
            make_project(root)
            (root / 'payload/index.html').write_bytes(b'tampered')
            output = root / 'invalid.zip'
            with patch.object(build_package, 'REPO', root):
                with self.assertRaisesRegex(ValueError, 'index.html'):
                    build_package.build_archive(output, root / 'frontend-source')
            self.assertFalse(output.exists())
