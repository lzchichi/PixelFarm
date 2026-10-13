# 当前农场地图契约

入口为 public/assets/maps/farm.json。BootScene 本地加载 Tiled JSON 与 PNG，parseFarmMap(input: unknown) 校验后交给 FarmMap 创建瓦片层、场景对象与静态碰撞。失败时显示可理解的提示。

- 农场为有限正交地图 100×70 格，每格 32×32；世界 3200×2240，逻辑窗口 960×540。村庄保持 60×40。解析器使用地图自身尺寸校验，最大支持 100×70。图层同原点，无偏移。
- Ground：农场 7000、村庄 2400 个非压缩整数 GID。1–14 保持原有草地、花草、农田、土路、水面、石路和岸边编号；15–50 为原图草地与泥地大纹理分块；51–185 为草泥四邻格边缘组合。无空格、翻转 GID、压缩数据或无限地图。
- farm-tiles：内嵌单一 tileset，firstgid=1、tilecount/columns 与素材清单一致（当前 185）、tilewidth/height=32、margin/spacing=0。图片 ../art/game/terrain/farm-tiles.png，5920×32，可直接在 Tiled 预览。tiles[].id 从 0 开始；布尔属性 collides 决定瓦片碰撞，水面与岸边阻挡，石路可走。新草地与泥地清单标注 terrain 分类，建筑规则按分类支持放置。
- Scenery：恰好一个 type: spawn 的出生点。类型支持 tree/cabin/sign/barn/coop/well/rock/fence/decoration；字符串属性 asset 必须引用素材清单中的稳定 ID。宽高等于游戏 PNG 尺寸；depthAnchor 定义脚部排序锚点，范围 0 到对象高度。对象原生尺寸显示，大型对象占多格。
- Collisions：轴对齐矩形，不旋转。生成器根据对象类别与相对脚部范围生成树干、建筑地基、岩石和栅栏等矩形，FarmMap 转为静态 Arcade 物理体；Scene 不散落硬编码碰撞坐标。树冠可遮挡从后方通过的玩家。
- Interactions：轴对齐矩形，name 为唯一稳定 ID，label、message 为提示与观察文案。E 选择面前 32 像素、侧向 16 像素内最近无遮挡目标；目标自身表面不视为遮挡。
- 所有矩形位于世界范围内。出生点为玩家 24×28 碰撞盒中心，不能与阻挡重叠。玩家仍用已有 16×24 源图、2× 显示；地图改为 32 格不要求重绘玩家。

src/domain/grid.ts 默认格宽为 32：worldToTile 向下取整，tileToWorld 默认左上角，可选 center 返回中心。支持负坐标、自定义正数格宽，拒绝非有限数值、无效格宽及非整数瓦片坐标。

运行 node scripts/generate-test-map.mjs 会覆盖 farm.json；编辑后先另存。生成器读取素材清单确定对象尺寸和瓦片数，不绘制美术。地图声明布局、碰撞与观察内容。第三阶段由 farmingArea 适配器读取 farmland 格，排除碰撞瓦片和与静态矩形相交的格；实际耕地、水分和作物统一存入 GameState.plots，FarmPlots 负责覆盖显示，不回写地图 JSON。现已支持固定资源采集；建筑内部和钓鱼未实现。
# 村庄地图补充（第六阶段）

`town.json` 保留 60×40、32×32 有限正交 Tiled 契约，复用 Ground、Scenery、Collisions、Interactions 图层和同一瓦片图集。BootScene 验证两张地图后提供 worldMaps；FarmMap 渲染器按地图缓存 key 选择布局。

村庄装饰新增 `town-shop`、`town-workshop`、`town-cottage`、`town-board`，尺寸必须与美术清单一致。农场出口 ID 为 `farm-to-town`，村庄返回 ID 为 `town-to-farm`；公告栏 `town-board`、商店 `town-shop`、材料 `town-wood` / `town-stone` 均由交互层声明。NPC 日程来自 `npcs.ts`，每个日程点必须满足玩家足部尺寸的通行校验。

场景切换仅修改同一 GameState 的 mapId 与目标地图出生点，不重建背包或金币。加载存档按 mapId 校验玩家碰撞，始终用农场地图校验 plots，避免村庄存档误判农田。

