# 麦之诗(界面风格)

以《影之诗：超凡世界》的美术风格装点界面，淡金边框搭配青白与夜蓝两套配色。

安装后在 **WEBUI设置 → 外观 → 界面风格** 中选择第四主题 **麦之诗**。保留原三种主题及主页功能，提供深浅配色、立绘进化切换、原版演出与音效、主题导航和顶栏小人交互。主题偏好保存在当前浏览器，原三主题继续使用原后端设置。

当前为 **0.1.2 发布候选**。作者为 [littlesleepy](https://github.com/Littlesleepy)，正式插件 ID 为 `github.littlesleepy.maizhishi-theme`。已创建[公开仓库](https://github.com/Littlesleepy/maizhishi-theme)；尚未发布 Release 或提交插件市场。

曾安装 `local.maizhishi-theme` 测试版本的实例，需要先禁用并完整还原、卸载旧版本，再安装正式 ID 的候选包。新旧插件不能同时启用，不能迁移旧备份冒充新安装。

## 使用

仅支持 **MaiBot 1.3.18 + SDK 2.19.0 + Dashboard 1.9.12**，并核验原版前端文件指纹。运行 MaiBot 的系统用户必须能写入 Dashboard 静态目录及其上一级包目录。

1. 在 **插件扩展 → 更多操作 → 从 ZIP 安装插件** 中选择候选安装包。
2. 按宿主提示重启或启用插件，刷新 WebUI。
3. 在 **WEBUI设置 → 外观 → 界面风格 → 麦之诗** 中启用。

正常禁用或卸载后刷新页面，恢复原三种主题。更换插件版本前先禁用并确认还原完成。完整步骤见 [安装、更新与卸载](docs/INSTALL.md)。

## 项目内容

| 路径 | 内容 |
| --- | --- |
| `plugin.py` | SDK 生命周期入口，通过 Dashboard 公开包函数定位静态目录 |
| `maizhishi_patch/` | 指纹校验、私有备份、共享锁、所有权记录、事务恢复 |
| `payload/` | 可直接安装的预构建前端及校验清单，完整纳入项目 |
| `frontend-source/` | 对应前端源码、素材、锁文件和构建配置 |
| `tools/build_package.py` | 确定性 ZIP 打包器，默认使用项目内源码 |
| `tests/` | 安装、卸载、并发、恢复、生命周期和打包测试 |
| `docs/` | 兼容、操作、构建、发布和资源来源说明 |

在项目根目录，Python 3.12 环境执行：

```sh
python -m tools.build_package --output release/maizhishi-theme-0.1.2-candidate.zip
```

安装预构建包无需 Node.js，也不需要访问本地验收目录。重建前端和验证步骤见 [构建说明](docs/BUILDING.md)。

## 实现与兼容

本插件通过启停生命周期安装、还原固定版本的前端文件；它会写入插件目录外的 Dashboard 包。这是受指纹约束的前端补丁，宿主尚无被本插件采用的通用主题注册接口。不支持只读安装、本地 Dashboard 覆盖模式或未知前端版本。

备份保存在宿主分配的插件私有数据目录中，入口文件最后切换；文件被其他程序更改时拒绝覆盖。兼容范围、已完成验证和已知限制见 [兼容说明](docs/COMPATIBILITY.md)。

## 来源与发布状态

插件代码及 Dashboard 派生前端使用 AGPL-3.0-only，许可证见 [LICENSE](LICENSE)。宿主本身的 GPLv3 声明单独保留。游戏原画、UI、音效和用户上传小人的权利列于 [第三方声明](THIRD_PARTY_NOTICES.md) 与 [资源来源](docs/ASSET_SOURCES.md)，不随代码许可证获得新授权。

正式公开发布还需完成第三方资源分发许可、依赖许可版本核对及市场审核事项。具体清单见 [发布准备](docs/RELEASING.md)。
