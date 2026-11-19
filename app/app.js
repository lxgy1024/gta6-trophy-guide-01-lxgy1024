// Leonida Nights — GTA VI trophy guide & tracker.
// All local: the trophy list comes from data/trophies.json, progress lives in
// this browser's localStorage, and the app makes no network requests of its
// own. State shape: { earned: {id: true}, notes: {id: text},
// hideSpoilers: true|false } under one localStorage key.

const KEY = 'leonida-nights-trophy-state-v1';
const GRADES = ['platinum', 'gold', 'silver', 'bronze'];
const GRADE_WORD = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const KIND_WORD = {
  story: 'Story', side: 'Side missions', activity: 'Activities', collectible: 'Collectibles',
  combat: 'Combat & heists', exploration: 'Exploration', money: 'Money', misc: 'Secrets & misc',
  platinum: 'Platinum', completion: '100% completion',
};
const MISS_WORD = { yes: 'Missable', maybe: 'Possibly missable', no: '' };

// Five roadmap stages, built from the official descriptions: which story
// chapters and missions, which collectibles and counts, in what order.
const ROADMAP = [
  { n: 1, head: 'Story first', body: 'Play the campaign in order — Chapters 1–4 and the final mission. While the chances are in front of you, do the partner trophies (Hot Together, Retail Therapy), the choice trophy (Actions Speak Louder) and the one-time airport moment (Catch Me If You Can). Finish the named story missions on your first attempt, since mission replay is unconfirmed.' },
  { n: 2, head: 'Side missions', body: 'Finish the mission strands for Andy, Kenton, Billy, Randy and Tyrone, hunt the unique animal for Bret, and complete 8 stranger strands across Leonida. Strands unlock as the story advances, so check back with each contact between chapters.' },
  { n: 3, head: 'Activities', body: 'Work through the grind and skill trophies: 250 stunts, gold medals in all 42 Shooting Range challenges, 20 different race wins, drone races at every location, fishing against Cal, one arcade game, bowling at Kolt & Associates, 50 challenges, and the combat trophies — 5 takedowns in one Combat Focus, the Rhino, the jewelry store, bank vaults, armored trucks, gang operations and the melee drive-by.' },
  { n: 4, head: 'Collectibles & exploration', body: 'Meditate at every spot, complete 3 collectible card sets, WAiNK It at 100 locations, discover 100 vehicles, explore all of Leonida, and have the cocktail with a view on Ocean Beach. Go region by region so nothing is left behind.' },
  { n: 5, head: 'Money & cleanup', body: 'Launder $250,000 of Marked Bills, spend $100,000 across all shops, buy every garage property and register 10 vehicles to the Scooter Bros app. Then the two golds fall into place: 100% completion, and with it the platinum.' },
];

function readState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { earned: {}, notes: {}, hideSpoilers: false };
    const p = JSON.parse(raw);
    return {
      earned: p.earned && typeof p.earned === 'object' ? p.earned : {},
      notes: p.notes && typeof p.notes === 'object' ? p.notes : {},
      hideSpoilers: Boolean(p.hideSpoilers),
    };
  } catch {
    return { earned: {}, notes: {}, hideSpoilers: false };
  }
}

