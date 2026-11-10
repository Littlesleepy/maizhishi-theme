# 公开发布准备

当前版本：0.1.4，按预发布流程发行。完整项目已上传到公开 GitHub 仓库，包含预构建前端与对应源码。发行状态以 [GitHub Releases](https://github.com/Littlesleepy/maizhishi-theme/releases) 为准；尚未申请插件市场收录。

## 发布前需要补齐

| 项目 | 当前状态与处理 |
| --- | --- |
| 产品名称与介绍 | 已确定：麦之诗(界面风格)，介绍见 manifest |
| 发布作者 | 已确定：`littlesleepy`，主页 `https://github.com/Littlesleepy`；公开 API 核对账号存在 |
| 插件 ID | 已确定：`github.littlesleepy.maizhishi-theme`，后续发布保持稳定 |
| 公开仓库 | 已完成首次公开上传：`https://github.com/Littlesleepy/maizhishi-theme`，默认分支 main |
| 第三方美术和音效 | 已记录来源与哈希；公开再分发许可尚未确立，见 ASSET_SOURCES.md |
| 第三方代码和字体 | 附锁文件、许可证声明及来源清单；缺失或未逐字核对项需发布前核对 |
| 市场审核 | 未提交；须披露修改插件目录外前端文件、所需权限、固定指纹兼容及恢复机制 |
| 市场自动升级 | 未验证；当前文档仅承诺已验收的受控禁用/还原后更换 ZIP 流程 |

从本地测试 ID `local.maizhishi-theme` 改为正式 ID `github.littlesleepy.maizhishi-theme` 时，必须先还原、卸载旧插件，再安装新 ID。新旧 ID 不应同时加载，也不要把旧备份复制到新 ID 下冒充新安装记录。

## 仓库与发布文件

仓库根目录应包含 `_manifest.json`、`plugin.py`、`LICENSE`、`README.md`、`requirements.txt`、`maizhishi_patch/`、`payload/`、`frontend-source/`、`tools/`、`tests/`、`docs/`。必须提交 `payload/` 和对应源码，不能只上传安装器。

不要上传 `.venv/`、`node_modules/`、`dist/`、真实 `config.toml`、私有备份、测试宿主、账号数据或验收日志。候选 ZIP 已按白名单打包；发布 Git 仓库时仍需检查暂存文件清单，`.gitignore` 只在插件独立仓库生效。保留 `.gitattributes` 的字节保真规则，避免 Git 自动转换换行后使完整性指纹失效。

发布前从干净项目副本运行打包、完整测试和前端构建，校验解包可安装。manifest 版本、Tag 与 Release 应一致，保留固定提交与 ZIP 哈希，避免覆盖已经收录的版本。

## 市场流程依据

截至 2026-11-10 核对的[官方贡献指南](https://github.com/Mai-with-u/plugin-repo/blob/main/CONTRIBUTING.md)要求公开 GitHub 仓库及至少一个已发布 Release，支持预发布但不接受仅有草稿或 Tag；随后通过仓库的添加插件 Issue 流程提交。未来提交时应重新核对最新规则。

0.1.4 的发行说明见 [RELEASE_0.1.4.md](RELEASE_0.1.4.md)。市场申请为独立步骤；公开上传的用户授权不被记录为第三方权利人授予的素材许可。
