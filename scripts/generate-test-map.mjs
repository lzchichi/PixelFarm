import { readFile, writeFile } from 'node:fs/promises';

const art = JSON.parse(await readFile(new URL('../src/data/art-manifest.json', import.meta.url), 'utf8'));
const width = 100, height = 70, size = 32;
const ground = Array(width * height).fill(1);
function area(x, y, w, h, gid) {
  for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) ground[row * width + col] = gid;
}
area(27, 5, 4, 33, 4); area(24, 21, 28, 2, 4);
area(12, 23, 12, 7, 3); area(35, 16, 12, 5, 6);
// A rectangular pond with bank edges / corners, entirely driven by tile IDs.
area(35, 27, 12, 8, 5);
area(36, 27, 10, 1, 7); area(36, 34, 10, 1, 8);
area(35, 28, 1, 6, 9); area(46, 28, 1, 6, 10);
area(35, 27, 1, 1, 11); area(46, 27, 1, 1, 12);
area(35, 34, 1, 1, 13); area(46, 34, 1, 1, 14);
const tileId = name => art.tiles.findIndex(t => t.name === name) + 1;
// Existing working area remains fixed for saves. New paths cross the east
// meadow and south woodland; irregular clusters avoid a rectangular lawn.
for (let x=60;x<96;x++) {
  const y=22+Math.round(3*Math.sin((x-60)/11)); area(x,y,1,3,4);
}
for (let y=39;y<66;y++) {
  const x=29+Math.round(4*Math.sin((y-39)/8)); area(x,y,3,1,4);
}
for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
  const i=y*width+x;
  if(ground[i]===1) {
    const mx=Math.floor(x/3),my=Math.floor(y/3);
    const value=(mx*17+my*31)%19;
    const name=value===0?'meadow-flowers':value<5?'meadow-tufts':'meadow';
    ground[i]=tileId(`${name}-${x%3}-${y%3}`);
  }
}
// Read neighbours before replacing dirt GIDs. The supplied bottom-row
// swatches represent west, north, north, west, north, or enclosed grass.
const terrainBefore=[...ground];
for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
  const i=y*width+x;if(terrainBefore[i]!==4)continue;
  const grassy=(dx,dy)=>{const gid=terrainBefore[(y+dy)*width+x+dx];return gid && art.tiles[gid-1]?.terrain==='grass';};
  const edge=(grassy(0,-1)?1:0)|(grassy(1,0)?2:0)|(grassy(0,1)?4:0)|(grassy(-1,0)?8:0);
  ground[i]=edge===0?tileId(`earth-${x%3}-${y%3}`):tileId(`grass-earth-edge-${edge}-${x%3}-${y%3}`);
}
let id = 1;
const prop = (name, value) => ({ name, type: typeof value === 'boolean' ? 'bool' : typeof value === 'number' ? 'int' : 'string', value });
const object = (name, type, x, y, w = 0, h = 0, properties = []) => ({ id: id++, name, type, x, y, width: w, height: h, rotation: 0, visible: true, properties });
const scenery = [object('出生点', 'spawn', 928, 688)];
const collisions = [], interactions = [];
// Relative foot rectangles are art-specific data; no collision coordinates in Scenes.
const shapes = {
  tree: [0.39, 0.65, 0.22, 0.27], cabin: [0.16, 0.58, 0.68, 0.34],
  barn: [0.14, 0.57, 0.75, 0.34], coop: [0.16, 0.55, 0.68, 0.36],
  well: [0.14, 0.52, 0.72, 0.40], rock: [0.12, 0.28, 0.76, 0.56],
  fence: [0.04, 0.65, 0.92, 0.21], sign: [0.36, 0.76, 0.23, 0.20],
  decoration: [0.20, 0.64, 0.60, 0.27],
};
function place(name, kind, asset, x, y, solid = true, interactionId, message) {
  const { width: w, height: h } = art.objects[asset];
  const [rx, ry, rw, rh] = shapes[kind] ?? shapes.decoration;
  const foot = { x: x + Math.round(rx * w), y: y + Math.round(ry * h), width: Math.round(rw * w), height: Math.round(rh * h) };
  scenery.push(object(name, kind, x, y, w, h, [prop('asset', asset), prop('depthAnchor', foot.y + foot.height - y)]));
  if (solid) collisions.push(object(`${name}阻挡`, 'solid', foot.x, foot.y, foot.width, foot.height));
  if (interactionId) interactions.push(object(interactionId, 'interaction', foot.x, foot.y, foot.width, foot.height,
    [prop('label', name), prop('message', message)]));
}
place('青芽小屋 · 睡觉', 'cabin', 'cabin', 760, 432, true, 'cabin-door', '返回小屋休息，睡到次日早晨并自动保存。');
place('红瓦谷仓', 'barn', 'barn', 1216, 432, true, 'barn-door', '谷仓里飘来干草的香气。仓储系统尚未开放。');
place('鸡舍', 'coop', 'coop', 1600, 640, true, 'coop-door', '一只小鸡探出头来。动物养殖尚未开放。');
place('工具棚', 'decoration', 'shed', 352, 480, true, 'shed-door', '工具棚静静地守着农田，里面还没有可取用的工具。');
place('石井', 'well', 'well', 1060, 568, true, 'well', '井水清凉。使用水壶可以给已开垦的农田浇水。');
const trees = [
  ['tree-spring', 480, 240], ['tree-young', 640, 300], ['tree-oak', 1088, 208],
  ['tree-apple', 1504, 352], ['tree-autumn', 1632, 928], ['tree-oak', 448, 976], ['tree-apple', 1088, 1056],
];
for (const [asset, x, y] of trees) place(asset === 'tree-apple' ? '苹果树' : '林间树木', 'tree', asset, x, y, true,
  `tree-${x}-${y}`, '枝叶在风里轻轻摇动。采集和砍树尚未开放。');
