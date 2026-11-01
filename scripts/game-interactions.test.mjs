import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({
  server: { middlewareMode: true, watch: null }, appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [{
    name: 'handler-test-hooks', enforce: 'pre',
    transform(source, id) {
      if (!/\/(useMemorice|WordScrambleGame)\.tsx?$/.test(id)) return;
      return source.replace(/import (?:React, )?\{([^}]+)\} from 'react';/,
        (_, hooks) => `import React from 'react'; import {${hooks}} from '/scripts/fixtures/hook-harness.mjs';`);
    },
  }],
});
after(() => server.close());
const { mount } = await server.ssrLoadModule('/scripts/fixtures/hook-harness.mjs');
const { WordScrambleGame } = await server.ssrLoadModule('/src/components/games/puzzle/WordScrambleGame.tsx');
const { useMemorice } = await server.ssrLoadModule('/src/hooks/useMemorice.ts');

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (tree == null || typeof tree === 'boolean') return '';
  return typeof tree === 'object' ? text(tree.props?.children) : String(tree);
}
function click(host, label) {
  const button = nodes(host.render()).find(n => n.type === 'button' && text(n) === label);
  assert.ok(button, `button ${label} exists`);
  assert.ok(!button.props.disabled, `button ${label} is enabled`);
  button.props.onClick();
  return host.render();
}

// Exercise exported handlers and observable output, not component state slots.
test('puzzle hints populate the checked answer and deletion preserves hinted letters', () => {
  const host = mount(WordScrambleGame);
  try {
    click(host, 'Pista'); // A is now fixed in place.
    click(host, 'C');
    click(host, 'Borrar');
    assert.equal(nodes(host.render()).find(n => n.type === 'button' && text(n) === 'Borrar').props.disabled, true);
    for (const letter of 'CERA') click(host, letter);
    const result = click(host, 'Comprobar');
    assert.match(text(result), /¡Correcto! Siguiente/);
    assert.match(text(result), /Puntaje: 10/);
    const next = click(host, '¡Correcto! Siguiente');
    assert.match(text(next), /Palabra #2/);
    assert.doesNotMatch(text(next), /¡Correcto! Siguiente/);
  } finally { host.unmount(); }
});

test('puzzle hint replaces an incorrect occupied slot in the checked answer', () => {
  const host = mount(WordScrambleGame);
  try {
    for (const letter of 'CCERA') click(host, letter);
    click(host, 'Pista');
    assert.match(text(click(host, 'Comprobar')), /¡Correcto! Siguiente/);
  } finally { host.unmount(); }
});

test('puzzle still accepts an unassisted answer and rejects a wrong answer', () => {
  const host = mount(WordScrambleGame);
  try {
    click(host, 'C');
    assert.doesNotMatch(text(click(host, 'Comprobar')), /¡Correcto! Siguiente/);
    click(host, 'Borrar');
    for (const letter of 'ACERA') click(host, letter);
    assert.match(text(click(host, 'Comprobar')), /¡Correcto! Siguiente/);
  } finally { host.unmount(); }
});

function mismatch(host) {
  const first = host.render().cards[0];
  host.render().flipCard(first.id);
  const other = host.render().cards.find(c => c.pairId !== first.pairId);
  host.render().flipCard(other.id);
  return [first.id, other.id];
}

test('Memorice restart cancels old mismatch so a new flip survives its deadline', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const host = mount(() => useMemorice('senales', 'easy'));
  try {
    const [oldId] = mismatch(host);
    assert.equal(host.render().moves, 1);
    host.render().restart();
    assert.equal(host.render().moves, 0);
    assert.equal(host.render().matchedPairsCount, 0);
    assert.equal(host.render().seconds, 0);
    assert.ok(host.render().cards.every(c => !c.isFlipped && !c.isMatched));
    host.render().flipCard(oldId); // Stable IDs reproduce interference with a restarted deck.
    t.mock.timers.tick(900);
    assert.equal(host.render().cards.find(c => c.id === oldId).isFlipped, true);
    const mate = host.render().cards.find(c => c.id !== oldId && c.pairId === host.render().cards.find(c => c.id === oldId).pairId);
    host.render().flipCard(mate.id);
    assert.equal(host.render().matchedPairsCount, 1);
  } finally { host.unmount(); }
});

test('Memorice category and difficulty changes cancel the previous mismatch', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  let category = 'glosario';
  let difficulty = 'easy';
  const host = mount(() => useMemorice(category, difficulty));
  try {
    mismatch(host);
    category = 'senales';
    difficulty = 'hard';
    const deck = host.render();
    assert.equal(deck.totalPairs, 8);
    assert.equal(deck.cards.length, 16);
    assert.equal(deck.moves, 0);
    const id = deck.cards[0].id;
    deck.flipCard(id);
    t.mock.timers.tick(900);
    assert.equal(host.render().cards.find(c => c.id === id).isFlipped, true);
  } finally { host.unmount(); }
});

test('Memorice unmount clears the pending mismatch callback', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const clear = t.mock.method(globalThis, 'clearTimeout');
  const host = mount(() => useMemorice());
  mismatch(host);
  host.unmount();
  assert.ok(clear.mock.callCount() > 0);
});

test('Memorice normal mismatches wait 900ms and matched pairs remain matched', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const host = mount(() => useMemorice());
  try {
    mismatch(host);
    t.mock.timers.tick(899);
    assert.equal(host.render().cards.filter(c => c.isFlipped).length, 2);
    t.mock.timers.tick(1);
    assert.equal(host.render().cards.filter(c => c.isFlipped).length, 0);
    const first = host.render().cards[0];
    host.render().flipCard(first.id);
    host.render().flipCard(host.render().cards.find(c => c.id !== first.id && c.pairId === first.pairId).id);
    t.mock.timers.tick(1000);
    assert.equal(host.render().matchedPairsCount, 1);
    assert.equal(host.render().cards.filter(c => c.isMatched).length, 2);
    assert.equal(host.render().seconds, 1);
  } finally { host.unmount(); }
});
