import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const seed = JSON.parse(await readFile(new URL('../src/data/games_seed.json', import.meta.url)));
const server = await createServer({
  server: { middlewareMode: true, watch: null }, appType: 'custom',
  optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [{
    name: 'quiz-test-hooks', enforce: 'pre',
    transform(source, id) {
      if (!id.endsWith('/QuizGame.tsx')) return;
      return source.replace("import React, { useState } from 'react';",
        "import React from 'react'; import { useState } from '/scripts/fixtures/hook-harness.mjs';");
    },
  }],
});
after(() => server.close());
const { mount } = await server.ssrLoadModule('/scripts/fixtures/hook-harness.mjs');
const { QuizGame } = await server.ssrLoadModule('/src/components/games/quiz/QuizGame.tsx');

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
const buttons = host => nodes(host.render()).filter(n => n.type === 'button');
const options = host => buttons(host).filter(n => typeof n.props.children?.[0]?.props?.children === 'string' && /^[A-D]$/.test(n.props.children[0].props.children));
const optionText = host => options(host).map(n => text(n.props.children[1]));
function click(host, label) {
  const button = buttons(host).find(n => text(n) === label);
  assert.ok(button, `button ${label} exists`);
  assert.ok(!button.props.disabled);
  button.props.onClick();
  return host.render();
}

// Every position must preserve the correct answer's identity after shuffling.
for (const position of [0, 1, 2, 3]) {
  test(`options can place the correct answer at ${position} and remain stable`, t => {
    let call = 0;
    const draws = [3, 2, 1].map(i => i === position || (position === 3 && i === 3) ? 0 : 0.999);
    if (position === 0) draws.fill(0.999);
    t.mock.method(Math, 'random', () => draws[call++ % 3]);
    const host = mount(QuizGame);
    try {
      const original = seed.quiz.questions[0];
      const before = optionText(host);
      assert.deepEqual([...before].sort(), [...original.options].sort());
      assert.equal(before[position], original.options[original.answer_index]);
      assert.deepEqual(optionText(host), before);
      options(host)[position].props.onClick();
      assert.match(text(host.render()), /Aciertos: 1/);
      assert.match(text(host.render()), new RegExp(original.explanation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.deepEqual(optionText(host), before);
      assert.ok(options(host).every(n => n.props.disabled));
      options(host)[position].props.onClick();
      assert.match(text(host.render()), /Aciertos: 1/);
    } finally { host.unmount(); }
  });
}

test('twenty unique source-backed questions stay synchronized with both seeds and extraction', async () => {
  const bank = JSON.parse(await readFile(new URL('../src/data/quiz_questions.json', import.meta.url)));
  assert.equal(bank.length, 20);
  assert.equal(new Set(bank.map(q => q.id)).size, 20);
  assert.deepEqual(seed.quiz.questions, bank);
  const processed = JSON.parse(await readFile(new URL('../data/processed/games_seed.json', import.meta.url)));
  assert.deepEqual(processed.quiz.questions, bank);
  for (const q of bank) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(Number.isInteger(q.answer_index) && q.answer_index >= 0 && q.answer_index < 4);
    assert.ok(q.question && q.explanation && q.chapter >= 1 && q.chapter <= 9);
    if (Number(q.id.slice(2)) <= 5) continue; // Existing questions retained unchanged.
    assert.equal(q.source.path, `data/processed/chapters/cap-${q.chapter}.md`);
    const chapter = await readFile(new URL(`../${q.source.path}`, import.meta.url), 'utf8');
    const normalize = value => value.replace(/\s+/g, ' ').trim();
    assert.ok(normalize(chapter).includes(normalize(q.source.quote)), `${q.id}: quote exists in chapter`);
    assert.ok(chapter.split('\n')[q.source.line - 1].includes(q.source.quote.split(/\s+/)[0]), `${q.id}: source line points to quote`);
  }
  // Exercise only the public seed generator, with disposable output inside the project.
  const output = execFileSync('python3', ['-c', `
import contextlib, importlib.util, io, json, tempfile
from pathlib import Path
spec = importlib.util.spec_from_file_location('extract_content', 'scripts/extract_content.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
with tempfile.TemporaryDirectory(prefix='.quiz-check-', dir='scripts') as directory:
    module.PROCESSED_DIR = Path(directory)
    with contextlib.redirect_stdout(io.StringIO()):
        result = module.generate_games_seed([], [])
    assert result['memorice'] == {'concept_cards': [], 'signal_cards': []}
    assert result['puzzle'] == {'words': []}
    assert json.loads((Path(directory) / 'games_seed.json').read_text()) == result
    print(json.dumps(result['quiz']['questions']))
`], { encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), bank);
});

test('wrong answer, progression, results and restart retain their behavior with a fresh shuffle', t => {
  t.mock.method(Math, 'random', () => 0.999);
  const host = mount(QuizGame);
  try {
    const initial = optionText(host);
    options(host)[1].props.onClick();
    assert.match(text(host.render()), /Aciertos: 0/);
    assert.ok(options(host).every(n => n.props.disabled));
    for (let i = 1; i < 20; i++) {
      click(host, 'Siguiente Pregunta');
      assert.match(text(host.render()), new RegExp(`Pregunta ${i + 1} de 20`));
      assert.ok(options(host).every(n => !n.props.disabled));
      assert.doesNotMatch(text(host.render()), /Fundamento normativo:/);
      const q = seed.quiz.questions[i];
      const answer = optionText(host).indexOf(q.options[q.answer_index]);
      options(host)[answer].props.onClick();
      host.render();
    }
    const results = text(click(host, 'Ver Resultados'));
    assert.match(results, /19 de 20 correctas \(95%\)/);
    assert.match(results, /¡Aprobaste el Test Teórico!/);
    t.mock.method(Math, 'random', () => 0);
    const restarted = text(click(host, 'Reiniciar Test'));
    assert.match(restarted, /Pregunta 1 de 20/);
    assert.match(restarted, /Aciertos: 0/);
    assert.doesNotMatch(restarted, /Fundamento normativo:/);
    assert.ok(options(host).every(n => !n.props.disabled));
    assert.notDeepEqual(optionText(host), initial);
    assert.deepEqual(seed.quiz.questions[0].options, initial); // Never mutate the imported bank.
  } finally { host.unmount(); }
});
