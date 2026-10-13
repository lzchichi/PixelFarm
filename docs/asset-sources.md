# 素材来源与处理（2026-10-12）

本次以用户提供的五张 PNG 为农场和菜单美术。用户授权在本项目使用；未随文件提供单独许可证或署名要求，此记录不推定其他用途的授权。

| 原始文件（D:/edge_download/图片/） | 项目原图 | 内容 |
| --- | --- | --- |
| ChatGPT 图像 2026年10月12日 16_00_26-1.png | public/assets/art/source/vegetation.png | 树木、灌木、花草 |
| ChatGPT 图像 2026年10月12日 16_00_29-2.png | public/assets/art/source/buildings.png | 小屋、谷仓、棚屋、鸡舍、水井 |
| ChatGPT 图像 2026年10月12日 16_00_31-3.png | public/assets/art/source/terrain.png | 草地、道路、农田、石路 |
| ChatGPT 图像 2026年10月12日 16_00_35-4.png | public/assets/art/source/water.png | 水面、岸边、芦苇、水中装饰 |
| ChatGPT 图像 2026年10月12日 16_00_47-5.png | public/assets/art/source/decorations.png | 栅栏、岩石、木箱等装饰 |

scripts/import_art.py 使用 Pillow / NumPy 裁切，src/data/art-manifest.json 记录原图 SHA256、裁切边界、原尺寸、游戏尺寸及相邻对象清理标记。原图按字节保存；51 个对象未经清理的 RGBA 裁片位于 raw-crops/，独立透明 PNG 位于 objects/。仅针对相邻树冠、码头和芦苇误入的邻居像素改透明度，保留 RGB 和未经清理的裁片供比较。

game/objects/ 使用最近邻副本，不通过代码重画对象；建筑和树木保留 3/8 比例，装饰在第三阶段按用途分别校准，具体 scale 写入素材清单。原尺寸版本完整保留。地形和水面独立裁片位于 terrain/；32×32 地面取原纹理镜像拼接，岸边由原色块组合为 14 格图集。仅游戏地面填实 alpha，原图透明度不变。

第三阶段新增用户提供的“像素农作物生长与收获图鉴.png”，原图在 source/crops.png。scripts/import_crops.py 裁出 16 个阶段与 4 个产物，原尺寸透明 PNG 在 crops/，最近邻副本在 game/crops/，哈希与边界在 src/data/crop-art-manifest.json。

generateTextures.ts 仅保留现有玩家四方向动画和云朵；pixelTitle.ts 提供点阵标题。UI 使用系统字体，favicon 为已有 SVG。没有下载外部图片或生成新图片。后续未提供的新图片先询问用户。

2026-10-13 第六阶段新增用户提供的“像素风村庄与NPC资源图鉴.png”。原图按字节保存在 `source/village.png`，SHA256 记录于 `art-manifest.json` 与 `town-art-manifest.json`。`scripts/import_town_art.py` 裁出三种建筑、一块公告栏、三位 NPC 的四方向形象和三个肖像。角色统一 32×48px，与现有玩家高 48px 对齐；建筑宽 224–248px、高 196–200px。

村庄原尺寸 RGBA 裁片保存在 `raw-crops/`、`objects/`，NPC 方向裁片位于 `objects/town/`，最近邻游戏副本位于 `game/town/`。公告栏原图局部含不透明棕色背景，仅按清单中的 `foregroundMask` 清理轮廓外 alpha；全部 RGB 与轮廓内透明度保持原样，原始裁片保留供比对。其他裁片不重画、不改变原始 RGBA。素材图鉴上的职业文字只作为图片内容，游戏中三人的职业与原创对话按 NPC 配置定义。

重新生成全部素材时，依次运行 `import_art.py`、`import_crops.py`、`import_town_art.py`、`prepare_environment.py`；然后运行 `generate-test-map.mjs`、`generate-town-map.mjs`。日常启动不需要 Python 或源图所在的外部目录。

2026-10-13 环境调整复用已归档 terrain.png 及植物、装饰裁片。`prepare_environment.py` 制作 96×96 地面分块，内部 80×80 保持最近邻原图像素，八像素边缘采用羽化实现连续拼接；三种草地共用外边缘。草泥交界的透明轮廓依据原图第五行北侧草边提取，按邻格旋转组合，再合成原图草地与泥地纹理。处理只应用于运行地面副本，原始 PNG、透明裁片及原始地面地块未改。17 个物体副本调整比例，全部维持最近邻采样和宽高比。具体尺寸、步骤与验收见 environment-update.md。

2026-10-13 第七阶段新增用户提供的鸡牛图集 `codex-clipboard-a65ce6ef-7270-4839-ae3f-3828540e7254.png`。原图按字节保存为 `source/animals.png`；`scripts/import_animals.py` 裁出鸡、牛各四方向四帧、各自进食 / 休息状态及鸡蛋、牛奶、饲料，共 39 个透明 RGBA PNG。原尺寸裁片在 `animals/`，最近邻副本在 `game/animals/`，哈希、边界、缩放尺寸和脚底对齐偏移在 `src/data/animal-art-manifest.json`。鸡统一 0.27 比例、牛 0.30，所有同种帧保留相同比例并对齐脚底；产物图标不超过 24px。

重新裁切动物可运行 `python scripts/import_animals.py`，默认读取项目中保存的原图；替换图集可追加新 PNG 的路径。没有重画或下载动物图像。季节显示采用原有春 / 秋树木和 Phaser 色调，不修改原图，冬季仅冷色氛围，未生成雪地或落叶新素材。
