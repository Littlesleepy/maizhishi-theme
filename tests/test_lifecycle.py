from pathlib import Path
from tempfile import TemporaryDirectory
import asyncio
import importlib.util
import json
import sys
import unittest

from maibot_sdk import MaiBotPlugin, PluginContext, PluginPaths
from maizhishi_patch.installer import digest


class LifecycleTests(unittest.TestCase):
    def test_sdk_load_and_unload_restore_the_target(self):
        repo = Path(__file__).resolve().parents[1]
        spec = importlib.util.spec_from_file_location('maizhishi_test_plugin', repo / 'plugin.py', submodule_search_locations=[str(repo)])
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        test_root = repo / '.test-tmp'
        test_root.mkdir(exist_ok=True)
        with TemporaryDirectory(dir=test_root) as directory:
            root = Path(directory)
            static, payload = root / 'static', root / 'payload'
            static.mkdir()
            payload.mkdir()
            (static / 'index.html').write_bytes(b'original')
            (payload / 'index.html').write_bytes(b'patched')
            (payload / 'patch-manifest.json').write_text(json.dumps({
                'dashboard_version': '1.9.12',
                'baseline': {'index.html': digest(b'original')},
                'files': {'index.html': digest(b'patched')},
            }), 'utf-8')
            plugin = module.MaizhishiTheme(static_root=static, payload_dir=payload)
            self.assertIsInstance(plugin, MaiBotPlugin)
            for hook in ('on_load', 'on_unload', 'on_config_update'):
                self.assertIsNot(getattr(type(plugin), hook), getattr(MaiBotPlugin, hook))
            plugin._set_context(PluginContext('local.maizhishi', paths=PluginPaths(root / 'private', root / 'runtime')))
            asyncio.run(plugin.on_load())
            self.assertEqual((static / 'index.html').read_bytes(), b'patched')
            asyncio.run(plugin.on_config_update('self', {}, '1'))
            asyncio.run(plugin.on_load())
            asyncio.run(plugin.on_unload())
            self.assertEqual((static / 'index.html').read_bytes(), b'original')


if __name__ == '__main__':
    unittest.main()