const App = {
  data: null,
  state: readState(),
  picked: null,
  tab: 'checklist',

  store() { localStorage.setItem(KEY, JSON.stringify(this.state)); },
  got(t) { return Boolean(this.state.earned[t.id]); },
  storyHidden(t) { return this.state.hideSpoilers && t.kind === 'story' && !this.got(t); },
  byId(id) { return this.data.trophies.find((t) => t.id === id); },

  visible() {
    const q = document.getElementById('q').value.trim().toLowerCase();
    const kind = document.getElementById('kind').value;
    const grade = document.getElementById('grade').value;
    const status = document.getElementById('status').value;
    const missOnly = document.getElementById('missOnly').checked;
    return this.data.trophies.filter((t) => {
      if (kind !== 'all' && t.kind !== kind) return false;
      if (grade !== 'all' && t.grade !== grade) return false;
      if (status === 'earned' && !this.got(t)) return false;
      if (status === 'unearned' && this.got(t)) return false;
      if (missOnly && t.missable === 'no') return false;
      if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))) return false;
      return true;
    });
  },

  esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  flip(t) {
    if (this.got(t)) delete this.state.earned[t.id];
    else this.state.earned[t.id] = true;
    this.store();
    this.paintProgress();
    this.paintList();
    this.paintDetail();
    if (this.tab === 'nextup') this.paintNextUp();
  },

  paintProgress() {
    const total = this.data.trophies.length;
    const n = Object.keys(this.state.earned).length;
    document.getElementById('earnedNum').textContent = n;
    document.getElementById('progressFill').style.width = `${Math.round((n / total) * 100)}%`;
    document.getElementById('progressText').textContent = `${Math.round((n / total) * 100)}% complete — ${total - n} to go`;
    const counts = {};
    for (const g of GRADES) counts[g] = [0, 0];
    for (const t of this.data.trophies) {
      counts[t.grade][1] += 1;
      if (this.got(t)) counts[t.grade][0] += 1;
    }
    document.getElementById('gradeLine').textContent = GRADES
      .map((g) => `${GRADE_WORD[g]} ${counts[g][0]}/${counts[g][1]}`).join(' · ');
  },

  cardHtml(t) {
    const hidden = this.storyHidden(t);
    const name = hidden ? 'Hidden story trophy — earn it to reveal' : this.esc(t.name);
    const desc = hidden ? 'Story details hidden by the spoiler setting.' : this.esc(t.description);
    const miss = MISS_WORD[t.missable]
      ? `<span class="pill miss-${t.missable}">${MISS_WORD[t.missable]}</span>` : '';
    return `<li class="card${this.got(t) ? ' done' : ''}${this.picked === t.id ? ' picked' : ''}" data-id="${t.id}">
      <input type="checkbox" ${this.got(t) ? 'checked' : ''} aria-label="Mark ${this.esc(t.name)} as earned">
      <div class="card-main">
        <span class="card-name">${name}</span>
        <span class="card-desc">${desc}</span>
        <span class="pills"><span class="pill grade-${t.grade}">${GRADE_WORD[t.grade]}</span><span class="pill">${KIND_WORD[t.kind]}</span>${miss}</span>
      </div>
    </li>`;
  },

  paintList() {
    const list = this.visible();
    document.getElementById('trophyList').innerHTML = list.map((t) => this.cardHtml(t)).join('');
    document.getElementById('listCount').textContent = list.length === this.data.trophies.length
      ? `Showing all ${list.length} trophies. Click one to read its guide.`
      : `Showing ${list.length} of ${this.data.trophies.length} trophies.`;
  },

  paintDetail() {
    const box = document.getElementById('detail');
    const t = this.picked ? this.byId(this.picked) : null;
    if (!t) {
      box.innerHTML = '<p class="hint">Pick a trophy on the left to read its guide, see when it can be missed, and add your own note.</p>';
      return;
    }
    const hidden = this.storyHidden(t);
    const missNote = t.missable === 'yes'
      ? '⚠ Missable — this is a one-time moment. Do it when the chance comes; mission replay is not yet confirmed for this game.'
      : t.missable === 'maybe'
        ? 'Possibly missable — finish it on your first attempt, since mission replay is not yet confirmed.'
        : '';
    const sources = t.sources.map((s) => `<li>${this.esc(s)}</li>`).join('');
    box.innerHTML = `<div class="detail-card">
      <h2>${hidden ? 'Hidden story trophy' : this.esc(t.name)}</h2>
      <p class="sub">${hidden ? 'Turn off “Hide story spoilers” or earn this trophy to see its name and description.' : `${this.esc(t.description)} — ${GRADE_WORD[t.grade]} · ${KIND_WORD[t.kind]}`}</p>
      <h3>Guide</h3>
      <p>${hidden ? 'Guide hidden until the trophy is earned.' : this.esc(t.guide)}</p>
      ${missNote ? `<p class="warn">${missNote}</p>` : ''}
      <h3>Sources</h3>
      <ul>${sources}</ul>
      <label class="note-label" for="noteBox">Your note</label>
      <textarea id="noteBox" rows="3" placeholder="e.g. best spot, loadout, or what worked for you…">${this.esc(this.state.notes[t.id] ?? '')}</textarea>
      <button type="button" id="flipBtn" class="big-btn">${this.got(t) ? 'Mark as not earned' : 'Mark as earned'}</button>
    </div>`;
    document.getElementById('noteBox').addEventListener('input', (e) => {
      if (e.target.value.trim()) this.state.notes[t.id] = e.target.value;
      else delete this.state.notes[t.id];
      this.store();
    });
    document.getElementById('flipBtn').addEventListener('click', () => this.flip(t));
  },

  paintRoadmap() {
    const page = document.getElementById('roadmapPage');
    let html = '<h2>Roadmap to the platinum</h2><p>Five stages in the order to play them, built from the official descriptions. The platinum pops when everything else is done — there is no extra step for it.</p>';
    for (const s of ROADMAP) {
      const inStage = this.data.trophies.filter((t) => t.stage === s.n);
      const done = inStage.filter((t) => this.got(t)).length;
      const pct = inStage.length ? Math.round((done / inStage.length) * 100) : 0;
      html += `<div class="stage"><h3>Stage ${s.n} — ${this.esc(s.head)} (${done}/${inStage.length} earned)</h3><p>${this.esc(s.body)}</p><div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div></div>`;
    }
    page.innerHTML = html;
  },

  paintMissables() {
    const page = document.getElementById('missPage');
    let html = '<h2>Missable trophies</h2><p>The one-time moments, flagged honestly. Mission replay is not yet confirmed for GTA VI, so “possibly missable” means: do it properly on your first attempt. “Missable” means the moment itself may not come back at all.</p>';
    for (const t of this.data.trophies.filter((x) => x.missable !== 'no')) {
      const hidden = this.storyHidden(t);
      html += `<div class="miss-row${this.got(t) ? ' done' : ''}"><strong>${hidden ? 'Hidden story trophy' : this.esc(t.name)}</strong> <span class="pill miss-${t.missable}">${MISS_WORD[t.missable]}</span><p>${hidden ? 'Details hidden by the spoiler setting.' : this.esc(t.guide)}</p></div>`;
    }
    page.innerHTML = html;
  },

  paintNextUp() {
    const page = document.getElementById('nextPage');
    const left = this.data.trophies.filter((t) => !this.got(t));
    if (left.length === 0) {
      page.innerHTML = '<h2>Next Up</h2><p>Everything is earned — the platinum is yours. Leonida Legend.</p>';
      return;
    }
    const take = (pred, n) => left.filter(pred).slice(0, n);
    const groups = [
      ['Do these first — one-time moments', take((t) => t.missable === 'yes', 10)],
      ['Then the possibly missable missions', take((t) => t.missable === 'maybe', 10)],
      ['Then the earliest roadmap stage still open', take((t) => t.stage === Math.min(...left.map((x) => x.stage)), 10)],
    ];
    let html = '<h2>Next Up</h2>';
    for (const [title, items] of groups) {
      if (!items.length) continue;
      html += `<h3>${title}</h3><ul>`;
      for (const t of items) {
        html += `<li><button type="button" class="next-link" data-id="${t.id}">${this.storyHidden(t) ? 'Hidden story trophy' : `${this.esc(t.name)} — ${this.esc(t.description)}`}</button></li>`;
      }
      html += '</ul>';
    }
    page.innerHTML = html;
  },

  showTab(next) {
    this.tab = next;
    if (location.hash !== `#${next}`) history.replaceState(null, '', `#${next}`);
    for (const b of document.querySelectorAll('.tab-btn')) {
      b.classList.toggle('on', b.dataset.tab === next);
    }
    document.getElementById('checklistPage').hidden = next !== 'checklist';
    document.getElementById('roadmapPage').hidden = next !== 'roadmap';
    document.getElementById('missPage').hidden = next !== 'missables';
    document.getElementById('nextPage').hidden = next !== 'nextup';
    document.getElementById('filters').style.display = next === 'checklist' ? '' : 'none';
    if (next === 'roadmap') this.paintRoadmap();
    if (next === 'missables') this.paintMissables();
    if (next === 'nextup') this.paintNextUp();
  },

  downloadProgress() {
    const blob = new Blob([JSON.stringify({ app: 'leonida-nights-guide', version: 1, earned: this.state.earned, notes: this.state.notes }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gta6-trophy-progress.json';
    a.click();
    URL.revokeObjectURL(a.href);
  },

  async loadProgress(file) {
    const parsed = JSON.parse(await file.text());
    const ids = Array.isArray(parsed.earned) ? parsed.earned : parsed;
    const valid = new Set(this.data.trophies.map((t) => t.id));
    const earned = {};
    for (const x of ids) {
      const id = typeof x === 'number' ? x : Number(x);
      if (Number.isInteger(id) && valid.has(id)) earned[id] = true;
    }
    // Accept both shapes: {earned: {id: true}} and {earned: [ids]}.
    if (parsed.earned && typeof parsed.earned === 'object' && !Array.isArray(parsed.earned)) {
      for (const [k, v] of Object.entries(parsed.earned)) {
        if (v && valid.has(Number(k))) earned[Number(k)] = true;
      }
    }
    this.state.earned = earned;
    this.state.notes = {};
    if (parsed.notes && typeof parsed.notes === 'object') {
      for (const [k, v] of Object.entries(parsed.notes)) {
        if (valid.has(Number(k)) && typeof v === 'string') this.state.notes[Number(k)] = v;
      }
    }
    this.store();
    this.paintProgress();
    this.paintList();
    this.paintDetail();
  },
};

// List clicks: checkbox toggles, card body opens the detail pane.
document.getElementById('trophyList').addEventListener('click', (e) => {
  const li = e.target.closest('li[data-id]');
  if (!li) return;
  const t = App.byId(Number(li.dataset.id));
  if (e.target.tagName === 'INPUT') { App.flip(t); return; }
  App.picked = t.id;
  App.paintList();
  App.paintDetail();
});

// Next Up links jump back to the checklist with the trophy open.
document.getElementById('nextPage').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-id]');
  if (!b) return;
  App.picked = Number(b.dataset.id);
  App.showTab('checklist');
  App.paintList();
  App.paintDetail();
});

