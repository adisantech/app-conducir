#!/usr/bin/env python3
"""Build one sign per physical manual cell, never per stream position or label."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data/raw/sign-catalog'
GRIDS = {
    150: [(506,635,684,5),(714,840,905,5),(936,1062,1145,5)],
    151: [(142,269,351,5),(382,509,592,5),(622,750,800,5),(831,959,1010,5),(1038,1165,1229,5)],
    152: [(149,277,341,5),(371,499,550,5),(580,707,758,5),(787,914,994,5),(1024,1151,1232,2)],
    153: [(287,414,465,5),(495,623,707,5),(737,865,914,5),(945,1073,1123,5)],
    154: [(142,270,320,5),(351,479,529,5),(559,687,752,5),(779,907,957,5),(987,1115,1188,5)],
    155: [(142,270,335,5),(366,493,558,5),(590,718,768,5),(799,927,978,5),(1009,1137,1202,5)],
    156: [(142,270,320,3),(515,695,745,4),(776,931,981,4)],
    157: [(213,342,392,5),(422,550,600,5),(630,758,808,2)],
    158: [(188,316,381,5),(411,539,604,1),(735,863,914,5),(943,1071,1121,5)],
    159: [(142,270,320,5),(351,478,529,5),(559,687,737,1)],
    160: [(274,402,452,5),(482,610,660,5),(690,817,867,4)],
}
NS = {'x': 'http://www.w3.org/1999/xhtml'}


def corrected(caption):
    for old, new in [('MATENGA', 'MANTENGA'), ('BUSEO', 'BUCEO'),
                     ('COPLEMENTARIO', 'COMPLEMENTARIO'),
                     ('CRUCE DE SAN ANDRÉS', 'CRUZ DE SAN ANDRÉS')]:
        caption = caption.replace(old, new)
    return caption


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def category(page, row):
    if page <= 152:
        return 'Reglamentarias'
    if page <= 155 or (page == 156 and row == 1):
        return 'Advertencia de Peligro'
    return 'Transitorias' if page == 160 else 'Informativas'


def identity_name(name):
    # The old stream parser dropped a separator in sig-055; keep that ID too.
    return ' '.join(corrected(name).replace('-', ' ').split())


def records(layout, legacy):
    ids = {(s['page'], identity_name(s['name'])): s['id'] for s in legacy}
    used = set()
    result = []
    pages = ET.fromstring(layout).findall('.//x:page', NS)
    if len(pages) != 11:
        raise ValueError('Expected 11 source pages')
    for page, xml in zip(range(150, 161), pages):
        for row, (top, bottom, end, count) in enumerate(GRIDS[page], 1):
            wide = page == 156 and row > 1
            xs = ([82,303,524,741] if wide else
                  [80,254,430,606,784] if page == 159 else [80,257,434,611,788])
            width = 198 if wide else 154
            for col, x in enumerate(xs[:count], 1):
                lines = []
                bounds = []
                for line in xml.findall('.//x:line', NS):
                    words = []
                    for word in line.findall('x:word', NS):
                        box = [float(word.get(k)) * 5 / 3 for k in ('xMin','yMin','xMax','yMax')]
                        if x <= (box[0] + box[2]) / 2 < x + width and bottom <= box[1] < end:
                            words.append((box[0], word.text))
                            bounds.append(box)
                    if words:
                        lines.append((float(line.get('yMin')), ' '.join(w for _, w in sorted(words))))
                caption = ' '.join(text for _, text in sorted(lines))
                if not caption:
                    raise ValueError(f'Missing caption: {page}/{row}/{col}')
                key = f'p{page}-r{row}-c{col}'
                name = corrected(caption)
                old_id = ids.get((page, identity_name(name)))
                identifier = old_id if old_id and old_id not in used else f'sig-{key}'
                used.add(identifier)
                result.append({
                    'id': identifier, 'name': name, 'category': category(page, row),
                    'page': page, 'imageUrl': f'/signs/catalog/{key}.png', 'sourceKey': key,
                    'source': {'page': page, 'row': row, 'column': col,
                               'image': f'public/pages/page-{page}.jpg',
                               'crop': [x + 2, top + 2, width - 4, bottom - top - 4],
                               'captionBounds': [round(min(b[0] for b in bounds), 3),
                                                 round(min(b[1] for b in bounds), 3),
                                                 round(max(b[2] for b in bounds), 3),
                                                 round(max(b[3] for b in bounds), 3)],
                               'caption': caption, 'displayCaption': name},
                })
    return result


def crop(sign):
    source = sign['source']
    x, y, w, h = source['crop']
    return subprocess.check_output(['convert', str(ROOT / source['image']),
                                    '-crop', f'{w}x{h}+{x}+{y}', '+repage', '-strip', 'png:-'])


def build(check=False):
    pdf = ROOT / 'resources/Libro-Conduccion.pdf'
    layout = subprocess.check_output(['pdftotext', '-f', '150', '-l', '160',
                                      '-bbox-layout', str(pdf), '-'])
    legacy_path = RAW / 'legacy-ids.json'
    if legacy_path.exists():
        legacy = json.loads(legacy_path.read_text())
    elif check:
        raise ValueError('Missing legacy ID provenance')
    else:
        legacy = [{k: s[k] for k in ('id', 'page', 'name')}
                  for s in json.loads((ROOT / 'data/processed/senales.json').read_text())]
    signs = records(layout, legacy)
    outputs = {legacy_path: encoded(legacy), RAW / 'layout.html': layout,
               RAW / 'catalog.json': encoded({'pdf': 'resources/Libro-Conduccion.pdf',
                   'pdfSha256': hashlib.sha256(pdf.read_bytes()).hexdigest(),
                   'coordinateSpace': '1020x1320 pixels; PDF points multiplied by 5/3',
                   'cells': signs})}
    for folder in ['data/processed', 'src/data']:
        outputs[ROOT / folder / 'senales.json'] = encoded(signs)
        manifest = ROOT / folder / 'manifest.json'
        value = json.loads(manifest.read_text())
        value['total_signals'] = len(signs)
        outputs[manifest] = encoded(value)
    for sign in signs:
        outputs[ROOT / f"public{sign['imageUrl']}"] = crop(sign)
    stale = []
    for path, content in outputs.items():
        if check:
            if not path.exists() or path.read_bytes() != content:
                stale.append(str(path.relative_to(ROOT)))
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
    if stale:
        raise ValueError('Catalog differs: ' + ', '.join(stale))
    return signs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true',
                        help='verify catalogs, manifests, provenance and crops without writing')
    args = parser.parse_args()
    try:
        signs = build(check=args.check)
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        return 1
    print(f"Catalog {'verified' if args.check else 'built'}: {len(signs)} signs.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
