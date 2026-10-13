"""Prepare supplied PNG pixels only; preserve originals and raw RGBA crops.

96px original texture patches reduce tiny 32px repeats. Each patch is split
into nine Tiled tiles; adjoining patches have identical opposite edges.
Run before generate-test-map.mjs. No drawing or external images are used.
"""
import json
from pathlib import Path
from PIL import Image, ImageOps, ImageChops

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'public/assets/art'
manifest_path = ROOT / 'src/data/art-manifest.json'
art = json.loads(manifest_path.read_text(encoding='utf-8'))
heights = {'tree-spring':176, 'tree-oak':176, 'tree-autumn':176,
           'tree-young':104, 'tree-apple':136, 'scarecrow':56,
           'fence':32, 'fence-end':32, 'gate':36, 'post':30,
           'rock-large':56, 'rock-cluster':44, 'rock-small':32,
           'stump-moss':48, 'log-moss':40, 'stump':40, 'log':32}
for key, height in heights.items():
    a = art['objects'][key]
    source = Image.open(ART / 'objects' / f'{key}.png').convert('RGBA')
    size = (round(source.width * height / source.height), height)
    source.resize(size, Image.Resampling.NEAREST).save(ROOT / 'public' / a['path'])
    a.update(width=size[0], height=size[1], scale=height/source.height)

# Update existing map display sizes while retaining existing solid footprints
# and interaction positions. The farm generator recalculates its own props.
for name in ('farm', 'town'):
    path = ROOT / f'public/assets/maps/{name}.json'
    m = json.loads(path.read_text(encoding='utf-8'))
    for layer in m['layers']:
        if layer['name'] != 'Scenery': continue
        for obj in layer['objects']:
            props = {p['name']:p['value'] for p in obj.get('properties', [])}
            key = props.get('asset')
            if key not in heights: continue
            a = art['objects'][key]
            dx, dy = obj['width']-a['width'], obj['height']-a['height']
            obj['x'] += round(dx/2); obj['y'] += dy
            obj['width'], obj['height'] = a['width'], a['height']
            for p in obj['properties']:
                if p['name'] == 'depthAnchor': p['value'] = min(a['height'], max(0,p['value']-dy))
    path.write_text(json.dumps(m,ensure_ascii=False)+'\n', encoding='utf-8')

art['tiles'] = art['tiles'][:14] # Stable original GIDs; repeatable preparation.
source = Image.open(ART / 'source/terrain.png').convert('RGBA')
patches = [('meadow',(62,103,190,231),'grass'),
           ('meadow-flowers',(263,103,391,231),'grass'),
           ('meadow-tufts',(462,103,590,231),'grass'),
           ('earth',(62,325,190,453),'dirt')]
def wrap_edges(bitmap):
    original=bitmap.copy()
    for k in range(8):
        weight=(8-k)/16
        for i in range(96):
            a=original.getpixel((k,i));b=original.getpixel((95-k,i))
            bitmap.putpixel((k,i),tuple(round(a[c]*(1-weight)+b[c]*weight) for c in range(4)))
            bitmap.putpixel((95-k,i),tuple(round(b[c]*(1-weight)+a[c]*weight) for c in range(4)))
    original=bitmap.copy()
    for k in range(8):
        weight=(8-k)/16
        for i in range(96):
            a=original.getpixel((i,k));b=original.getpixel((i,95-k))
            bitmap.putpixel((i,k),tuple(round(a[c]*(1-weight)+b[c]*weight) for c in range(4)))
            bitmap.putpixel((i,95-k),tuple(round(b[c]*(1-weight)+a[c]*weight) for c in range(4)))
    return bitmap
common_grass=source.crop(patches[0][1]).resize((96,96),Image.Resampling.NEAREST);common_grass.putalpha(255)
common_grass=wrap_edges(common_grass)
for name, bounds, terrain in patches:
    patch = source.crop(bounds).resize((96,96), Image.Resampling.NEAREST)
    if patch.getextrema()[3][0] < 240: raise ValueError('Nonopaque terrain interior')
    patch.putalpha(255)
    # Ground-only edge feathering removes hard lines without mirroring details.
    # Raw swatches remain unchanged. Grass variants share the same outer edge.
    patch=wrap_edges(patch)
    if terrain=='grass':
        for y in range(96):
            for x in range(96):
                d=min(x,y,95-x,95-y)
                if d>=8: continue
                w=d/8;a=patch.getpixel((x,y));b=common_grass.getpixel((x,y))
                patch.putpixel((x,y),tuple(round(a[c]*w+b[c]*(1-w)) for c in range(4)))
    for row in range(3):
        for col in range(3):
            key=f'{name}-{col}-{row}'
            path=f'assets/art/game/terrain/{key}.png'
            patch.crop((col*32,row*32,col*32+32,row*32+32)).save(ROOT/'public'/path)
            art['tiles'].append({'name':key,'path':path,'collides':False,'terrain':terrain,
                                 'sourceBounds':list(bounds),'patch':[col,row]})
# Extract the grass silhouette from the supplied north-facing transition.
# Apply that mask to the original large grass/earth patch pixels. This avoids
# repeating the rounded outline of a stand-alone swatch around every road cell.
swatch=Image.open(ART/'terrain/swatch-4-1.png').convert('RGBA').resize((32,32),Image.Resampling.NEAREST)
north=Image.new('L',(32,32))
for y in range(8):
    for x in range(32):
        r,g,b,a=swatch.getpixel((x,y))
        if y==0 or (g>r*1.05 and a>128): north.putpixel((x,y),255)
edges=[north,north.transpose(Image.Transpose.ROTATE_270),north.transpose(Image.Transpose.ROTATE_180),north.transpose(Image.Transpose.ROTATE_90)]
for adjacency in range(1,16):
    mask=Image.new('L',(32,32))
    for bit,edge in enumerate(edges):
        if adjacency & (1<<bit): mask=ImageChops.lighter(mask,edge)
    for row in range(3):
        for col in range(3):
            base=Image.open(ART/f'game/terrain/earth-{col}-{row}.png').convert('RGBA')
            grass=Image.open(ART/f'game/terrain/meadow-{col}-{row}.png').convert('RGBA')
            bitmap=Image.composite(grass,base,mask)
            key=f'grass-earth-edge-{adjacency}-{col}-{row}'; path=f'assets/art/game/terrain/{key}.png'
            bitmap.save(ROOT/'public'/path)
            art['tiles'].append({'name':key,'path':path,'collides':False,'terrain':'dirt', 'sourceSwatch':'swatch-4-1','adjacency':adjacency,'patch':[col,row]})
atlas=Image.new('RGBA',(32*len(art['tiles']),32))
for i,t in enumerate(art['tiles']): atlas.paste(Image.open(ROOT/'public'/t['path']),(i*32,0))
atlas.save(ART/'game/terrain/farm-tiles.png')
manifest_path.write_text(json.dumps(art,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# Town uses same expanded atlas, while keeping its own 60×40 geometry.
path=ROOT/'public/assets/maps/town.json'; m=json.loads(path.read_text(encoding='utf-8'))
t=m['tilesets'][0];t.update(tilecount=len(art['tiles']),columns=len(art['tiles']),imagewidth=32*len(art['tiles']))
t['tiles']=[{'id':i,'properties':[{'name':'collides','type':'bool','value':a['collides']}]} for i,a in enumerate(art['tiles'])]
path.write_text(json.dumps(m,ensure_ascii=False)+'\n',encoding='utf-8')
print(f'Prepared {len(art["tiles"])} tiles and calibrated {len(heights)} objects from archived PNGs.')
