// Leonida Platinum Guide — GTA VI trophy tracker.
// Everything is local: the trophy list comes from data/trophies.json, progress
// lives in this browser's localStorage, and the app makes no network requests
// of its own. State shape: { earned: [trophy ids], notes: {id: text},
// spoiler: true|false } under one localStorage key.

const STORE_KEY = 'leonida-platinum-progress-v1';
const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const KIND_LABEL = {
  story: 'Story', side: 'Side missions', activity: 'Activities', collectible: 'Collectibles',
  combat: 'Combat & heists', exploration: 'Exploration', money: 'Money', misc: 'Secrets & misc',
  platinum: 'Platinum', completion: '100% completion',
};
const MISSABLE_LABEL = { yes: 'Missable', maybe: 'Possibly missable', no: '' };

const STAGES = [
  { n: 1, title: 'Story first', text: 'Play the campaign in order, Chapters 1–4 and the final mission. Do the partner trophies (Hot Together, Retail Therapy), the choice trophy (Actions Speak Louder) and the one-time airport moment (Catch Me If You Can) while the chances are in front of you — they may not come back. Finish the named story missions on your first attempt, since mission replay is unconfirmed.' },
  { n: 2, title: 'Side missions', text: 'Finish the mission strands for Andy, Kenton, Billy, Randy and Tyrone, hunt the unique animal for Bret, and complete 8 stranger strands across Leonida. Strands unlock as the story advances, so check back with each contact between chapters.' },
  { n: 3, title: 'Activities', text: 'Work through the grind and skill trophies: 250 stunts, gold medals in all 42 Shooting Range challenges, 20 different race wins, drone races at every location, fishing against Cal, one arcade game, bowling at Kolt & Associates, 50 challenges, and the combat trophies — 5 takedowns in one Combat Focus, the Rhino, the jewelry store, bank vaults, armored trucks, gang operations and the melee drive-by.' },
  { n: 4, title: 'Collectibles & exploration', text: 'Meditate at every spot, complete 3 collectible card sets, WAiNK It at 100 locations, discover 100 vehicles, explore all of Leonida, and have the cocktail with a view on Ocean Beach. Do these region by region so nothing is left behind.' },
  { n: 5, title: 'Money & cleanup', text: 'Launder $250,000 of Marked Bills, spend $100,000 across all shops, buy every garage property and register 10 vehicles to the Scooter Bros app. Then the two golds fall into place: 100% completion, and with it the platinum.' },
];

const $ = (id) => document.getElementById(id);
const els = {
  cards: $('trophyCards'), detail: $('detailCol'), meta: $('listMeta'),
  earnedNum: $('earnedNum'), fill: $('progressFill'), detail2: $('progressDetail'),
  gradeLine: $('gradeLine'), search: $('searchBox'), kind: $('kindSel'),
  grade: $('gradeSel'), status: $('statusSel'), missOnly: $('missableOnly'),
  spoiler: $('spoilerHide'),
};

let data = null;
let state = loadState();
let selectedId = null;
let view = 'checklist';

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { earned: [], notes: {}, spoiler: false };
    const parsed = JSON.parse(raw);
    return {
      earned: Array.isArray(parsed.earned) ? parsed.earned.filter((x) => Number.isInteger(x)) : [],
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      spoiler: Boolean(parsed.spoiler),
    };
  } catch {
    return { earned: [], notes: {}, spoiler: false };
  }
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

const earnedSet = () => new Set(state.earned);
const isEarned = (t) => earnedSet().has(t.id);
const isStory = (t) => t.kind === 'story';
const hiddenBySpoiler = (t) => state.spoiler && isStory(t) && !isEarned(t);

function trophyById(id) { return data.trophies.find((t) => t.id === id); }

function filteredTrophies() {
  const q = els.search.value.trim().toLowerCase();
  return data.trophies.filter((t) => {
    if (els.kind.value !== 'all' && t.kind !== els.kind.value) return false;
    if (els.grade.value !== 'all' && t.grade !== els.grade.value) return false;
    if (els.status.value === 'earned' && !isEarned(t)) return false;
    if (els.status.value === 'unearned' && isEarned(t)) return false;
    if (els.missOnly.checked && t.missable === 'no') return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))) return false;
    return true;
  });
}

