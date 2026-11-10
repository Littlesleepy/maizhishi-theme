# 依赖许可记录

前端以 package-lock.json 锁定依赖。清单仅覆盖其中 403 个非 dev / 非 devOptional 条目，不能据此声称所有构建工具或最终 bundle 均已完成法律审计。

- 381 项安装包根目录有原始许可声明，383 份原文合并保留于 licenses/NPM_LICENSES.txt。
- 18 项包通过精确 npm 发布版本所指向的源码或版本标签补齐了仓库许可原文；同仓库许可文件可覆盖多个条目。记录保留 revision、源 URL 和 blob/SHA256。
- mime-match 和 wildcard 的完整声明实际位于安装包 README 的 License(s) 段，已收录该原始段落。
- victory-vendor 另有 13 份嵌套的第三方声明，已逐份保留。
- html-parse-stringify 3.0.1 与 react-remove-scroll-bar 2.3.8 的精确 npm 发行包已按锁文件的 SHA512 integrity 核对，包内 package.json 均声明 MIT；发行包内没有独立完整许可原文，发布 gitHead 或标签也没有可直接对应的完整原文。已收录当前上游仓库原文并记录 blob 哈希，仍将旧版本适用性标为待核对。

完整机器可读记录见 dependency-licenses.json。该记录提供来源事实和缺口，不宣称取得额外许可，不替代对游戏素材分发权利的核实。
