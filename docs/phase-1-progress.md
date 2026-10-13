# 第一阶段执行记录

## 范围与裁定

- 本次以用户最新任务为准：BootScene、MenuScene、FarmScene、UIScene，960×540，原创程序素材与菜单，临时农场，npm scripts 与运行验收。
- 旧计划中的 PreloadScene 合并到 BootScene；WorldScene 命名改为 FarmScene。后续种植、经营、NPC 与 localStorage 不在本轮实现。
- 当前目录没有 Git 仓库；按用户指定在当前目录实施，不建立其他 worktree，不自动初始化或提交 Git。原先依赖 Git 的执行辅助脚本改用本记录跟踪。
- 任务接口：BootScene 提供本地地图及生成纹理，MenuScene 创建新 GameState，FarmScene 消费地图与状态，UIScene 展示菜单及农场界面；不存在重复持久化状态。
- 小于 960×540 的窗口保留 1×，允许滚动；默认不允许分数倍缩放。

## 进度

- [x] 工程配置与规则测试先行。
- [x] 四个 Scene、本地预加载、菜单与农场画面。
- [x] 类型检查、Vitest、生产构建与浏览器验收。
- [x] 更新 README、实施计划与真实测试结果。

## 检查证据

- 首次 `npm test`：退出码 1，16 项中 7 项失败，原因是整数放大、移动与地图解析尚未实现；实现后 16 项全部通过，退出码 0。
- 首次 typecheck / build：均退出码 1，TS2483 禁止 for…of 声明直接带类型注解；将 unknown[] 注解放到集合声明后，两项退出码均为 0。
- `npm run dev`：Vite 6.4.4 启动成功，监听 127.0.0.1:5173。
- 生产构建有 Phaser 分块大小警告：约 1.48 MB（gzip 约 340 KB），不影响构建成功，未隐藏警告。
- 浏览器：主菜单 → 设置开关 → 关闭 → 开始游戏 → 农场 → 行走 → 返回菜单 → 再开始，流程实际通过。重复进入后 UI DOM 数量为 1，未遗留设置面板。
- 显示测量：1280×720 / 1366×768 画布为 960×540；1920×1080 画布与 UI 均为 1920×1080，逻辑画布仍为 960×540；800×400 保持 960×540 并出现滚动范围。
- 该轮浏览器 console error / warn 查询返回空数组；跨浏览器和长期压力测试尚未执行。

## 独立审查与修复

- 独立只读审查：无 Critical；发现关闭农场设置后焦点停在按钮导致暂停移动。浏览器回归先看到 BUTTON（失败），修复后为 CANVAS（通过），并实际按 D 确认行走恢复。菜单关闭设置仍恢复原按钮焦点。
- 审查提出全局按键捕获清理问题。裁定：小窗口适配依赖滚动，退出农场后键盘滚动不可被继续拦截，因此纳入本轮修复。稳定焦点后浏览器 Down 按键无法改变 scrollTop（0 → 0），显式 removeCapture 后同一路径为 0 → 40，回归通过。
- 未扩大范围：种植、时间推进、背包、交易、NPC、存档与长期压力测试留待后续阶段；因此不对这些未实现系统宣称通过验收。

## 最终验证

| 检查 | 实际结果 |
| --- | --- |
| `npm run typecheck` | 退出码 0 |
| `npm test` | 退出码 0；3 文件、16 项全部通过 |
| `npm run build` | 退出码 0；保留 Phaser 大分块警告 |
| `npm run dev` | 开发服务器正常启动，首页与进入农场流程通过 |
| `npm run preview -- --port 5174` | 生产预览正常显示菜单与农场；设置、Esc 关闭、焦点恢复与返回通过 |
| 浏览器日志 | 开发与生产预览 console error / warn 返回空数组 |

## 修改文件与遗留问题

- 新增工程文件：`.gitignore`、`package.json`、`package-lock.json`、`tsconfig.json`、`vite.config.ts`、`vitest.config.ts`、`index.html`、`README.md`。
- 新增源码：`src/main.ts`、`style.css`、`data/farmMap.ts`、`domain/GameState.ts`、`game/createGame.ts`、`viewport.ts`、`game/assets/{palette,generateTextures,pixelTitle}.ts`、`game/scenes/{BootScene,MenuScene,FarmScene,UIScene}.ts`。
- 新增数据与测试：`public/assets/maps/farm.json`、`tests/{viewport,GameState,farmMap}.test.ts`。
- 新增文档与截图：`docs/map-contract.md`、`asset-sources.md`、本记录、`screenshots/phase-1-{menu,farm}.jpg`；修改原实施计划的阶段状态与下一步。
- 遗留：继续按钮因尚无存档而禁用；种植、经营与 NPC 均未实现；Phaser 分块约 1.48 MB；跨浏览器、非 100% 浏览器缩放与长期压力测试尚未执行。
- 没有遗留独立审查指出的代码问题。本项目尚未初始化 Git，未提交、推送或发布。