function gradeCounts() {
  const out = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  const total = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of data.trophies) {
    total[t.grade] += 1;
    if (isEarned(t)) out[t.grade] += 1;
  }
  return { out, total };
}

function renderProgress() {
  const n = state.earned.length;
  const total = data.trophies.length;
  els.earnedNum.textContent = n;
  els.fill.style.width = `${Math.round((n / total) * 100)}%`;
  els.detail2.textContent = `${Math.round((n / total) * 100)}% complete — ${total - n} to go`;
  const { out, total: tot } = gradeCounts();
  els.gradeLine.textContent = ['platinum', 'gold', 'silver', 'bronze']
    .map((g) => `${GRADE_LABEL[g]} ${out[g]}/${tot[g]}`).join(' · ');
}

function cardNode(t) {
  const li = document.createElement('li');
  li.className = 'card' + (isEarned(t) ? ' earned' : '') + (selectedId === t.id ? ' selected' : '');
  li.dataset.trophyId = t.id;

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = isEarned(t);
  box.setAttribute('aria-label', `Mark ${t.name} as earned`);
  box.addEventListener('click', (ev) => {
    ev.stopPropagation();
    toggleEarned(t);
  });

  const body = document.createElement('div');
  body.className = 'card-body';
  const name = document.createElement('span');
  name.className = 'card-name';
  name.textContent = hiddenBySpoiler(t) ? 'Hidden story trophy — earn it to reveal' : t.name;
  const desc = document.createElement('span');
  desc.className = 'card-desc';
  desc.textContent = hiddenBySpoiler(t) ? 'Story details hidden by the spoiler setting.' : t.description;
  const tags = document.createElement('span');
  tags.className = 'card-tags';
  const gradeTag = document.createElement('span');
  gradeTag.className = `tag grade-${t.grade}`;
  gradeTag.textContent = GRADE_LABEL[t.grade];
  tags.append(gradeTag);
  const kindTag = document.createElement('span');
  kindTag.className = 'tag';
  kindTag.textContent = KIND_LABEL[t.kind];
  tags.append(kindTag);
  if (MISSABLE_LABEL[t.missable]) {
    const m = document.createElement('span');
    m.className = `tag missable-${t.missable}`;
    m.textContent = MISSABLE_LABEL[t.missable];
    tags.append(m);
  }
  body.append(name, desc, tags);
  li.append(box, body);
  li.addEventListener('click', () => { selectedId = t.id; renderDetail(); renderList(); });
  return li;
}

function renderList() {
  const list = filteredTrophies();
  els.cards.replaceChildren(...list.map(cardNode));
  els.meta.textContent = list.length === data.trophies.length
    ? `Showing all ${list.length} trophies. Click one to read its guide.`
    : `Showing ${list.length} of ${data.trophies.length} trophies.`;
}

