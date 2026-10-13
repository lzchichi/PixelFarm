# 第二阶段：地图与玩家控制

## 范围与实施方案

按用户最新阶段定义实施地图探索，替代原路线图中第二阶段的时间与背包建议。保留菜单、设置、Boot 本地加载、UIScene 与 960×540 整数显示；不新增种植、存档、交易或 NPC 系统。

使用 brainstorming、executing-plans 与 test-driven-development 流程检查边界并逐项实施。用户已明确要求“先检查现有架构，再实施修改”，本记录用于记录具体设计与执行证据，不额外阻塞开发。

- 地图：60×40、16×16；Ground 瓦片层，Scenery 装饰对象层，Collisions 矩形碰撞层，Interactions 可交互矩形层。水塘与围栏由 tileset 的 `collides` 属性阻挡，树干与小屋的阻挡从 Collisions 读取。
- FarmMap：创建真实 Phaser Tilemap / tile layer，与静态物理体及数据驱动交互对象。地图适配器校验 unknown 输入、边界、出生点与碰撞契约。
- Player：独立 Arcade Sprite，固定步长物理碰撞、速度输入、四方向待机 / 移动动画、输入清理。GameState 只在物理结算后同步位置，不再直接坐标移动。
- 相机：平滑跟随 Player，边界由地图像素尺寸设置；同宽地图不发生横向卷动，640 高地图提供纵向探索。
- 交互：按 E 检查面前 32 像素、横向容差 16 像素范围内最近物体，并避免隔着其他障碍互动；接近时显示 E 提示，互动显示配置中的观察文案。
- 测试：网格坐标、地图输入、移动输入与实际 Arcade 物理回归、互动方向 / 距离；浏览器验收动画、碰撞、相机、设置与切换。
- 当前无 Git 仓库，按用户要求在当前目录修改，不更改依赖或初始化 Git。

## 执行清单

- [x] 架构检查与基线：原 16 项 Vitest 全部通过。
- [x] 新地图契约、坐标函数与规则测试先行。
- [x] Player、FarmMap、四方向素材与 Scene 接入。
- [x] 检查、浏览器验收与独立审查修复。
- [x] 更新地图契约、素材来源与 README。

## 实现与修改文件

- `scripts/generate-test-map.mjs`、`public/assets/maps/farm.json`：生成 60×40 原创测试地图，包含所有要求的地形、树干 / 小屋阻挡、围栏出口与观察对象。
- `src/data/farmMap.ts`：校验 Tiled 图层、瓦片属性、矩形、互动 ID / 文案与安全出生点。
- `src/domain/grid.ts`、`interaction.ts`、`playerMotion.ts`：坐标转换、朝向 / 范围 / 遮挡选择、归一化速度及碰撞后实际位移判断。
- `src/domain/GameState.ts`：保留独立、可序列化状态；移除旧的直接坐标移动实现，移动断言迁入真实物理测试。
- `src/game/entities/Player.ts`：WASD / 方向键、24×28 下半身碰撞盒、四方向待机与行走、E 按键、物理结算后状态同步、输入与监听清理。
- `src/game/world/FarmMap.ts`：真实 Tilemap、属性瓦片碰撞、Tiled 静态碰撞体、装饰排序、地图及相机边界。
- `src/game/createGame.ts`、`scenes/BootScene.ts`、`scenes/FarmScene.ts`：开启固定 60 Hz Arcade、Tiled 本地预加载、协调地图 / 玩家、平滑相机与世界提示。
- `src/game/scenes/UIScene.ts`、`src/style.css`：互动 HUD、观察文案、E 操作说明；保留菜单、设置和焦点恢复。
- `src/game/assets/palette.ts`、`generateTextures.ts`：水塘、围栏、木牌、6 格图集与 24 帧原创玩家动画，全部 Canvas 本地生成 / NEAREST。
- `tests/grid.test.ts`、`interaction.test.ts`、`playerPhysics.test.ts`、`arcade-modules.d.ts`、`farmMap.test.ts`、`GameState.test.ts`：网格、互动、地图、真实 Arcade 物理与独立状态测试。旧移动的速度、障碍、斜向归一化、边界与无效时间断言保留在新物理测试，边界高度根据新世界尺寸由 540 改为 640。
- `README.md`、`docs/map-contract.md`、`asset-sources.md`、本记录、`superpowers/plans/2026-10-10-pixel-farm-story.md`：结构、运行、契约、来源、最新阶段状态与验收证据。
- `docs/screenshots/phase-2-farm.jpg`：浏览器实际探索 / 互动截图。

## 真实检查结果

以下为 2026-10-10 17:40:11 起执行的最终检查（东八区）：

| 命令 | 退出状态 | 真实结果 |
| --- | --- | --- |
| `npm run typecheck` | 0 | TypeScript strict 检查通过 |
| `npm test` | 0 | 6 个文件、28 项测试全部通过 |
| `npm run build` | 0 | Vite 生产构建成功；Phaser 分块 1,481.77 kB，仍报告超过 500 kB 的分块警告 |

测试先确认失败再实施：坐标、互动、地图契约以及缺失的速度模块出现失败后逐项完成；审查后的实际位移回归也先失败再修复。没有跳过测试或删除有效断言来隐藏问题。

真实物理测试直接调用已安装 Phaser 的 DOM 无关 World / Body / StaticBody 模块，不用模拟碰撞结果。验证速度、斜向速度、四边界、所有生成对象阻挡、薄围栏滑行、无效时间、UI 停止与撞墙后实际静止。瓦片层实际碰撞另由浏览器操作确认。

## 浏览器验收与审查

复用已运行的 `npm run dev`（127.0.0.1:5173），刷新后执行实际键盘 / 按钮操作：

- 菜单开始进入地图，出生点木牌有 E 提示和欢迎文案。
- WASD 与方向键能移动；上下左右对应帧及行走 / 待机可见，斜向速度由物理回归验证。
- 持续走向小屋墙壁、水塘、树干、围栏会停住；可以沿障碍移动并绕行，无穿越阻挡。树冠是装饰区域，树干才阻挡。
- 门前、树旁、水塘旁可按 E 观察。互动不触发未实现的室内、砍树或钓鱼功能。
- 相机在纵向探索时平滑滚动，顶部 / 底部不显示地图外部；下边界限制实际碰撞盒。世界同显示窗口等宽，横向相机按边界保持固定。
- 设置打开时输入冻结，关闭后方向键恢复；返回菜单再次开始可重新移动与互动。
- 1280×720 下 1× 居中；1920×1080 下 canvas 显示为 1920×1080、内部仍 960×540、zoom=2。验收后已恢复浏览器窗口覆盖设置。
- 最终读取浏览器 warning / error 日志为空。

使用 requesting-code-review 技能进行独立审查。修复了两项发现：碰撞前 delta 会误播放 walk，改为 WORLD_STEP 后中心位移；物理世界先关闭导致监听清理访问空值，改为捕获 world 引用。随后重新执行完整检查并验收返回 / 再次开始，无异常。

## 遗留问题与边界

- 当前仍是程序生成的原创测试地图 / 素材；Tiled 中预览图集需要导出对应 PNG，运行时完全不依赖该 PNG。
- 当前适配固定尺寸有限地图、单一内嵌图集、非压缩 GID、轴对齐矩形；外部图集、翻转瓦片、旋转对象与多地图切换尚未实现。
- 小屋内部、种植、时间、背包、经营、NPC、声音及 localStorage 存档未实现；继续游戏保持禁用。
- Phaser 大分块警告保留，未为压低警告修改阈值或混入无关拆包重构。
