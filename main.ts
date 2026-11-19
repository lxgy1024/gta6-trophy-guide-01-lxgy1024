// Leonida Nights — a gta6-trophy-guide-01 entry (Node 22, standard library
// only). The guide is this directory's app/ folder: plain static files a
// browser opens at app/index.html (ES modules, CSS, no build step), offline —
// it loads nothing over the network, and its trophy list and guides live in
// app/data/trophies.json. This program hands it in: it checks the entry
// against the gate's caps, copies app/ and screenshots/ from beside this file
// to /output, and writes /output/dossier.json, the summary the judge reads
// (your screenshots, the first load's files and bytes, and your source), with
// the vendored make.fun library. Leave vendor/makefun-frontend.ts as it is:
// the scorer requires dossier.json to be byte for byte what its own copy
// writes.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's caps (RULES.txt): screenshots at most 4, each at most 256 KiB;
// app/ at most 993 files and directories and 48 MiB in all. Refuse early
// with a clear error instead of handing in an entry the scorer would refuse.
const SHOT_MAX = 4;
const SHOT_MAX_BYTES = 262144;
const APP_MAX_FILES = 993;
const APP_MAX_BYTES = 50331648;

function fail(message) {
  throw new Error(`leonida-nights main.ts: ${message}`);
}

function walk(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (!st.isFile() && !st.isDirectory()) fail(`${path} is not a plain file or directory`);
    found.push(path);
    if (st.isDirectory()) found.push(...walk(path));
  }
  return found;
}

function checkTrophies() {
  const raw = readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8');
  const doc = JSON.parse(raw);
  const list = Array.isArray(doc) ? doc : doc.trophies;
  if (!Array.isArray(list) || list.length !== 55) {
    fail(`app/data/trophies.json must hold exactly 55 trophies, found ${Array.isArray(list) ? list.length : 'none'}`);
  }
  const grades = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of list) {
    if (typeof t.name !== 'string' || !t.name.trim()) fail('every trophy needs a name');
    if (typeof t.guide !== 'string' || !t.guide.trim()) fail(`trophy "${t.name}" needs a guide`);
    if (!(t.grade in grades)) fail(`trophy "${t.name}" has an unknown grade "${t.grade}"`);
    grades[t.grade] += 1;
  }
  if (grades.platinum !== 1 || grades.gold !== 2 || grades.silver !== 6 || grades.bronze !== 46) {
    fail(`expected 1 platinum, 2 gold, 6 silver, 46 bronze; found ${grades.platinum}, ${grades.gold}, ${grades.silver}, ${grades.bronze}`);
  }
}

function checkScreenshots() {
  const dir = join(here, 'screenshots');
  if (!existsSync(dir)) fail('screenshots/ is missing');
  const shots = readdirSync(dir).filter((n) => !n.startsWith('.'));
  if (shots.length < 3 || shots.length > SHOT_MAX) {
    fail(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
  }
  for (const name of shots) {
    const bytes = statSync(join(dir, name)).size;
    if (bytes > SHOT_MAX_BYTES) fail(`screenshots/${name} is ${bytes} bytes, over the 256 KiB cap`);
  }
}

function checkApp() {
  const entries = walk(join(here, 'app'));
  if (entries.length > APP_MAX_FILES) fail(`app/ has ${entries.length} files and directories, over the 993 cap`);
  let bytes = 0;
  for (const path of entries) {
    const st = statSync(path);
    if (st.isFile()) bytes += st.size;
  }
  if (bytes > APP_MAX_BYTES) fail(`app/ is ${bytes} bytes, over the 48 MiB cap`);
  if (!existsSync(join(here, 'app', 'index.html'))) fail('app/index.html is missing');
}

checkTrophies();
checkScreenshots();
checkApp();

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: SHOT_MAX, max_bytes: SHOT_MAX_BYTES }, app_max_files: APP_MAX_FILES, app_max_bytes: APP_MAX_BYTES }),
);
