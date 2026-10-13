# 农场环境调整

更新日期：2026-10-13（东八区）。状态：已实现，验收结果见下。

## 实现

- 农场从 60×40 扩大至 100×70 格，32 像素网格，对应 3200×2240 世界尺寸，面积约为原来的 2.92 倍。
- 保持出生点、小屋、农田、谷仓、鸡舍及三个采集资源的位置；外围增加错落的树林、花草、灌木与弯曲土路。共 87 棵树，92 个 decoration 类对象（包含既有装饰和水边植物）。树干有碰撞，普通花草可穿行。
- 地面使用用户提供的 terrain.png：三种草地和一种泥地按 96×96 原图纹理分块，再拆成九个 32×32 瓦片。地面副本仅在八像素边缘进行羽化，并共享草地边界，减少接缝和镜像花环；内部 80×80 像素保留最近邻缩放结果。
- 草泥交界根据四邻格自动选择 15 种边缘组合；草边轮廓来自原图第五行过渡地块，使用原图草地与泥地像素合成，避免道路内部重复独立地块边框。
- 成年树 176px、幼树 104px、苹果树 136px、围栏 32px、稻草人 56px，并调整岩石、树桩和倒木。建筑维持现有尺寸。所有原图和无损透明裁片保留，物体副本保持宽高比并采用最近邻缩放。
- 地图解析按地图自身尺寸校验，农场允许新尺寸；村庄仍为 60×40。存档边界和建筑地形检查兼容扩展区域与新瓦片，未改存档版本或经营规则。

## 修改文件

- 素材处理与地图生成：scripts/prepare_environment.py、scripts/generate-test-map.mjs、scripts/generate-town-map.mjs。
- 配置与地图：src/data/artAssets.ts、src/data/art-manifest.json、public/assets/maps/farm.json、public/assets/maps/town.json。
- 地图解析与存档：src/data/farmMap.ts、src/adapters/storage/saveCodec.ts。
- 建筑地形规则：src/domain/buildings.ts。
- PNG 副本：public/assets/art/game/terrain/ 下新增大纹理分块及交界瓦片，farm-tiles.png 更新；game/objects/ 下 17 个物体比例调整。
- 测试：tests/farmMap.test.ts、mapRoutes.test.ts、buildings.test.ts、expansionSave.test.ts、timeSave.test.ts、test_art_pipeline.py。
- 文档与截图：本文件、README.md、docs/map-contract.md、docs/asset-sources.md，docs/screenshots/environment-farm.jpg、environment-meadow.jpg。

## 再生成

使用安装了 Pillow 的 Python 执行 `python scripts/prepare_environment.py`，再执行 `node scripts/generate-test-map.mjs`。脚本从项目内归档的 PNG 读取，不依赖外部下载目录；可重复执行。无需重新导入原始图集，不新增项目依赖。

## 验证与限制

核心通路测试包含原农田、房屋、水岸、旧边界以及新增区域和新地图角落；所有路线均按玩家 24×28 碰撞盒检查。新增区域存档往返、村庄边界和已有经营测试一并执行。旧测试中的越界值随已确认的新地图边界更新，失败断言保留。

浏览器使用独立 5176 测试地址、1280×720 桌面窗口，检查首页进入、道路行走、平滑跟随与外围树林显示，并在扩展区域手动保存、刷新后继续游戏。测试存档与原地址分离。

扩展区域主要用于探索和装饰，本次未增加新的任务或采集物类型；池塘仍沿用现有布局。新纹理会有局部重复，建筑未加入全图通路封堵检查。生产构建的 Phaser 大文件警告仍保留。

最终检查：`npm run typecheck` 通过；`npm test` 20 文件、114 项测试通过；`npm run build` 退出 0；Python 素材检查 8 项通过（退出 0）。Phaser 分块 1481.77 kB 的体积警告仍存在。浏览器成功保存并刷新继续扩展区域进度，错误与警告日志为空。