function renderDetail() {
  const t = selectedId ? trophyById(selectedId) : null;
  if (!t) {
    els.detail.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'detail-empty';
    p.textContent = 'Pick a trophy on the left to read its guide, see when it can be missed, and add your own note.';
    els.detail.append(p);
    return;
  }
  els.detail.replaceChildren();
  const wrap = document.createElement('div');
  wrap.className = 'detail';
  const h = document.createElement('h2');
  h.textContent = hiddenBySpoiler(t) ? 'Hidden story trophy' : t.name;
  const sub = document.createElement('p');
  sub.className = 'detail-sub';
  sub.textContent = hiddenBySpoiler(t)
    ? 'Turn off “Hide story spoilers” or earn this trophy to see its name and description.'
    : `${t.description} — ${GRADE_LABEL[t.grade]} · ${KIND_LABEL[t.kind]}`;
  const guideH = document.createElement('h3');
  guideH.textContent = 'Guide';
  const guide = document.createElement('p');
  guide.textContent = hiddenBySpoiler(t) ? 'Guide hidden until the trophy is earned.' : t.guide;
  wrap.append(h, sub, guideH, guide);

  if (MISSABLE_LABEL[t.missable]) {
    const m = document.createElement('p');
    m.className = 'detail-missable';
    m.textContent = t.missable === 'yes'
      ? '⚠ Missable — this is a one-time moment. Do it when the chance comes; mission replay is not yet confirmed for this game.'
      : 'Possibly missable — finish it on your first attempt, since mission replay is not yet confirmed.';
    wrap.append(m);
  }

  const srcH = document.createElement('h3');
  srcH.textContent = 'Sources';
  const srcList = document.createElement('ul');
  for (const s of t.sources) {
    const li = document.createElement('li');
    li.textContent = s;
    srcList.append(li);
  }
  wrap.append(srcH, srcList);

  const noteH = document.createElement('label');
  noteH.className = 'note-label';
  noteH.textContent = 'Your note';
  const note = document.createElement('textarea');
  note.rows = 3;
  note.placeholder = 'e.g. best spot, loadout, or what worked for you…';
  note.value = state.notes[t.id] ?? '';
  note.addEventListener('input', () => {
    if (note.value.trim()) state.notes[t.id] = note.value;
    else delete state.notes[t.id];
    saveState();
  });
  wrap.append(noteH, note);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'earn-btn';
  toggle.textContent = isEarned(t) ? 'Mark as not earned' : 'Mark as earned';
  toggle.addEventListener('click', () => toggleEarned(t));
  wrap.append(toggle);
  els.detail.append(wrap);
}

function toggleEarned(t) {
  const set = earnedSet();
  if (set.has(t.id)) set.delete(t.id);
  else set.add(t.id);
  state.earned = [...set].sort((a, b) => a - b);
  saveState();
  renderProgress();
  renderList();
  renderDetail();
  if (view === 'nextup') renderNextUp();
}

function renderRoadmap() {
  const page = $('roadmapView');
  page.replaceChildren();
  const h = document.createElement('h2');
  h.textContent = 'Roadmap to the platinum';
  const intro = document.createElement('p');
  intro.textContent = 'Five stages in the order to play them, built from the official descriptions. The platinum pops when everything else is done — there is no extra step for it.';
  page.append(h, intro);
  for (const s of STAGES) {
    const done = data.trophies.filter((t) => t.stage === s.n && isEarned(t)).length;
    const total = data.trophies.filter((t) => t.stage === s.n).length;
    const block = document.createElement('div');
    block.className = 'stage';
    const sh = document.createElement('h3');
    sh.textContent = `Stage ${s.n} — ${s.title} (${done}/${total} earned)`;
    const sp = document.createElement('p');
    sp.textContent = s.text;
    const bar = document.createElement('div');
    bar.className = 'stage-track';
    const fill = document.createElement('div');
    fill.className = 'stage-fill';
    fill.style.width = `${total ? Math.round((done / total) * 100) : 0}%`;
    bar.append(fill);
    block.append(sh, sp, bar);
    page.append(block);
  }
}

function renderMissables() {
  const page = $('missablesView');
  page.replaceChildren();
  const h = document.createElement('h2');
  h.textContent = 'Missable trophies';
  const intro = document.createElement('p');
  intro.textContent = 'The one-time moments, flagged honestly. Mission replay is not yet confirmed for GTA VI, so “possibly missable” means: do it properly on your first attempt. “Missable” means the moment itself may not come back at all.';
  page.append(h, intro);
  const list = data.trophies.filter((t) => t.missable !== 'no');
  for (const t of list) {
    const row = document.createElement('div');
    row.className = 'miss-row' + (isEarned(t) ? ' earned' : '');
    const name = document.createElement('strong');
    name.textContent = hiddenBySpoiler(t) ? 'Hidden story trophy' : t.name;
    const flag = document.createElement('span');
    flag.className = `tag missable-${t.missable}`;
    flag.textContent = MISSABLE_LABEL[t.missable];
    const guide = document.createElement('p');
    guide.textContent = hiddenBySpoiler(t) ? 'Details hidden by the spoiler setting.' : t.guide;
    row.append(name, ' ', flag, guide);
    page.append(row);
  }
}

