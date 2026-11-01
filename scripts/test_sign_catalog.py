#!/usr/bin/env python3
"""Public catalog and generator regressions; no third-party Python packages."""
import collections
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


def load(path):
    return json.loads((ROOT / path).read_text())


class CatalogTests(unittest.TestCase):
    def test_full_catalog(self):
        signs = load('src/data/senales.json')
        self.assertEqual(len(signs), 196)
        self.assertEqual(signs, load('data/processed/senales.json'))
        self.assertEqual([sum(s['page'] == p for s in signs) for p in range(150, 161)],
                         [15, 25, 22, 20, 25, 25, 11, 12, 16, 11, 14])
        self.assertEqual(len({s['id'] for s in signs}), 196)
        self.assertEqual(len({s['sourceKey'] for s in signs}), 196)
        self.assertEqual(signs, load('data/raw/sign-catalog/catalog.json')['cells'])
        self.assertTrue({f'sig-{i:03d}' for i in range(1, 168)} <= {s['id'] for s in signs})
        for s in signs:
            source = s['source']
            key = f"p{s['page']}-r{source['row']}-c{source['column']}"
            self.assertEqual(s['sourceKey'], key)
            self.assertEqual(s['imageUrl'], f'/signs/catalog/{key}.png')
            self.assertEqual(source['page'], s['page'])
            self.assertTrue(source['caption'])
            self.assertEqual(source['displayCaption'], s['name'])
            x, y, width, height = source['crop']
            self.assertGreater(width, 0)
            self.assertGreater(height, 0)
            self.assertLessEqual(y + height, source['captionBounds'][1])
            image = ROOT / f"public{s['imageUrl']}"
            self.assertTrue(image.is_file(), str(image))
            expected = subprocess.check_output([
                'convert', str(ROOT / source['image']), '-crop',
                f'{width}x{height}+{x}+{y}', '+repage', '-strip', 'rgba:-'])
            actual = subprocess.check_output(['convert', str(image), 'rgba:-'])
            self.assertEqual(actual, expected, key)
        p156 = [s for s in signs if s['page'] == 156]
        self.assertEqual([s['category'] for s in p156],
                         ['Advertencia de Peligro'] * 3 + ['Informativas'] * 8)
        counts = collections.Counter(s['name'] for s in signs)
        self.assertGreater(counts['PROHIBIDO ESTACIONAR'], 1)
        self.assertGreater(counts['CRUCES BIFURCACIONES Y CONVERGENCIAS'], 1)
        for name in ['MANTENGA SU DERECHA', 'BUCEO', 'CRUZ DE SAN ANDRÉS',
                     'AUTOPISTA CON TELEVÍA O SISTEMA COMPLEMENTARIO']:
            self.assertIn(name, counts)
        for path in ['data/processed/manifest.json', 'src/data/manifest.json']:
            self.assertEqual(load(path)['total_signals'], 196)

    def test_stale_check_fails_without_repairing(self):
        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch)
            (root / 'scripts').mkdir()
            shutil.copyfile(ROOT / 'scripts/build_sign_catalog.py', root / 'scripts/build_sign_catalog.py')
            for folder in ['resources', 'public', 'data/raw/sign-catalog']:
                target = root / folder
                target.parent.mkdir(parents=True, exist_ok=True)
                target.symlink_to(ROOT / folder, target_is_directory=True)
            for folder in ['src/data', 'data/processed']:
                target = root / folder
                target.mkdir(parents=True)
                for name in ['senales.json', 'manifest.json']:
                    shutil.copyfile(ROOT / folder / name, target / name)
            stale = root / 'src/data/senales.json'
            stale.write_text('[]\n')
            before = {p: p.read_bytes() for p in root.glob('*/data/*.json')}
            result = subprocess.run([sys.executable, str(root / 'scripts/build_sign_catalog.py'),
                                     '--check'], capture_output=True, text=True)
            self.assertEqual(result.returncode, 1)
            self.assertEqual(result.stdout, '')
            self.assertEqual(result.stderr, 'Catalog differs: src/data/senales.json\n')
            self.assertEqual(stale.read_text(), '[]\n')
            self.assertEqual(before, {p: p.read_bytes() for p in before})

    def test_public_check_is_nonmutating(self):
        paths = [p for surface in ['data/raw/sign-catalog', 'public/signs/catalog',
                                  'src/data', 'data/processed']
                 for p in (ROOT / surface).rglob('*') if p.is_file()]
        before = {p: (p.stat().st_mtime_ns, hashlib.sha256(p.read_bytes()).digest())
                  for p in paths}
        with tempfile.TemporaryDirectory() as scratch:
            result = subprocess.run([sys.executable, str(ROOT / 'scripts/build_sign_catalog.py'),
                                     '--check'], cwd=scratch, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout, 'Catalog verified: 196 signs.\n')
        self.assertEqual(result.stderr, '')
        self.assertEqual(before, {p: (p.stat().st_mtime_ns,
                                     hashlib.sha256(p.read_bytes()).digest()) for p in paths})


if __name__ == '__main__':
    unittest.main()