// Deterministic woodland clusters, outside the original saved/buildable area.
// Open strips connect every new region; trees block only their trunk feet.
for(let row=0;row<13;row++)for(let col=0;col<18;col++) {
  const x=96+col*170+(row%2)*35+((col*37+row*19)%73)-36;
  const y=80+row*155+((col*23+row*41)%61)-30;
  if(x<1920&&y<1280)continue;
  if(x>3000||y>2050||Math.abs(x-960)<160||Math.abs(y-800)<140||Math.abs(x-2560)<80||Math.abs(y-1760)<80)continue;
  if((col*11+row*7)%9===0)continue;
  const asset=['tree-spring','tree-oak','tree-young','tree-apple'][(col+row*3)%4];
  const a=art.objects[asset];
  const foot={x:x+Math.round(a.width*.39),y:y+Math.round(a.height*.65),width:Math.round(a.width*.22),height:Math.round(a.height*.27)};
  if([[72,15],[80,55],[99,69]].some(([tx,ty])=>foot.x<tx*32+48&&foot.x+foot.width>tx*32-16&&foot.y<ty*32+48&&foot.y+foot.height>ty*32-16))continue;
  place('林间树木','tree',asset,x,y);
}
for(let row=0;row<18;row++)for(let col=0;col<27;col++) {
  const x=64+col*112+(row%2)*27,y=96+row*112;
  if(x<1920&&y<1280)continue;
  if((col*7+row*13)%4!==0||x>3100||y>2140)continue;
  const asset=['bush-pink','bush-white','flowers-white','flowers-blue','flowers-daisies','bush-round'][(col+row)%6];
  place('野生花草','decoration',asset,x,y,false);
}
const fenceStep = art.objects.fence.width - 3;
for (let x = 384; x + art.objects.fence.width <= 770; x += fenceStep) place('木栅栏', 'fence', 'fence', x, 696);
for (let x = 384; x + art.objects.fence.width <= 770; x += fenceStep) {
  if (x > 570 && x < 680) continue;
  place('木栅栏', 'fence', 'fence', x, 952);
}
// The south entrance remains wider than the player's collision box.
place('木门', 'fence', 'gate', 1540, 520);
place('前往青芽村', 'sign', 'sign', 1008, 728, true, 'farm-to-town', '沿着小路前往青芽村。');
place('稻草人', 'decoration', 'scarecrow', 528, 792);
place('石头', 'rock', 'rock-large', 528, 568, true, 'rock', '石头上覆着柔软的青苔。挖矿尚未开放。');
place('碎石堆', 'rock', 'rock-cluster', 1544, 1020);
place('木长椅', 'decoration', 'bench', 816, 1032, true, 'bench', '坐在这里，可以望见农田与水塘。');
place('木桶', 'decoration', 'barrel', 1468, 588);
place('青芽种子铺', 'decoration', 'crate', 1140, 692, true, 'farm-shop', '购买种子，出售农田收获。');
place('路灯', 'decoration', 'lantern', 864, 856);
place('树桩', 'rock', 'stump-moss', 336, 1000);
place('倒木', 'rock', 'log-moss', 1552, 1152);
for (const [asset, x, y] of [
  ['bush-pink', 728, 624], ['bush-white', 1000, 576], ['flowers-white', 736, 708],
  ['flowers-blue', 1184, 712], ['bush-round', 1496, 752], ['flowers-daisies', 808, 984],
  ['mushrooms-red', 336, 1120], ['mushrooms-gold', 584, 1112],
]) place('花草', 'decoration', asset, x, y, false);
place('睡莲', 'decoration', 'water-lily', 1248, 928, false);
place('水边芦苇', 'decoration', 'reeds', 1088, 856, false);
place('水边香蒲', 'decoration', 'cattails', 1432, 1032, false);
interactions.push(object('pond', 'interaction', 1120, 864, 384, 256, [prop('label', '水塘'), prop('message', '水面泛起细小的波纹，睡莲静静浮着。现在还不能下水。')]));
interactions.push(object('field', 'interaction', 384, 736, 384, 224, [prop('label', '农田'), prop('message', '松软的土壤已经准备好了。用锄头开垦，再播种并每天浇水。')]));
const group = (layerId, name, objects) => ({ id: layerId, name, type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, visible: true, opacity: 1, objects });
const map = {
  type: 'map', version: '1.10', tiledversion: '1.11.0', orientation: 'orthogonal', renderorder: 'right-down', infinite: false,
  width, height, tilewidth: size, tileheight: size, nextlayerid: 5, nextobjectid: id,
  layers: [{ id: 1, name: 'Ground', type: 'tilelayer', width, height, x: 0, y: 0, visible: true, opacity: 1, data: ground },
    group(2, 'Scenery', scenery), group(3, 'Collisions', collisions), group(4, 'Interactions', interactions)],
  tilesets: [{ firstgid: 1, name: 'farm-tiles', tilewidth: size, tileheight: size, tilecount: art.tiles.length, columns: art.tiles.length,
    image: '../art/game/terrain/farm-tiles.png', imagewidth: 32 * art.tiles.length, imageheight: 32, margin: 0, spacing: 0,
    tiles: art.tiles.map((entry, tileId) => ({ id: tileId, properties: [prop('collides', entry.collides)] })),
  }],
};
await writeFile(new URL('../public/assets/maps/farm.json', import.meta.url), `${JSON.stringify(map)}\n`);
console.log('Generated 100×70 farm using supplied PNGs and a 32×32 grid');
