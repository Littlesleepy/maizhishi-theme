# 构建与校验

## 使用已构建前端打包

完整项目包含 `payload/` 和 `frontend-source/`。Python 3.12 在插件项目根目录执行：

```sh
python -m tools.build_package --output release/maizhishi-theme-0.1.2-candidate.zip
```

打包器仅使用标准库。默认收集项目内源码、已通过 SHA256 校验的载荷、插件代码、测试、许可证与文档；不收集虚拟环境、node_modules、构建输出、实例配置或备份。对应源码逐文件由 `frontend-source/source-manifest.json` 核验完整性。缺文件、来源清单不符或载荷损坏时停止，成功后才原子替换输出。相同输入产生逐字节相同的 ZIP。`--frontend-source <目录>` 仅供维护者明确覆盖包含来源清单的对应源码，普通打包不需要此参数。

输出路径应放在 `release/` 或项目外，避免写入源码/载荷输入目录。安装本包不需要构建 Node 前端。通过 Git 下载时保留根 `.gitattributes`：预构建载荷和对应源码均按原始字节校验，不应由 Git 自动改写换行。

## 重建前端

使用 Node.js 22.12 或更新的受支持版本及 npm，进入 `frontend-source/`：

```sh
npm ci
npm run build
```

以 `package-lock.json` 为 npm 的依赖锁。项目同时保留原始其他包管理器锁文件，避免改写来源；不要混合安装多份依赖后声称与锁文件完全一致。开发服务配置端口为 7999。

源码保留了与已验收前端相同的构建输入，包括 `app-version.ts`、TS/Vite 配置、public 素材与原始 Electron 配置。插件安装只使用浏览器 `dist`，不需要 Electron 产物。

运行 `npm run build` 只会生成 `frontend-source/dist/`，不会自动更换 `payload/`。维护者若要更换载荷，须先在独立目标验证新构建，更新载荷文件及 patch-manifest 的对应 SHA256，再重新进行安装、禁用、还原和冲突测试。不要改变官方 `baseline` 以绕过不兼容。

审核修改后的源码时，维护者还需显式更新 source-manifest.json 的路径与 SHA256；不要用它绕过意外缺文件。它不包含自身哈希，内容对应本次经核验的完整源码。构建所用工具、平台和依赖可能影响输出命名；“确定性 ZIP”指同一组已构建输入的打包，不保证任意环境重新编译都得到相同前端字节。

## Python 测试

```sh
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
```

Windows 创建临时目录并运行：

```powershell
New-Item -ItemType Directory -Force .test-tmp | Out-Null
./.venv/Scripts/python.exe -m unittest discover -s tests -v
```

Linux/macOS 使用 `.venv/bin/python`，先执行 `mkdir -p .test-tmp`。测试使用独立临时文件，不连接实际聊天平台或模型。