function renderNextUp() {
  const page = $('nextupView');
  page.replaceChildren();
  const h = document.createElement('h2');
  h.textContent = 'Next Up';
  page.append(h);
  const remaining = data.trophies.filter((t) => !isEarned(t));
  if (remaining.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'Everything is earned — the platinum is yours. Leonida Legend.';
    page.append(p);
    return;
  }
  const pick = (pred, n) => remaining.filter(pred).slice(0, n);
  const groups = [
    ['Do these first — one-time moments', pick((t) => t.missable === 'yes', 10)],
    ['Then the possibly missable missions', pick((t) => t.missable === 'maybe', 10)],
    ['Then the earliest roadmap stage still open', pick((t) => t.stage === Math.min(...remaining.map((x) => x.stage)), 10)],
  ];
  for (const [title, items] of groups) {
    if (!items.length) continue;
    const gh = document.createElement('h3');
    gh.textContent = title;
    page.append(gh);
    const ul = document.createElement('ul');
    for (const t of items) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'next-item';
      b.textContent = hiddenBySpoiler(t) ? 'Hidden story trophy' : `${t.name} — ${t.description}`;
      b.addEventListener('click', () => { selectedId = t.id; switchView('checklist'); });
      li.append(b);
      ul.append(li);
    }
    page.append(ul);
  }
}

function switchView(next) {
  view = next;
  if (location.hash !== `#${next}`) history.replaceState(null, '', `#${next}`);
  for (const b of document.querySelectorAll('.view-btn')) {
    b.classList.toggle('active', b.dataset.view === next);
  }
  $('checklistView').hidden = next !== 'checklist';
  $('roadmapView').hidden = next !== 'roadmap';
  $('missablesView').hidden = next !== 'missables';
  $('nextupView').hidden = next !== 'nextup';
  $('controls').style.display = next === 'checklist' ? '' : 'none';
  if (next === 'roadmap') renderRoadmap();
  if (next === 'missables') renderMissables();
  if (next === 'nextup') renderNextUp();
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ app: 'leonida-platinum-guide', version: 1, earned: state.earned, notes: state.notes }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProgress(file) {
  const parsed = JSON.parse(await file.text());
  const ids = Array.isArray(parsed.earned) ? parsed.earned : parsed;
  const valid = new Set(data.trophies.map((t) => t.id));
  state.earned = ids.filter((x) => Number.isInteger(x) && valid.has(x)).sort((a, b) => a - b);
  if (parsed.notes && typeof parsed.notes === 'object') {
    state.notes = {};
    for (const [k, v] of Object.entries(parsed.notes)) {
      if (valid.has(Number(k)) && typeof v === 'string') state.notes[Number(k)] = v;
    }
  }
  saveState();
  renderProgress();
  renderList();
  renderDetail();
}

document.querySelectorAll('.view-btn').forEach((b) => {
  b.addEventListener('click', () => switchView(b.dataset.view));
});
els.search.addEventListener('input', renderList);
els.kind.addEventListener('change', renderList);
els.grade.addEventListener('change', renderList);
els.status.addEventListener('change', renderList);
els.missOnly.addEventListener('change', renderList);
els.spoiler.addEventListener('change', () => {
  state.spoiler = els.spoiler.checked;
  saveState();
  renderList();
  renderDetail();
});
$('exportBtn').addEventListener('click', exportProgress);
$('importInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try { await importProgress(file); } catch { alert('That file could not be read as trophy progress.'); }
  e.target.value = '';
});
$('resetBtn').addEventListener('click', () => {
  if (!confirm('Clear all earned trophies and notes in this browser?')) return;
  state = { earned: [], notes: {}, spoiler: state.spoiler };
  saveState();
  selectedId = null;
  renderProgress();
  renderList();
  renderDetail();
});
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== els.search && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    els.search.focus();
  }
});

data = await (await fetch('data/trophies.json')).json();
els.spoiler.checked = state.spoiler;
renderProgress();
renderList();
renderDetail();
const startView = location.hash.replace('#', '');
if (['roadmap', 'missables', 'nextup'].includes(startView)) switchView(startView);
window.addEventListener('hashchange', () => {
  const v = location.hash.replace('#', '');
  if (['checklist', 'roadmap', 'missables', 'nextup'].includes(v) && v !== view) switchView(v);
});
