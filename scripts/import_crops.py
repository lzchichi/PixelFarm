"""Lossless crops from the user-provided crop sheet, with nearest pixel copies."""
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image, ImageDraw
from import_art import crop_asset

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'public/assets/art'
SOURCE = Path('D:/edge_download/图片/像素农作物生长与收获图鉴.png')


def run():
    for folder in ('source', 'crops', 'game/crops'):
        (ART / folder).mkdir(parents=True, exist_ok=True)
    shutil.copyfile(SOURCE, ART / 'source/crops.png')
    source = Image.open(ART / 'source/crops.png').convert('RGBA')
    # Each row has four growth states followed by the harvest product. Bounds
    # follow the empty gutters; do not split leaves into neighbouring crops.
    columns = [25, 265, 523, 810, 1140, source.width]
    rows = [0, 298, 565, 829, source.height]
    assets = {}
    for row, crop_id in enumerate(('turnip', 'potato', 'strawberry', 'pumpkin')):
        regions = []
        for column in range(5):
            crop, bounds = crop_asset(source, (columns[column], rows[row], columns[column + 1], rows[row + 1]))
            regions.append((crop, bounds))
        # One common scale per crop row preserves relative growth sizes. The
        # largest stage fits a single 32px plot; harvest icons fit 24px squares.
        scale = min(30 / max(crop.width for crop, _ in regions[:4]), 40 / max(crop.height for crop, _ in regions[:4]))
        for column, (crop, bounds) in enumerate(regions):
            key = f'{crop_id}-{column}' if column < 4 else f'{crop_id}-harvest'
            crop.save(ART / 'crops' / f'{key}.png')
            current_scale = scale if column < 4 else min(24 / crop.width, 24 / crop.height)
            size = tuple(max(1, round(value * current_scale)) for value in crop.size)
            crop.resize(size, Image.Resampling.NEAREST).save(ART / 'game/crops' / f'{key}.png')
            assets[key] = {'path': f'assets/art/game/crops/{key}.png', 'width': size[0], 'height': size[1],
                           'bounds': list(bounds), 'originalSize': list(crop.size), 'scale': current_scale}
    manifest = {'source': SOURCE.name, 'sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'assets': assets}
    (ROOT / 'src/data/crop-art-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    contact = Image.new('RGB', (700, 480), '#294435'); draw = ImageDraw.Draw(contact)
    for index, (key, asset) in enumerate(assets.items()):
        crop = Image.open(ART / 'crops' / f'{key}.png'); crop.thumbnail((115, 95), Image.Resampling.NEAREST)
        x, y = (index % 5) * 140, (index // 5) * 120
        contact.paste(crop, (x, y), crop); draw.text((x, y + 98), key, fill='#fff2cd')
    contact.save(ROOT / 'docs/screenshots/crop-cuts.jpg')
    print('Imported 16 growth stages and 4 harvest icons; native RGBA crops preserved.')


if __name__ == '__main__':
    run()
