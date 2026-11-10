# 第三方来源与许可范围

## 插件和派生前端代码

插件代码及 Dashboard 派生前端按 AGPL-3.0-only 提供，根目录 LICENSE 与 frontend-source/LICENSE 保留 Dashboard 源码附带的 AGPLv3 原文。宿主 [Mai-with-u/MaiBot](https://github.com/Mai-with-u/MaiBot) 基线提交为 `2a9af62cec37035d29237acbe2cf3adceb700b27`，MaiBot 1.3.18 / Dashboard 1.9.12；宿主自身附带的 GPLv3 文本另外保留于 docs/licenses/MaiBot-GPL-3.0.txt，不把它与前端的许可证混同。

本项目修改了主题、主页和相关交互，并通过 `theme-provider.tsx` 将第四风格限制为当前浏览器保存，避免写入原后端不支持的编号。完整对应源码及构建配置附于 frontend-source/，构建方法见 docs/BUILDING.md。原作者声明及各依赖许可证保留其各自效力。

## 游戏美术、角色与音效

《影之诗》《影之诗：超凡世界》及奥契丝、洛伊德原画、游戏框体、图标、场景、进化纹理和音效的相关权利归 Cygames 等原权利人。部分资源来自用户提供图片，部分通过本地“MuMu模拟器x影之诗高清版”资源文件导出；来源记录不构成分发授权。

用户上传的小人图片未附可核验作者和许可，单独标记为待确认。本项目代码许可证不为任何这些第三方素材授予新许可。本地使用的指令不被视为公开上传或插件市场再分发许可的证明。

逐文件相对路径、SHA256、来源记录索引和待确认项见 [资源说明](docs/ASSET_SOURCES.md) 与 docs/asset-inventory.json。

## 字体与 JavaScript 依赖

继承前端的 JetBrains Mono、Jersey 20、Departure Mono、Ark Pixel 字体独立按其上游字体许可处理，声明及原文收集于 docs/licenses/。KaTeX 字体与相关说明随依赖声明收录。

JavaScript 依赖版本与完整性以 frontend-source/package-lock.json 为依据。原构建环境中的声明收录于 docs/licenses/NPM_LICENSES.txt，补充的上游原文、README 许可段及 vendor 声明保存在 docs/licenses/ 的独立文件；版本、源 URL、文件哈希和待核对项见 docs/dependency-licenses.json。403 个非开发依赖中，401 项已收集对应安装包或版本上游声明；html-parse-stringify 和 react-remove-scroll-bar 已补入当前上游 MIT 原文，但其指定旧版本的适用性仍待核对。发布前还须核对继承字体具体版本。该来源清单不把第三方许可证统一改为 AGPL。

## 发布状态

候选包未上架市场。发布者已确认 GitHub 账号 Littlesleepy，插件 ID 为 github.littlesleepy.maizhishi-theme，公开仓库 maizhishi-theme 已创建；游戏资源及上传小人的公开分发许可尚未确立，相关待办见 docs/RELEASING.md。
