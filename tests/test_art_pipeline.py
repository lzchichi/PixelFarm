import sys
import unittest
import json
import hashlib
from pathlib import Path
from PIL import Image, ImageChops

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from import_art import crop_asset, seamless_tile


class ArtPipelineTests(unittest.TestCase):
    def test_large_terrain_patches_preserve_source_pixels_and_matching_outer_edges(self):
        root = Path(__file__).resolve().parents[1]
        art = json.loads((root / 'src/data/art-manifest.json').read_text(encoding='utf-8'))
        source = Image.open(root / 'public/assets/art/source/terrain.png').convert('RGBA')
        from PIL import ImageOps
        for prefix in ('meadow', 'meadow-flowers', 'meadow-tufts', 'earth'):
            entries = [t for t in art['tiles'] if t['name'].rsplit('-',2)[0] == prefix and 'sourceBounds' in t]
            self.assertEqual(len(entries), 9)
            assembled = Image.new('RGBA', (96,96))
            for t in entries:
                col,row=t['patch']; assembled.paste(Image.open(root / 'public' / t['path']),(col*32,row*32))
            expected=source.crop(entries[0]['sourceBounds']).resize((96,96),Image.Resampling.NEAREST);expected.putalpha(255)
            # Original interior remains untouched; eight-pixel feathered
            # borders are the documented seamless preparation area.
            self.assertEqual(assembled.crop((8,8,88,88)).tobytes(),expected.crop((8,8,88,88)).tobytes())
            for i in range(96):
                self.assertEqual(assembled.getpixel((i,0)),assembled.getpixel((i,95)))
                self.assertEqual(assembled.getpixel((0,i)),assembled.getpixel((95,i)))
        for t in art['tiles']:
            image=Image.open(root / 'public' / t['path']).convert('RGBA')
            self.assertEqual(image.size,(32,32))
            self.assertEqual(image.getextrema()[3],(255,255))

    def test_animal_crops_and_foot_aligned_game_copies_preserve_rgba(self):
        root = Path(__file__).resolve().parents[1]
        manifest = json.loads((root / 'src/data/animal-art-manifest.json').read_text(encoding='utf-8'))
        path = root / 'public/assets/art/source/animals.png'
        self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), manifest['sha256'])
        source = Image.open(path).convert('RGBA')
        self.assertEqual(len(manifest['assets']), 39)
        for key, asset in manifest['assets'].items():
            raw = Image.open(root / 'public/assets/art/animals' / f'{key}.png').convert('RGBA')
            self.assertEqual(raw.tobytes(), source.crop(asset['bounds']).tobytes())
            expected = Image.new('RGBA', asset['canvasSize'])
            expected.paste(raw.resize(asset['scaledSize'], Image.Resampling.NEAREST), tuple(asset['offset']))
            runtime = Image.open(root / 'public' / asset['path']).convert('RGBA')
            self.assertEqual(runtime.tobytes(), expected.tobytes())

    def test_villager_direction_frames_and_portraits_preserve_source_pixels(self):
        root = Path(__file__).resolve().parents[1]
        manifest = json.loads((root / 'src/data/town-art-manifest.json').read_text(encoding='utf-8'))
        source_path = root / 'public/assets/art/source/village.png'
        self.assertEqual(hashlib.sha256(source_path.read_bytes()).hexdigest(), manifest['source']['sha256'])
        source = Image.open(source_path).convert('RGBA')
        self.assertEqual(len(manifest['npcs']), 3)
        for npc, entry in manifest['npcs'].items():
            self.assertEqual(set(entry['frames']), {'down', 'left', 'right', 'up'})
            for direction, path in entry['frames'].items():
                raw = Image.open(root / 'public/assets/art/objects/town' / f'{npc}-{direction}.png').convert('RGBA')
                self.assertEqual(raw.tobytes(), source.crop(entry['frameBounds'][direction]).tobytes())
                game = Image.open(root / 'public' / path).convert('RGBA')
                self.assertEqual(game.size, (32, 48))
                self.assertEqual(game.tobytes(), raw.resize(game.size, Image.Resampling.NEAREST).tobytes())
            portrait = Image.open(root / 'public/assets/art/raw-crops' / f'{npc}-portrait.png').convert('RGBA')
            self.assertEqual(portrait.tobytes(), source.crop(entry['portraitBounds']).tobytes())

    def test_crop_keeps_source_rgba_pixels_and_transparent_detail(self):
        source = Image.new('RGBA', (8, 8), (7, 9, 11, 0))
        source.putpixel((3, 2), (90, 140, 60, 127))
        source.putpixel((4, 5), (60, 40, 20, 255))
        result, bounds = crop_asset(source, (1, 1, 7, 7))
        self.assertEqual(bounds, (3, 2, 5, 6))
        self.assertEqual(result.tobytes(), source.crop(bounds).tobytes())
        self.assertEqual(result.getpixel((0, 0)), (90, 140, 60, 127))
        self.assertEqual(result.getpixel((1, 0))[3], 0)

    def test_repeating_terrain_has_matching_edges_without_alpha_holes(self):
        source = Image.new('RGBA', (64, 64))
        source.putdata([(x * 3, y * 3, 40, 255) for y in range(64) for x in range(64)])
        tile = seamless_tile(source)
        self.assertEqual(tile.size, (32, 32))
        self.assertEqual(tile.getextrema()[3], (255, 255))
        for i in range(32):
            self.assertEqual(tile.getpixel((i, 0)), tile.getpixel((i, 31)))
            self.assertEqual(tile.getpixel((0, i)), tile.getpixel((31, i)))

    def test_real_crops_preserve_every_rgba_pixel_and_source_hash(self):
        root = Path(__file__).resolve().parents[1]
        manifest = json.loads((root / 'src/data/art-manifest.json').read_text(encoding='utf-8'))
        sources = {}
        for category, entry in manifest['sources'].items():
            path = root / 'public/assets/art/source' / f'{category}.png'
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), entry['sha256'])
            sources[category] = Image.open(path).convert('RGBA')
        for key, entry in manifest['objects'].items():
            with self.subTest(asset=key):
                expected = sources[entry['source']].crop(entry['bounds'])
                raw = Image.open(root / 'public/assets/art/raw-crops' / f'{key}.png').convert('RGBA')
                self.assertEqual(raw.tobytes(), expected.tobytes())
                crop = Image.open(root / 'public/assets/art/objects' / f'{key}.png').convert('RGBA')
                if not entry['neighborCleanup']:
                    self.assertEqual(crop.tobytes(), raw.tobytes())
                else:
                    # Cleanup only changes foreign alpha; every RGB/detail pixel
                    # stays identical to source, and differences stay at the top.
                    self.assertEqual(crop.convert('RGB').tobytes(), raw.convert('RGB').tobytes())
                    diff = ImageChops.difference(crop.getchannel('A'), raw.getchannel('A')).getbbox()
                    self.assertIsNotNone(diff)
                    limit = entry['bounds'][3] if entry.get('foregroundMask') else 450 if key.startswith('tree-') else 844
                    self.assertLessEqual(diff[3] + entry['bounds'][1], limit)
                    if entry.get('foregroundMask'):
                        from PIL import ImageDraw
                        mask = Image.new('L', raw.size, 0)
                        ImageDraw.Draw(mask).polygon([tuple(p) for p in entry['foregroundMask']], fill=255)
                        expected_alpha = raw.getchannel('A')
                        expected_alpha.paste(0, mask=mask.point(lambda a: 255-a))
                        self.assertEqual(crop.getchannel('A').tobytes(), expected_alpha.tobytes())
                self.assertEqual(crop.getextrema()[3][0], 0)
                runtime = Image.open(root / 'public' / entry['path']).convert('RGBA')
                self.assertEqual(runtime.size, (entry['width'], entry['height']))
                self.assertEqual(runtime.tobytes(), crop.resize(runtime.size, Image.Resampling.NEAREST).tobytes())

    def test_dock_neighbor_removed_without_erasing_wood(self):
        root = Path(__file__).resolve().parents[1]
        manifest = json.loads((root / 'src/data/art-manifest.json').read_text(encoding='utf-8'))
        entry = manifest['objects']['dock']; x, y = entry['bounds'][:2]
        clean = Image.open(root / 'public/assets/art/objects/dock.png').convert('RGBA')
        raw = Image.open(root / 'public/assets/art/raw-crops/dock.png').convert('RGBA')
        self.assertEqual(clean.getpixel((850 - x, 805 - y))[3], 0)
        self.assertEqual(clean.getpixel((950 - x, 812 - y)), raw.getpixel((950 - x, 812 - y)))

    def test_calibrated_decoration_proportions_and_lossless_crop_sheet(self):
        root = Path(__file__).resolve().parents[1]
        art = json.loads((root / 'src/data/art-manifest.json').read_text(encoding='utf-8'))
        self.assertEqual(art['objects']['scarecrow']['height'], 56)
        self.assertEqual(art['objects']['fence']['height'], 32)
        manifest = json.loads((root / 'src/data/crop-art-manifest.json').read_text(encoding='utf-8'))
        source_path = root / 'public/assets/art/source/crops.png'
        self.assertEqual(hashlib.sha256(source_path.read_bytes()).hexdigest(), manifest['sha256'])
        source = Image.open(source_path).convert('RGBA')
        self.assertEqual(len(manifest['assets']), 20)
        for key, asset in manifest['assets'].items():
            raw = Image.open(root / 'public/assets/art/crops' / f'{key}.png').convert('RGBA')
            self.assertEqual(raw.tobytes(), source.crop(asset['bounds']).tobytes())
            game = Image.open(root / 'public' / asset['path']).convert('RGBA')
            self.assertEqual(game.tobytes(), raw.resize(game.size, Image.Resampling.NEAREST).tobytes())
            self.assertLessEqual(game.width, 30)
            self.assertLessEqual(game.height, 40)


if __name__ == '__main__':
    unittest.main()
