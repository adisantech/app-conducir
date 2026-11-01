# Game checks and verified sign catalog

## Game interaction regressions

Run `node --test scripts/*.test.mjs` (Node 24) and `npm run build` from the repository root.
The interaction tests use Vite to load the public puzzle component and Memorice hook,
a test-only hook scheduler, and Node's mock timers; no new dependencies are required.
Quiz checks use the same scheduler to exercise selection, feedback, score, progression,
results and restart, including deterministic answer placement in all four positions.
These checks exercise handlers and output, not a real browser or React's DOM lifecycle.

Puzzle hints fill fixed answer positions that participate in validation. Letter buttons
fill the next empty position; Borrar removes the last non-hinted letter. A new puzzle
resets the hints and answer. Memorice cancels a pending mismatch on restart, category
or difficulty change, and unmount; ordinary mismatches still turn back after 900 ms.

## Quiz bank and provenance

The quiz has 20 questions. `src/data/quiz_questions.json` is the canonical bank,
imported by the quiz and read by `extract_content.py` when generating game seeds.
Keep `quiz.questions` synchronized in `src/data/games_seed.json` and
`data/processed/games_seed.json`; leave Memorice and puzzle data unchanged.

The five original questions are retained. Each of the 15 added questions includes
`source.path`, `source.line`, and a short `source.quote` from
`data/processed/chapters/` (chapters 2 and 5). These are learning questions based on
the local manual, not an official examination bank. Source lines refer to the current
extracted Markdown; update them if the extraction changes.

Alternatives are shuffled once per attempt, with the correct answer remapped to its
new position. Selection and rerenders preserve that order; restarting resets the
score and makes a fresh shuffle (which can coincidentally repeat an order).

Run `node --test scripts/quiz.test.mjs` for focused checks. This also checks the
chapter quotes, seed synchronization, and isolated seed generation, without running
PDF extraction or overwriting existing game data.

## Rebuild the verified sign catalog

Use the physical cells on manual pages 150–160, not the legacy image ordinals. The catalog retains all 196 cells, including repeated captions and temporary variants. Memorice draws images and matching names from this catalog, with no equivalent answer names within a deck (case, whitespace and spacing around hyphens are ignored); variants remain eligible between games.

## Quick path

From the repository root (Python 3, Poppler `pdftotext`, and ImageMagick `convert` required; no Pillow):

```sh
python3 scripts/build_sign_catalog.py
python3 scripts/test_sign_catalog.py
python3 scripts/build_sign_catalog.py --check
node --test scripts/memorice.test.mjs
./node_modules/.bin/tsc --noEmit
```

The builder also works from other working directories. `--help` describes its options. `--check` compares all generated outputs without writing, exits 0 with `Catalog verified: 196 signs.`, or exits 1 with differing paths on stderr. Tests use disposable system temporary directories.

## Provenance and regeneration

- Input: `resources/Libro-Conduccion.pdf` and `public/pages/page-150.jpg` through `page-160.jpg` (1020×1320).
- `build_sign_catalog.py` defines verified row/cell bounds. PDF word boxes are multiplied by 5/3 and assigned spatially to each caption compartment. Neither text-stream order nor caption deduplication determines membership.
- Crops exclude caption compartments, inset two pixels from the image compartment edges. Sign-internal lettering remains part of the sign.
- `data/raw/sign-catalog/catalog.json` records the PDF SHA-256, page/row/column, crop `[x,y,width,height]`, caption bounds `[left,top,right,bottom]`, exact caption words (whitespace joined), and corrected display caption. `layout.html` retains PDF word boxes.
- `legacy-ids.json` freezes the original page/name/ID associations, never image ordinals. First matching cells retain old IDs; other cells receive stable position IDs. Hyphen/space differences are ignored only for ID matching.
- Display-only corrections: MATENGA → MANTENGA, BUSEO → BUCEO, COPLEMENTARIO → COMPLEMENTARIO, CRUCE DE SAN ANDRÉS → CRUZ DE SAN ANDRÉS. Source captions remain unchanged.

Both `senales.json` copies and manifest totals are regenerated together. Other manifest fields remain intact. `extract_content.py` delegates sign extraction to the same builder and still returns records for game seeds; its other extraction stages are unchanged. Existing `public/signs/clean/` files are intentionally untouched and must not be used to infer sign identity.

## Visual verification

Automated checks establish coverage, synchronization and crop reproducibility, not the meaning of a diagram. Independently compare every generated image/name against its source cell, then check a live Memorice game. No timer, puzzle or layout redesign is included.
