"""Crop user PNG sheets; retain originals and lossless RGBA crops.

Only existing pixels are cropped, nearest-neighbour resized, mirrored or tiled.
No objects or terrain are painted or generated from descriptions.
"""
import argparse
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'public/assets/art'
SCALE = 3 / 8
# Calibrated against a 48px player, rather than the sheet's unrelated object sizes.
OBJECT_HEIGHTS = {
    'scarecrow': 64, 'fence': 40, 'fence-end': 40, 'gate': 44, 'post': 36,
    'sign': 48, 'crate': 36, 'crate-open': 36, 'barrel': 40, 'bucket': 28,
    'bench': 40, 'lantern': 64, 'bush-pink': 36, 'bush-white': 36,
    'bush-round': 36, 'flowers-white': 20, 'flowers-blue': 20, 'flowers-daisies': 20,
    'mushrooms-red': 24, 'mushrooms-brown': 24, 'mushrooms-gold': 24, 'mushrooms-white': 24,
}


def crop_asset(source, box):
    crop = source.crop(box)
    bounds = crop.getchannel('A').getbbox()
    if bounds is None:
        raise ValueError(f'Empty crop: {box}')
    absolute = (box[0] + bounds[0], box[1] + bounds[1], box[0] + bounds[2], box[1] + bounds[3])
    return source.crop(absolute), absolute


def seamless_tile(source):
    # A mirrored 2x2 repeat keeps the supplied texture pixels, with exactly
    # matching edges. Avoids the sheets' transparent rounded swatch borders.
    quarter = source.resize((16, 16), Image.Resampling.NEAREST)
    if quarter.getextrema()[3][0] < 240:
        raise ValueError('Terrain interior contains transparent pixels')
    # Supplied terrain interiors have alpha 249–253. Make only the prepared
    # ground repeat opaque; the original and lossless crops stay untouched.
    quarter.putalpha(255)
    result = Image.new('RGBA', (32, 32))
    result.paste(quarter, (0, 0))
    result.paste(ImageOps.mirror(quarter), (16, 0))
    result.paste(ImageOps.flip(quarter), (0, 16))
    result.paste(ImageOps.flip(ImageOps.mirror(quarter)), (16, 16))
    return result


def clean_neighbor_fragment(key, crop, bounds):
    result = crop.copy()
    if key not in ('dock', 'cattails-wide', 'tree-spring', 'tree-autumn', 'tree-oak'):
        return result
    pixels = result.load()
    # These two objects sit directly below water swatches. Preserve all wood /
    # reeds; remove only the measured foreign fragments at the top of the crop.
    for y in range(result.height):
        for x in range(result.width):
            sx, sy = bounds[0] + x, bounds[1] + y
            r, g, b, a = pixels[x, y]
            foreign = key == 'dock' and sx < 907 and sy < 838
            water = g > r + 8 and b > r + 8
            foreign = foreign or (key == 'dock' and sy < 840 and water)
            foreign = foreign or (key == 'cattails-wide' and sy < 844 and water)
            # The first three canopies meet on the sheet. Classify only narrow
            # border strips: orange pixels belong to the autumn tree, green to
            # its neighbours. Keep trunks and the ground foliage untouched.
            orange = r > 110 and r > g * 1.15
            green = g > r * 1.08
            foreign = foreign or (key == 'tree-spring' and sx > 440 and sy < 450 and orange)
            foreign = foreign or (key == 'tree-autumn' and (sx < 490 or sx > 822) and sy < 450 and green)
            foreign = foreign or (key == 'tree-oak' and sx < 884 and sy < 450 and orange)
            if foreign:
                pixels[x, y] = (r, g, b, 0)
    return result


