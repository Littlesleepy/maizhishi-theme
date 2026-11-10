from pathlib import Path
from unittest.mock import patch
import subprocess
import sys
import unittest

import test_installer as fixtures
from test_installer import sha, tree
from maizhishi_patch.installer import PatchError, PatchInstaller


class RecoveryTests(unittest.TestCase):
    setUp = fixtures.InstallerTests.setUp
    save_manifest = fixtures.InstallerTests.save_manifest
    def interrupt_install(self):
        write = self.installer.atomic_write

        def interrupt(path, data):
            if path == self.static / 'index.html':
                raise SystemExit('simulated power loss before entry switch')
            write(path, data)

        with patch.object(self.installer, 'atomic_write', side_effect=interrupt):
            with self.assertRaises(SystemExit):
                self.installer.install()

    def test_recover_interrupted_install_restores_originals(self):
        self.interrupt_install()
        self.assertEqual(self.installer.recover(), 'restored')
        self.assertEqual(tree(self.static), self.original)
        self.assertEqual(self.installer.install(), 'installed')

    def test_foreign_file_blocks_recovery_without_partial_changes(self):
        self.interrupt_install()
        (self.static / 'assets/maizhishi.js').write_bytes(b'other owner')
        before = tree(self.static)
        with self.assertRaises(PatchError):
            self.installer.recover()
        self.assertEqual(tree(self.static), before)

    def test_corrupt_backup_blocks_recovery_without_changes(self):
        self.interrupt_install()
        (self.data / 'originals/index.html').write_bytes(b'corrupt')
        before = tree(self.static)
        with self.assertRaises(PatchError):
            self.installer.recover()
        self.assertEqual(tree(self.static), before)

    def test_recovery_can_resume_after_original_entry_was_restored(self):
        self.installer.install()
        write = self.installer.atomic_write

        def interrupt(path, data):
            write(path, data)
            if path == self.static / 'index.html':
                raise SystemExit('power loss during restore')

        with patch.object(self.installer, 'atomic_write', side_effect=interrupt):
            with self.assertRaises(SystemExit):
                self.installer.uninstall()
        self.assertEqual(self.installer.recover(), 'restored')
        self.assertEqual(tree(self.static), self.original)

    def test_crashed_process_does_not_leave_a_permanent_lock(self):
        script = 'from maizhishi_patch.installer import PatchInstaller; import os,sys\np=PatchInstaller(*sys.argv[1:])\nwith p._locked(): os._exit(17)'
        result = subprocess.run([sys.executable, '-c', script, str(self.static), str(self.data), str(self.payload)], timeout=15)
        self.assertEqual(result.returncode, 17)
        self.assertEqual(self.installer.install(), 'installed')

    def test_another_active_process_keeps_exclusive_lock(self):
        script = 'from maizhishi_patch.installer import PatchInstaller; import sys\np=PatchInstaller(*sys.argv[1:])\nwith p._locked():\n print("locked",flush=True)\n sys.stdin.readline()'
        child = subprocess.Popen([sys.executable, '-c', script, str(self.static), str(self.data), str(self.payload)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        try:
            self.assertEqual(child.stdout.readline().strip(), 'locked')
            with self.assertRaises(PatchError):
                self.installer.install()
        finally:
            child.communicate('\n', timeout=15)
        self.assertEqual(self.installer.install(), 'installed')

    def test_shared_static_root_is_locked_across_data_directories(self):
        other = PatchInstaller(self.static, self.root / 'other-private', self.payload)
        with self.installer._locked():
            with self.assertRaises(PatchError):
                other.install()
        self.installer.install()
        with self.assertRaises(PatchError):
            other.install()

    def test_interrupted_owner_blocks_install_from_another_data_directory(self):
        self.interrupt_install()
        other = PatchInstaller(self.static, self.root / 'other-private', self.payload)
        before = tree(self.static)
        with self.assertRaises(PatchError):
            other.install()
        self.assertEqual(tree(self.static), before)
        self.installer.recover()
        self.assertEqual(other.install(), 'installed')

    def test_new_payload_after_clean_unload_can_be_installed(self):
        self.installer.install()
        self.installer.uninstall()
        replacement = b'<html>updated theme</html>'
        (self.payload / 'index.html').write_bytes(replacement)
        self.manifest['files']['index.html'] = sha(replacement)
        self.save_manifest()
        self.installer.install()
        self.assertEqual((self.static / 'index.html').read_bytes(), replacement)
        self.installer.uninstall()
        self.assertEqual(tree(self.static), self.original)
