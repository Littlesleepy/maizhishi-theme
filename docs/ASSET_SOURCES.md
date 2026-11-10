# 素材来源

主题资源保留在 `payload/themes/orchis/`，对应源码资源位于 `frontend-source/public/themes/orchis/`。逐文件清单见 [asset-inventory.json](asset-inventory.json)，包含相对路径、大小、SHA256、来源分类和现有导出记录索引。

## 原画与小人

- 插件根目录 `icon.png`：用户指定 `15169e9a-0557-4461-8929-d22da502fba3.png` 作为插件图标，并要求四角透明；保留米白色底板与角色，仅移除外侧四角黑色区域，再等比缩小为 256×256 PNG。原始与输出文件指纹见 [plugin-icon-source.json](plugin-icon-source.json)。用户指定用途不被扩写为额外第三方许可声明。

- `orchis-day.jpg`、`orchis-original.jpg` 及 native 中的 `orchis-day.jpg` / `orchis-night.jpg`：来自用户提供的奥契丝进化前、进化后官方卡牌原画。原上传文件为 `151761610_p3_master1200.jpg`、`151761610_p4_master1200.jpg`，画面带 Cygames 署名；不据此推定再分发授权。
- `native/assets/orchis-chibi.png`：用户上传的 `9a593fda446f6fb6192ec1d7d0dff961.png`。作者及公开分发许可尚未核实，清单单独标记。

## 游戏资源

游戏 UI、边框、图标、背景和效果纹理由本地“MuMu模拟器x影之诗高清版”的美术资源文件导出，来源包括直接安装文件、Unity Bundle 及早期已导出的本地素材目录；无需运行模拟器。保留现有原图、透明留白处理、裁切和分段拉伸信息。

现有记录位于主题 `native/assets/`：

| 记录 | 内容 |
| --- | --- |
| `provenance.json` | 初始背景、框体、图标、原画及导出参数 |
| `hd-provenance.json` | 高清框体、切片、控件、选定主题图标及来源纹理 |
| `refinement-provenance.json` | 后续补充的控件和装饰 |
| `evolution-provenance.json` | 卡牌进化效果、原纹理和处理方式 |
| `audio-provenance.json` | `se_sys_mypage_evolve` 提示音，原 cue 解码为 PCM WAV |
| `menu/provenance.json` | 菜单图标来源及 SHA256 |

进化提示音 `native/assets/audio/card-preview-evolve.wav` 源自本地原版音频资源；前端播放音量为 10%。原 cue、样本数、采样率、解码器及源资源哈希见音效记录。

这些记录含素材资源路径及哈希，用于追溯，不含账号配置或登录凭据。旧导出记录的 SHA 可能指裁切前源纹理；逐文件实际字节以本轮 inventory 和 patch-manifest 为准。无直接 SHA 匹配的条目明确标记待人工追溯，不伪造来源精度。

## 字体与依赖

原版前端的字体与 JS 库独立列于 THIRD_PARTY_NOTICES.md、dependency-licenses.json 和 licenses/。字体上游声明分别为 [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono/blob/master/OFL.txt)、[Jersey 20](https://github.com/google/fonts/blob/main/ofl/jersey20/OFL.txt)、[Departure Mono](https://github.com/rektdeckard/departure-mono/blob/main/public/assets/LICENSE)、[Ark Pixel](https://github.com/TakWolf/ark-pixel-font/blob/master/LICENSE-OFL)。补充上游声明不等于已验证继承字体文件的所有具体版本和修改情况。

## 公开分发待办

游戏原画、UI、音效，以及作者未知的小人图片的公开再分发许可尚未确立。公开发布前需要取得适用许可或换为可分发资源，并同步修改源码、载荷、资源清单后重新验收。当前 AGPL 代码许可不覆盖这些素材，也不意味着游戏官方对插件背书。