# Measured rectangles in the supplied sheets; no blanket colour-key removal.
OBJECTS = {
    'vegetation': {
        'tree-spring': (0, 25, 465, 615), 'tree-autumn': (465, 50, 850, 612),
        'tree-oak': (850, 30, 1254, 628), 'tree-young': (90, 635, 363, 993),
        'tree-apple': (397, 615, 809, 1033), 'stump-moss': (843, 773, 1178, 1011),
        'bush-white': (16, 1000, 280, 1239), 'bush-pink': (290, 1023, 526, 1239),
        'flowers-white': (535, 1062, 718, 1239), 'flowers-blue': (728, 1065, 902, 1239),
        'log-moss': (904, 1040, 1247, 1239),
    },
    'buildings': {
        'cabin': (30, 38, 727, 626), 'barn': (729, 40, 1448, 638),
        'shed': (60, 629, 550, 1014), 'coop': (608, 645, 1049, 1035),
        'well': (1090, 684, 1386, 1032),
    },
    'decorations': {
        'fence': (16, 111, 344, 326), 'fence-end': (350, 114, 533, 329),
        'gate': (536, 85, 939, 334), 'post': (936, 112, 1055, 333), 'sign': (1067, 78, 1252, 336),
        'crate': (24, 400, 221, 648), 'crate-open': (245, 421, 424, 649),
        'barrel': (450, 393, 632, 652), 'bucket': (641, 462, 800, 652),
        'lantern': (800, 332, 1027, 662), 'scarecrow': (1026, 370, 1254, 763),
        'rock-large': (19, 654, 322, 857), 'rock-cluster': (345, 680, 587, 858),
        'rock-small': (610, 699, 861, 858), 'pebble': (887, 746, 1005, 846),
        'bench': (18, 857, 409, 1055), 'stump': (416, 884, 698, 1059),
        'log': (704, 882, 997, 1053), 'bush-round': (1001, 844, 1254, 1053),
        'mushrooms-red': (16, 1071, 238, 1240), 'mushrooms-brown': (237, 1075, 429, 1240),
        'mushrooms-gold': (434, 1070, 640, 1240), 'mushrooms-white': (645, 1080, 833, 1240),
        'flowers-daisies': (839, 1082, 1040, 1240), 'dirt-patch': (1040, 1070, 1254, 1240),
    },
    'water': {
        'reeds': (36, 830, 181, 1007), 'cattails': (192, 825, 387, 1027),
        'cattails-wide': (391, 827, 585, 1045), 'water-rocks': (605, 846, 810, 1044),
        'dock': (829, 779, 1247, 1063), 'pond-rock-large': (25, 1003, 327, 1241),
        'pond-rock': (345, 1031, 552, 1222), 'pond-stones': (573, 1055, 756, 1242),
        'water-lily': (795, 1071, 1056, 1242), 'pond-cattails': (1066, 1057, 1247, 1242),
    },
}


