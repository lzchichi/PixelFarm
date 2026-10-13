"""Crop user-supplied RGBA sheet; preserve RGB/alpha and use nearest-neighbour copies."""
from pathlib import Path
from PIL import Image, ImageDraw
import json, hashlib, shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('D:/edge_download/图片/像素风村庄与NPC资源图鉴.png')
DEST = ROOT / 'public/assets/art'
shutil.copy2(SOURCE, DEST / 'source' / 'village.png')
sheet = Image.open(SOURCE).convert('RGBA')
manifest_path = ROOT / 'src/data/art-manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
manifest['sources']['village'] = {'file': SOURCE.name, 'sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'size': list(sheet.size)}
out = DEST / 'game/town'
raw = DEST / 'objects/town'
out.mkdir(parents=True, exist_ok=True); raw.mkdir(parents=True, exist_ok=True)
contact = Image.new('RGBA', (900, 440), (31, 56, 44, 255))
def crop(key, box, size):
    image = sheet.crop(box)
    # Ignore near-transparent background pixels when locating the foreground; RGB is unchanged.
    bounds = image.getchannel('A').point(lambda a: 255 if a > 20 else 0).getbbox()
    if bounds:
        image = image.crop(bounds)
        box = (box[0]+bounds[0], box[1]+bounds[1], box[0]+bounds[2], box[1]+bounds[3])
    image.save(raw / f'{key}.png')
    image.save(DEST / 'raw-crops' / f'{key}.png')
    image.save(DEST / 'objects' / f'{key}.png')
    cleaned = image.copy()
    silhouette = None
    if key == 'town-board':
        silhouette = [(10,7),(159,7),(165,33),(160,39),(152,39),(152,135),(158,136),(160,161),(132,161),(132,135),(43,135),(43,161),(9,161),(10,135),(18,134),(18,39),(6,39),(3,30)]
        mask = Image.new('L', image.size, 0); ImageDraw.Draw(mask).polygon(silhouette, fill=255)
        alpha = image.getchannel('A'); alpha.paste(0, mask=mask.point(lambda a: 255-a))
        cleaned.putalpha(alpha)
        cleaned.save(DEST / 'objects' / f'{key}.png')
    game = cleaned.resize(size, Image.Resampling.NEAREST)
    game.save(out / f'{key}.png')
    return {'path': f'assets/art/game/town/{key}.png', 'width': size[0], 'height': size[1], 'source': 'village', 'bounds': list(box), 'rawPath': f'assets/art/raw-crops/{key}.png', 'neighborCleanup': silhouette is not None, 'foregroundMask': silhouette}
for i, (key, box, size) in enumerate([
    ('town-shop', (10,538,305,773), (248,196)),
    ('town-workshop', (523,536,788,773), (224,200)),
    ('town-cottage', (1018,538,1302,773), (240,196)),
    ('town-board', (590,808,758,980), (96,100)),
]):
    asset = crop(key, box, size); manifest['objects'][key] = asset
    image = Image.open(out / f'{key}.png'); contact.alpha_composite(image, (i*225, 30))
npcs = {}
for index, (key, x, portrait) in enumerate([
    ('lin-seed', 74, (16,14,155,194)),
    ('xu-carpenter', 583, (546,14,681,194)),
    ('he-villager', 1115, (1074,14,1208,194)),
]):
    frames = {}; frame_bounds = {}
    for direction, top in [('down',204),('left',276),('right',341),('up',407)]:
        # Fixed frames preserve the same foot anchor in every direction.
        frame_bounds[direction] = [x,top,x+44,top+68]
        image = sheet.crop(frame_bounds[direction])
        image.save(raw / f'{key}-{direction}.png')
        image = image.resize((32,48), Image.Resampling.NEAREST)
        image.save(out / f'{key}-{direction}.png')
        frames[direction] = f'assets/art/game/town/{key}-{direction}.png'
    p = crop(f'{key}-portrait', portrait, (108,140))
    npcs[key] = {'frames': frames, 'frameBounds': frame_bounds, 'portrait': p['path'], 'portraitBounds': p['bounds']}
    contact.alpha_composite(Image.open(out / f'{key}-down.png'), (index*225+30,280))
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
(ROOT / 'src/data/town-art-manifest.json').write_text(json.dumps({'source':manifest['sources']['village'], 'npcs':npcs},ensure_ascii=False,indent=2)+'\n', encoding='utf-8')
contact.convert('RGB').save(ROOT / 'docs/screenshots/town-cuts.jpg')
print('Imported 4 buildings/board, 12 direction frames and 3 portraits; original retained.')
