"""Lossless RGBA crops from the supplied animal sheet; nearest-neighbour game copies."""
import hashlib
import json
import shutil
import sys
from pathlib import Path
from PIL import Image, ImageDraw
from import_art import crop_asset

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'public/assets/art'
SOURCE = Path(sys.argv[1]) if len(sys.argv)>1 else ART / 'source/animals.png'

def run():
    for folder in ('source', 'animals', 'game/animals'):
        (ART / folder).mkdir(parents=True, exist_ok=True)
    if SOURCE.resolve() != (ART / 'source/animals.png').resolve():
        shutil.copyfile(SOURCE, ART / 'source/animals.png')
    source = Image.open(ART / 'source/animals.png').convert('RGBA')
    assets = {}
    regions = {}
    for kind, columns, rows in (
        ('chicken', [215, 347, 475, 601, 729], [0, 116, 229, 341, 462]),
        ('cow', [170, 330, 477, 631, 807], [463, 608, 738, 852, 977]),
    ):
        for row, direction in enumerate(('down', 'left', 'right', 'up')):
            for frame in range(4):
                regions[f'{kind}-{direction}-{frame}'] = (columns[frame], rows[row], columns[frame+1], rows[row+1])
    regions.update({
        'chicken-feed': (795, 0, 971, 124), 'chicken-rest': (971, 0, 1158, 130),
        'cow-feed': (805, 463, 1065, 614), 'cow-rest': (1065, 479, 1283, 613),
        'egg': (157, 980, 245, 1086), 'milk': (502, 977, 603, 1086), 'feed': (881, 964, 1020, 1086),
    })
    for key, region in regions.items():
        raw, bounds = crop_asset(source, region)
        raw.save(ART / 'animals' / f'{key}.png')
        scale = .27 if key.startswith('chicken-') else .30 if key.startswith('cow-') else min(24/raw.width, 24/raw.height)
        size = tuple(max(1, round(v*scale)) for v in raw.size)
        game = raw.resize(size, Image.Resampling.NEAREST)
        # Fixed foot-aligned frame canvases prevent hopping when frame bounds differ.
        canvas_size = (52, 40) if key.startswith('chicken-') else (80, 52) if key.startswith('cow-') else size
        canvas = Image.new('RGBA', canvas_size)
        offset = ((canvas.width-game.width)//2, canvas.height-game.height)
        canvas.paste(game, offset)
        canvas.save(ART / 'game/animals' / f'{key}.png')
        assets[key] = {'path':f'assets/art/game/animals/{key}.png', 'bounds':list(bounds),
                       'scaledSize':list(size), 'canvasSize':list(canvas_size), 'offset':list(offset)}
    manifest = {'source':'animals.png', 'sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'assets':assets}
    (ROOT / 'src/data/animal-art-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    sheet=Image.new('RGB',(780,500),'#294435'); draw=ImageDraw.Draw(sheet)
    for index,key in enumerate(regions):
        raw=Image.open(ART/'animals'/f'{key}.png');raw.thumbnail((100,70),Image.Resampling.NEAREST)
        x,y=(index%7)*110,(index//7)*85;sheet.paste(raw,(x,y),raw);draw.text((x,y+70),key,fill='#fff2cd')
    sheet.save(ROOT/'docs/screenshots/animal-cuts.jpg')
    print(f'Imported {len(assets)} lossless RGBA assets and nearest game copies.')

if __name__ == '__main__':
    run()
