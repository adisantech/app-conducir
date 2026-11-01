import assert from 'node:assert/strict';
import fs from 'node:fs';
import { after, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({
  server: { middlewareMode: true, watch: null },
  appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
});
after(() => server.close());
const { MemoriceCardView } = await server.ssrLoadModule(
  '/src/components/games/memorice/MemoriceCardView.tsx',
);

const { createMemoriceDeck } = await server.ssrLoadModule('/src/hooks/useMemorice.ts');

const card = {
  id: 'test-card',
  pairId: 'test-pair',
  content: 'PARE',
  type: 'sign',
  imageUrl: '/signs/catalog/p150-r1-c1.png',
  isFlipped: true,
  isMatched: false,
};

function render(overrides = {}) {
  return renderToStaticMarkup(
    React.createElement(MemoriceCardView, {
      card: { ...card, ...overrides },
      onClick: () => {},
    }),
  );
}

test('signal cards render the supplied image with an accessible name', () => {
  const html = render();
  assert.match(html, /<img\b[^>]*src="\/signs\/catalog\/p150-r1-c1\.png"/);
  assert.match(html, /<img\b[^>]*alt="PARE"/);
  assert.match(html, /object-contain/);
});

test('glossary term and definition cards still display text without images', () => {
  for (const type of ['term', 'definition']) {
    const html = render({ type, content: 'Texto del glosario', imageUrl: undefined });
    assert.match(html, /Texto del glosario/);
    assert.doesNotMatch(html, /<img\b/);
  }
});

test('the name paired with a signal remains readable text', () => {
  const html = render({ type: 'category', imageUrl: undefined });
  assert.match(html, />PARE<\/p>/);
  assert.doesNotMatch(html, /<img\b/);
});

test('signal decks have unique answers, paired images and all variants remain eligible', () => {
  const original = Math.random;
  let seed = 12345;
  Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const images = new Set();
  try {
    for (let run = 0; run < 1000; run++) {
      for (const [difficulty, count] of [['easy', 4], ['medium', 6], ['hard', 8]]) {
        const deck = createMemoriceDeck('senales', difficulty);
        assert.equal(deck.length, count * 2);
        const signs = deck.filter(c => c.type === 'sign');
        assert.equal(new Set(signs.map(c => c.content)).size, count);
        const answerKeys = signs.map(c => c.content.normalize('NFKC')
          .toLocaleUpperCase('es').replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim());
        assert.equal(new Set(answerKeys).size, count, `ambiguous ${difficulty} deck at run ${run}`);
        for (const sign of signs) {
          images.add(sign.imageUrl);
          const pair = deck.filter(c => c.pairId === sign.pairId);
          assert.equal(pair.length, 2);
          assert.equal(pair.find(c => c.type === 'category').content, sign.content);
        }
      }
    }
    assert.equal(images.size, 196);
  } finally { Math.random = original; }
});

test('glossary decks preserve compact definitions and difficulty pair counts', () => {
  for (const [difficulty, count] of [['easy', 4], ['medium', 6], ['hard', 8]]) {
    const deck = createMemoriceDeck('glosario', difficulty);
    assert.equal(deck.length, count * 2);
    assert.equal(new Set(deck.map(c => c.pairId)).size, count);
    assert.equal(deck.filter(c => c.type === 'term').length, count);
    assert.equal(deck.filter(c => c.type === 'definition').length, count);
    assert.ok(deck.every(c => !c.imageUrl && !c.isFlipped && !c.isMatched));
    assert.ok(deck.filter(c => c.type === 'definition').every(c => c.content.length <= 150));
  }
});

test('every signal image referenced by the dataset exists', () => {
  const signs = JSON.parse(fs.readFileSync('src/data/senales.json', 'utf8'));
  assert.ok(signs.length > 0);
  for (const sign of signs) {
    assert.ok(fs.existsSync(`public${sign.imageUrl}`), sign.imageUrl);
  }
});