def run(source_dir):
    for directory in ('source', 'raw-crops', 'objects', 'terrain', 'game/objects', 'game/terrain'):
        (ART / directory).mkdir(parents=True, exist_ok=True)
    suffixes = {'vegetation': '26-1.png', 'buildings': '29-2.png', 'terrain': '31-3.png', 'water': '35-4.png', 'decorations': '47-5.png'}
    sources, images = {}, {}
    for category, suffix in suffixes.items():
        matches = list(source_dir.glob(f'*{suffix}'))
        if len(matches) != 1:
            raise ValueError(f'Expected one supplied PNG ending in {suffix}')
        path = matches[0]
        destination = ART / 'source' / f'{category}.png'
        shutil.copy2(path, destination)
        images[category] = Image.open(destination).convert('RGBA')
        sources[category] = {'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'size': list(images[category].size)}
    objects, crops = {}, []
    for category, definitions in OBJECTS.items():
        for key, box in definitions.items():
            crop, bounds = crop_asset(images[category], box)
            crop.save(ART / 'raw-crops' / f'{key}.png')
            crop = clean_neighbor_fragment(key, crop, bounds)
            crop.save(ART / 'objects' / f'{key}.png')
            scale = OBJECT_HEIGHTS.get(key, crop.height * SCALE) / crop.height
            game_size = tuple(max(1, round(value * scale)) for value in crop.size)
            crop.resize(game_size, Image.Resampling.NEAREST).save(ART / 'game/objects' / f'{key}.png')
            objects[key] = {'path': f'assets/art/game/objects/{key}.png', 'width': game_size[0], 'height': game_size[1], 'scale': scale, 'source': category, 'bounds': list(bounds), 'originalSize': list(crop.size), 'neighborCleanup': key in ('dock', 'cattails-wide', 'tree-spring', 'tree-autumn', 'tree-oak')}
            crops.append((key, crop))
    # Keep all 30 supplied terrain swatches independently, including transitions.
    xs = [25, 230, 430, 630, 830, 1029, 1240]
    ys = [62, 280, 494, 704, 938, 1144]
    for row in range(5):
        for col in range(6):
            crop, _ = crop_asset(images['terrain'], (xs[col], ys[row], xs[col + 1], ys[row + 1]))
            crop.save(ART / 'terrain' / f'swatch-{row}-{col}.png')
    # Preserve water / bank swatches separately before runtime preparation.
    water_boxes = [(32, 36, 218, 223), (220, 36, 400, 223), (401, 36, 586, 223),
                   (587, 27, 799, 218), (800, 27, 1012, 219), (1013, 28, 1230, 221),
                   (587, 220, 798, 407), (800, 221, 1012, 407), (1013, 221, 1230, 407),
                   (587, 409, 798, 601), (800, 409, 1012, 601), (1013, 409, 1230, 601),
                   (32, 224, 218, 407), (220, 224, 400, 407), (401, 224, 586, 407),
                   (32, 408, 218, 601), (220, 408, 400, 601), (401, 408, 586, 601),
                   (27, 602, 284, 834), (287, 602, 499, 834), (500, 602, 717, 834),
                   (732, 602, 961, 836), (980, 600, 1237, 796)]
    for index, box in enumerate(water_boxes):
        crop, _ = crop_asset(images['water'], box)
        crop.save(ART / 'terrain' / f'water-swatch-{index}.png')
    tiles = []
    def tile(name, bitmap, collides=False):
        bitmap.save(ART / 'game/terrain' / f'{name}.png')
        tiles.append({'name': name, 'path': f'assets/art/game/terrain/{name}.png', 'collides': collides})
    tile('grass', seamless_tile(images['terrain'].crop((62, 103, 190, 231))))
    tile('grass-flowers', seamless_tile(images['terrain'].crop((263, 103, 391, 231))))
    tile('farmland', seamless_tile(images['terrain'].crop((62, 537, 190, 665))))
    tile('dirt', seamless_tile(images['terrain'].crop((62, 325, 190, 453))))
    tile('water', seamless_tile(images['water'].crop((57, 69, 185, 197))), True)
    tile('stone', seamless_tile(images['terrain'].crop((62, 752, 190, 880))))
    # Shore pieces retain supplied rocks / grass / alpha. Fill gaps using only
    # cropped water pixels. Mirroring gives opposite banks with the same style.
    water_base = Image.open(ART / 'game/terrain/water.png').convert('RGBA')
    def bank(index):
        source, _ = crop_asset(images['water'], water_boxes[index])
        top = source.resize((32, 32), Image.Resampling.NEAREST)
        return Image.alpha_composite(water_base, top)
    north, west, nw, ne, sw, se = bank(3), bank(9), bank(6), bank(5), bank(10), bank(11)
    for name, bitmap in [('bank-n', north), ('bank-s', ImageOps.flip(north)), ('bank-w', west), ('bank-e', ImageOps.mirror(west)),
                         ('bank-nw', nw), ('bank-ne', ne), ('bank-sw', sw), ('bank-se', se)]:
        tile(name, bitmap, True)
    # End-to-end horizontal bank repeats prevent vertical seams in long banks.
    for entry in tiles[6:10]:
        bitmap = Image.open(ART / 'game/terrain' / f"{entry['name']}.png").convert('RGBA')
        if entry['name'] in ('bank-n', 'bank-s'):
            half = bitmap.crop((0, 0, 16, 32)); bitmap.paste(ImageOps.mirror(half), (16, 0))
        else:
            half = bitmap.crop((0, 0, 32, 16)); bitmap.paste(ImageOps.flip(half), (0, 16))
        bitmap.save(ART / 'game/terrain' / f"{entry['name']}.png")
    atlas = Image.new('RGBA', (32 * len(tiles), 32))
    for index, entry in enumerate(tiles):
        atlas.paste(Image.open(ART / 'game/terrain' / f"{entry['name']}.png"), (index * 32, 0))
    atlas.save(ART / 'game/terrain/farm-tiles.png')
    manifest = {'gridSize': 32, 'objectScale': SCALE, 'sources': sources, 'objects': objects, 'tiles': tiles}
    (ROOT / 'src/data/art-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    # Contact sheet is QA only; labels are never part of game art.
    contact = Image.new('RGB', (1000, ((len(crops) + 5) // 6) * 145), '#294435')
    draw = ImageDraw.Draw(contact)
    for index, (key, crop) in enumerate(crops):
        preview = crop.copy(); preview.thumbnail((150, 113), Image.Resampling.NEAREST)
        x, y = (index % 6) * 166, (index // 6) * 145
        contact.paste(preview, (x + (160 - preview.width) // 2, y), preview)
        draw.text((x + 4, y + 118), key, fill='#fff2cd')
    (ROOT / 'docs/screenshots').mkdir(parents=True, exist_ok=True)
    contact.save(ROOT / 'docs/screenshots/art-crops.jpg')
    print(f'Imported {len(objects)} objects, 30 terrain swatches, {len(water_boxes)} water swatches, {len(tiles)} runtime tiles; raw RGBA crops preserved.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', type=Path, default=Path('D:/edge_download/图片'))
    run(parser.parse_args().source_dir)
