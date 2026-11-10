# 安装、更新与卸载

## 安装前

确认 [兼容范围](COMPATIBILITY.md)。宿主运行用户须能写入实际 Dashboard 的 `dist` 目录及其上一级包目录。由实例维护者为该用户配置所需目录权限。

此候选包尚未上架市场。使用项目提供的完整 ZIP，或按 [构建说明](BUILDING.md) 从完整项目打包。ZIP 内须包含 `payload/`，仅有 Python 文件不能显示主题。

## 安装和选择

1. 打开 **插件扩展 → 更多操作 → 从 ZIP 安装插件**，选择安装包。
2. 等待上传和安装完成，按宿主提示重启或启用插件。若显示“尚未加载”，使用宿主提供的重启操作。
3. 刷新已打开的 WebUI 标签页。
4. 进入 **WEBUI设置 → 外观 → 界面风格 → 麦之诗**。

插件列表名称为“麦之诗(界面风格)”，主题选择项名称为“麦之诗”。选择第四主题只保存在当前浏览器；更换浏览器后需重新选择。

## 正常禁用和卸载

在插件扩展中禁用插件，等待卸载钩子完成，再刷新页面。原三个主题恢复。随后可使用宿主卸载插件。

宿主正常关闭也会执行还原，重新启动时启用的插件会再次安装。不要在插件仍加载时直接删除插件目录或私有数据目录。

## 更新

当前验证的是受控的“禁用/还原 → 更换 ZIP → 再加载”更新流程，尚未验证市场一键升级。

1. 禁用旧插件，刷新并确认恢复原三个主题。
2. 在宿主提供的卸载、ZIP 安装入口更换版本，保留旧版本私有备份直到确认还原完成。
3. 重启或启用新插件，刷新页面并重新确认第四主题。

不要在 active 状态直接替换 `payload/`。正式 ID 为 `github.littlesleepy.maizhishi-theme`，旧本地测试 ID 为 `local.maizhishi-theme`；两者使用不同私有备份目录。先禁用并确认还原，再完整卸载本地版本，之后安装正式版本，不迁移或覆盖原备份。

## 异常恢复

未完成的安装或还原会在下次加载时先恢复，再重新安装。若日志报告文件冲突、备份损坏或未知指纹，应停止并保留现场；不要手工改指纹来强行安装。

需要手动恢复时，先停止对应 MaiBot 实例，在仍保留的插件目录执行：

```sh
python -m maizhishi_patch recover --static-root "<实际Dashboard/dist>" --data-dir "<实例data/plugins/github.littlesleepy.maizhishi-theme/frontend-patch>"
```

使用宿主同一 Python 环境定位 Dashboard：

```sh
python -c "from maibot_dashboard import get_dist_path; print(get_dist_path())"
```

`--data-dir` 必须指向原安装产生的、包含 `patch-state.json` 的私有备份目录；实际位置以宿主插件数据目录为准。恢复旧本地测试版时，仍使用旧 ID 对应的 `data/plugins/local.maizhishi-theme/frontend-patch`，不能替换成新 ID 目录。恢复成功并确认页面正常后再处理旧备份。强制退出可能留下 `.maizhishi-*` 临时文件，工具不会删除无法核验的文件。
