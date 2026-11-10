from pathlib import Path
import asyncio
import os

from maibot_sdk import MaiBotPlugin

from .maizhishi_patch.installer import PatchError, PatchInstaller


def discover_static_root() -> Path:
    # Match the package-backed route only; never guess a host project directory.
    if os.environ.get('MAIBOT_WEBUI_USE_LOCAL_DASHBOARD', '').strip().lower() in {'1', 'true', 'yes', 'on'}:
        raise PatchError('Local-dashboard override is not supported by this plugin')
    from maibot_dashboard import get_dist_path
    return Path(get_dist_path()).resolve()


class MaizhishiTheme(MaiBotPlugin):
    """Install the fixed-version MaiBot Dashboard theme through plugin lifecycle hooks."""

    def __init__(self, *, static_root=None, payload_dir=None):
        super().__init__()
        self._static_root = static_root
        self._payload_dir = Path(payload_dir) if payload_dir else Path(__file__).parent / 'payload'
        self._installer = None

    async def on_load(self) -> None:
        static = self._static_root if self._static_root is not None else await asyncio.to_thread(discover_static_root)
        installer = PatchInstaller(static, self.ctx.paths.data_dir / 'frontend-patch', self._payload_dir)
        result = await asyncio.to_thread(installer.install)
        self._installer = installer
        self.ctx.logger.info('麦之诗前端补丁：%s；请刷新 WebUI。', result)

    async def on_unload(self) -> None:
        if self._installer is not None:
            result = await asyncio.to_thread(self._installer.uninstall)
            self.ctx.logger.info('麦之诗前端恢复：%s；请刷新 WebUI。', result)

    async def on_config_update(self, scope: str, config_data: dict, version: str) -> None:
        # This fixed-payload plugin has no mutable configuration or subscriptions.
        return None


def create_plugin():
    return MaizhishiTheme()