document.querySelectorAll('.tab-btn').forEach((b) => {
  b.addEventListener('click', () => App.showTab(b.dataset.tab));
});
for (const id of ['q', 'kind', 'grade', 'status', 'missOnly']) {
  document.getElementById(id).addEventListener('input', () => App.paintList());
  document.getElementById(id).addEventListener('change', () => App.paintList());
}
document.getElementById('spoilerBox').addEventListener('change', (e) => {
  App.state.hideSpoilers = e.target.checked;
  App.store();
  App.paintList();
  App.paintDetail();
});
document.getElementById('exportBtn').addEventListener('click', () => App.downloadProgress());
document.getElementById('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try { await App.loadProgress(file); } catch { alert('That file could not be read as trophy progress.'); }
  e.target.value = '';
});
document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Clear all earned trophies and notes in this browser?')) return;
  App.state = { earned: {}, notes: {}, hideSpoilers: App.state.hideSpoilers };
  App.store();
  App.picked = null;
  App.paintProgress();
  App.paintList();
  App.paintDetail();
});
document.addEventListener('keydown', (e) => {
  const tag = document.activeElement ? document.activeElement.tagName : '';
  if (e.key === '/' && document.activeElement !== document.getElementById('q') && tag !== 'TEXTAREA') {
    e.preventDefault();
    document.getElementById('q').focus();
  }
});

App.data = await (await fetch('data/trophies.json')).json();
document.getElementById('spoilerBox').checked = App.state.hideSpoilers;
App.paintProgress();
App.paintList();
App.paintDetail();
const startTab = location.hash.replace('#', '');
if (['roadmap', 'missables', 'nextup'].includes(startTab)) App.showTab(startTab);
window.addEventListener('hashchange', () => {
  const v = location.hash.replace('#', '');
  if (['checklist', 'roadmap', 'missables', 'nextup'].includes(v) && v !== App.tab) App.showTab(v);
});
