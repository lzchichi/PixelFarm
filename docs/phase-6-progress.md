# 第六阶段交付记录（2026-10-13）

已实现农场与村庄往返、三位村民日程与逐字对话、0–100 好感度、每日委托、材料收集及村庄进度存档。用户提供 PNG 已接入，无新增图片生成或下载。

## 修改文件

- 配置与规则：`src/data/npcs.ts`、`commissions.ts`、`items.ts`；`src/domain/village.ts`、`travel.ts`、`GameState.ts`、`time.ts`。
- 地图与美术：`scripts/import_town_art.py`、`generate-town-map.mjs`、`generate-test-map.mjs`；`public/assets/maps/farm.json`、`town.json`；`src/data/art-manifest.json`、`town-art-manifest.json`；`public/assets/art/source/village.png`、原尺寸裁片和 `game/town/` PNG。
- 场景协调与显示：`src/game/createGame.ts`；`scenes/BootScene.ts`、`MenuScene.ts`、`FarmScene.ts`、`TownScene.ts`、`UIScene.ts`；`entities/Villagers.ts`；`world/FarmMap.ts`、`WorldSession.ts`；`ui/DialoguePanel.ts`、`CommissionPanel.ts`、`itemDisplay.ts`；`src/style.css`。
- 存档：`src/application/session.ts`、`src/adapters/storage/saveCodec.ts`。
- 测试：`tests/village.test.ts`、`townMap.test.ts`、`villagersRender.test.ts`、`timeSave.test.ts`、`test_art_pipeline.py`。
- 文档：`README.md`、`docs/asset-sources.md`、`map-contract.md`、阶段计划与交付记录；`docs/screenshots/phase-6-*.jpg`、`town-cuts.jpg`。

## 可操作功能

农场井西南的路牌按 E 前往村庄；村庄南侧路牌按 E 返回。两图共用 GameState、背包、金币、时钟和天气。商店、工坊、茅草小屋、石路广场及公告栏均有本地 Tiled 配置，障碍由地图碰撞层提供。

艾米是种子商人，托马斯是木匠，莉娜是普通村民。日程点读取当前时钟，每日首次交谈增加 1 好感度，上限 100。靠近按 E 打开带肖像的逐字对话；继续可补完文字或推进下一段，关闭恢复世界输入。艾米对话中的“购买 / 出售”和商店建筑入口复用既有交易系统。

公告栏每天生成一项作物和一项材料委托；Q 可随时查看任务面板。任务进度读取背包真实数量，接取后跨天保留，未接取旧单被新单替换。向委托人一次提交足量物品后进入“已交付”，然后领取金币与好感度，已领取任务不再提供奖励按钮。失败不扣物品，重复交付或领取被规则拒绝。广场边落木与碎石按 E 收集，每天各可取 2 份；背包满时不消耗采集机会。

存档 schemaVersion 为 5，包含地图 ID、村民关系、每日交谈日期、委托状态和材料采集日期。schema 4 先完整验证再迁移，保留原金币、背包、农田、时间及位置。村庄保存仍用农场地图验证农田，使用所在地图验证玩家位置；从农场读取村庄存档时正确切换到 TownScene。

## 验收证据

使用独立 `localhost:5173` 测试存档，保留原 `127.0.0.1:5173` 农场存档。浏览器实际操作完成：开始游戏 → 农场路牌 → 村庄公告栏接“修补木椅” → 收集木材 2 份 → 托马斯对话 → 交付 → 领取 → 保存 → 刷新继续 → 返回农场 → 读取村庄存档。金币 500→545，交付后木材清空，好感度 1→11，读档后“已领取奖励”保留且不再出现领取按钮，背包工具和种子保持不变。

浏览器曾发现 Villagers 字段初始化先于场景引用赋值的错误。补充测试复现同一 TypeError 后，将渲染对象创建移至构造函数；重新完成上述流程，最终测试标签页无控制台错误或警告。委托操作重新渲染后恢复焦点，避免键盘焦点丢失。

最终验证：`npm run typecheck` 退出码 0；`npm run test` 退出码 0，15 个测试文件、91 项测试通过；`npm run build` 退出码 0，保留 Phaser 约 1.48 MB 分块警告；使用带 Pillow 的 Python 运行 `tests/test_art_pipeline.py` 退出码 0，6 项原图哈希、裁片 RGBA、透明处理及最近邻副本检查通过。新增 NPC 初始化测试先复现原错误，再验证修复，不跳过或删除有效断言。

最后使用 1280×720 桌面窗口复查村庄 HUD 与完整快捷栏，并从艾米对话进入种子购买 / 作物出售界面。最终版本继续村庄存档、截图及暂停时，测试标签页控制台错误与警告列表为空。临时窗口覆盖已恢复；小窗口保持 1× 像素画面并可滚动查看。

## 限制

日程采用按时段切换位置，尚无 NPC 寻路行走、房屋内部或分支剧情。木匠本阶段不提供制作功能，村民不提供牧场养殖。玩家与菜单云朵沿用之前已有的临时纹理；本阶段新 NPC、建筑和公告栏均为用户 PNG。Phaser 分块仍有体积警告。
