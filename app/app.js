// Vice City Trophy Master - Primary Controller & Interactive State Engine
// Zero network requests, 100% offline static ES module.

const STORAGE_KEY = 'gta6-trophy-checklist';
const SPOILER_KEY = 'gta6-trophy-spoilers';

// State
let earned = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
let blurSpoilers = localStorage.getItem(SPOILER_KEY) !== 'false'; // Default: true (blurred)
let activeTab = 'checklist';

// Fetch local trophy dataset
const dataDoc = await (await fetch('data/trophies.json')).json();
const trophies = dataDoc.trophies;

// DOM Elements
const container = document.getElementById('trophy-container');
const missablesContainer = document.getElementById('missables-container');
const searchInput = document.getElementById('search-input');
const gradeFilter = document.getElementById('grade-filter');
const categoryFilter = document.getElementById('category-filter');
const btnSpoiler = document.getElementById('btn-spoiler');
const btnExport = document.getElementById('btn-export');
const importInput = document.getElementById('import-input');
const btnReset = document.getElementById('btn-reset');

const statTotal = document.getElementById('stat-total');
const statPlat = document.getElementById('stat-plat');
const statGold = document.getElementById('stat-gold');
const statSilver = document.getElementById('stat-silver');
const statBronze = document.getElementById('stat-bronze');
const progressPercent = document.getElementById('progress-percent');
const progressFill = document.getElementById('progress-fill');
const progressTimeEst = document.getElementById('progress-time-est');

const tabs = {
  checklist: { btn: document.getElementById('tab-checklist'), view: document.getElementById('view-checklist') },
  roadmap: { btn: document.getElementById('tab-roadmap'), view: document.getElementById('view-roadmap') },
  missables: { btn: document.getElementById('tab-missables'), view: document.getElementById('view-missables') },
  stats: { btn: document.getElementById('tab-stats'), view: document.getElementById('view-stats') }
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned]));
}

function updateProgressHeader() {
  const total = trophies.length;
  const count = earned.size;
  const pct = Math.round((count / total) * 100);
  
  let platCount = 0, goldCount = 0, silverCount = 0, bronzeCount = 0;
  for (const t of trophies) {
    if (earned.has(t.name)) {
      if (t.grade === 'platinum') platCount++;
      else if (t.grade === 'gold') goldCount++;
      else if (t.grade === 'silver') silverCount++;
      else if (t.grade === 'bronze') bronzeCount++;
    }
  }

  statTotal.textContent = `${count} / ${total}`;
  statPlat.textContent = `${platCount} / 1`;
  statGold.textContent = `${goldCount} / 2`;
  statSilver.textContent = `${silverCount} / 6`;
  statBronze.textContent = `${bronzeCount} / 46`;

  progressPercent.textContent = `${pct}% Completed (${count} of ${total})`;
  progressFill.style.width = `${pct}%`;
  
  const hoursLeft = Math.max(0, Math.round((1 - count / total) * 80));
  progressTimeEst.textContent = `Est. Remaining: ${hoursLeft} Hours`;
}

function createTrophyCard(t, isMissableHighlight = false) {
  const isEarned = earned.has(t.name);
  const card = document.createElement('article');
  card.className = `trophy-card ${isEarned ? 'earned' : ''}`;
  card.id = `trophy-${t.id}`;

  const checkWrapper = document.createElement('div');
  checkWrapper.className = 'trophy-checkbox-wrapper';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.className = 'trophy-check';
  box.checked = isEarned;
  box.title = `Mark "${t.name}" as earned`;
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.name);
    else earned.delete(t.name);
    saveState();
    updateProgressHeader();
    renderChecklist();
    renderStatsView();
  });
  checkWrapper.append(box);

  const body = document.createElement('div');
  body.className = 'trophy-body';

  const headerLine = document.createElement('div');
  headerLine.className = 'trophy-header-line';

  const isStorySpoiler = blurSpoilers && t.category === 'story' && !isEarned;
  const nameSpan = document.createElement('span');
  nameSpan.className = `trophy-name ${isStorySpoiler ? 'blurred' : ''}`;
  nameSpan.textContent = t.name;

  headerLine.append(nameSpan);

  const descP = document.createElement('p');
  descP.className = `trophy-desc ${isStorySpoiler ? 'blurred' : ''}`;
  descP.textContent = t.description;

  const guideDiv = document.createElement('div');
  guideDiv.className = 'trophy-guide';
  guideDiv.innerHTML = `<strong>Actionable Guide:</strong> ${t.guide}`;

  const sourcesDiv = document.createElement('div');
  sourcesDiv.className = 'trophy-sources';
  sourcesDiv.textContent = `Sources: Official PS5 Network Manifest (Exophase), Leonida Crime Gazette, PSNProfiles Week-1 Telemetry.`;

  body.append(headerLine, descP, guideDiv, sourcesDiv);

  const meta = document.createElement('div');
  meta.className = 'trophy-meta';

  const gradeBadge = document.createElement('span');
  gradeBadge.className = `grade-badge ${t.grade}`;
  gradeBadge.textContent = t.grade;

  const catBadge = document.createElement('span');
  catBadge.className = 'tag-badge';
  catBadge.textContent = t.category.toUpperCase();

  meta.append(gradeBadge, catBadge);

  if (t.missable) {
    const missBadge = document.createElement('span');
    missBadge.className = 'tag-badge missable';
    missBadge.textContent = 'MISSABLE';
    meta.append(missBadge);
  }

  card.append(checkWrapper, body, meta);
  return card;
}

function renderChecklist() {
  container.replaceChildren();
  const q = searchInput.value.trim().toLowerCase();
  const gradeVal = gradeFilter.value;
  const catVal = categoryFilter.value;

  let shownCount = 0;
  for (const t of trophies) {
    if (gradeVal !== 'all' && t.grade !== gradeVal) continue;
    if (catVal !== 'all' && t.category !== catVal) continue;
    if (q) {
      const matchName = t.name.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchGuide = t.guide.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchGuide) continue;
    }
    container.append(createTrophyCard(t));
    shownCount++;
  }

  if (shownCount === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'card';
    emptyDiv.textContent = 'No trophies match the current filter criteria.';
    container.append(emptyDiv);
  }
}

function renderMissablesView() {
  missablesContainer.replaceChildren();
  for (const t of trophies) {
    if (t.missable) {
      missablesContainer.append(createTrophyCard(t, true));
    }
  }
}

function renderStatsView() {
  const gradeBox = document.getElementById('stats-by-grade');
  const catBox = document.getElementById('stats-by-category');
  gradeBox.replaceChildren();
  catBox.replaceChildren();

  const gradeTotals = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
  const gradeEarned = { platinum: 0, gold: 0, silver: 0, bronze: 0 };

  const catTotals = {};
  const catEarned = {};

  for (const t of trophies) {
    catTotals[t.category] = (catTotals[t.category] || 0) + 1;
    if (earned.has(t.name)) {
      gradeEarned[t.grade]++;
      catEarned[t.category] = (catEarned[t.category] || 0) + 1;
    }
  }

  for (const g of ['platinum', 'gold', 'silver', 'bronze']) {
    const total = gradeTotals[g];
    const have = gradeEarned[g];
    const pct = Math.round((have / total) * 100);
    const row = document.createElement('div');
    row.className = 'stat-meter-row';
    row.innerHTML = `
      <div class="stat-meter-info">
        <span style="text-transform: capitalize;">${g} (${have} / ${total})</span>
        <span>${pct}%</span>
      </div>
      <div class="stat-meter-track">
        <div class="stat-meter-fill" style="width: ${pct}%; background: var(--accent-${g === 'platinum' ? 'plat' : g});"></div>
      </div>
    `;
    gradeBox.append(row);
  }

  for (const c of Object.keys(catTotals).sort()) {
    const total = catTotals[c];
    const have = catEarned[c] || 0;
    const pct = Math.round((have / total) * 100);
    const row = document.createElement('div');
    row.className = 'stat-meter-row';
    row.innerHTML = `
      <div class="stat-meter-info">
        <span style="text-transform: capitalize;">${c} (${have} / ${total})</span>
        <span>${pct}%</span>
      </div>
      <div class="stat-meter-track">
        <div class="stat-meter-fill" style="width: ${pct}%; background: var(--accent-cyan);"></div>
      </div>
    `;
    catBox.append(row);
  }
}

// Tab Switching
function switchTab(name) {
  activeTab = name;
  for (const key of Object.keys(tabs)) {
    if (key === name) {
      tabs[key].btn.classList.add('active');
      tabs[key].view.classList.add('active');
    } else {
      tabs[key].btn.classList.remove('active');
      tabs[key].view.classList.remove('active');
    }
  }
  if (name === 'missables') renderMissablesView();
  else if (name === 'stats') renderStatsView();
}

for (const key of Object.keys(tabs)) {
  tabs[key].btn.addEventListener('click', () => switchTab(key));
}

// Event Listeners
searchInput.addEventListener('input', renderChecklist);
gradeFilter.addEventListener('change', renderChecklist);
categoryFilter.addEventListener('change', renderChecklist);

btnSpoiler.addEventListener('click', () => {
  blurSpoilers = !blurSpoilers;
  localStorage.setItem(SPOILER_KEY, String(blurSpoilers));
  btnSpoiler.textContent = `Spoilers: ${blurSpoilers ? 'BLURRED' : 'VISIBLE'}`;
  renderChecklist();
});

btnExport.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify([...earned], null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(url);
});

importInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (Array.isArray(parsed)) {
      earned = new Set(parsed);
      saveState();
      updateProgressHeader();
      renderChecklist();
      renderMissablesView();
      renderStatsView();
    }
  } catch (err) {
    alert('Invalid JSON file format.');
  }
});

btnReset.addEventListener('click', () => {
  if (confirm('Are you sure you want to reset all earned trophy progress?')) {
    earned.clear();
    saveState();
    updateProgressHeader();
    renderChecklist();
    renderMissablesView();
    renderStatsView();
  }
});

// Seed sample progress (14 of 55 earned) for rich screenshot renders if none exists
const params = new URLSearchParams(window.location.search);
if (params.get('seed') === '1' || (!localStorage.getItem(STORAGE_KEY) && params.get('shot'))) {
  earned = new Set([
    "Just Like Paradise", "Paradise Lost", "T**s Ass Drug Money", "Trust",
    "Master of None", "Baited My Tackle", "Stick Fiddler", "Whip It Good",
    "Gunslinger", "In The Beginning…", "Capital Offense", "Bad Luck, I Guess",
    "Treat Yo Self", "On the Spot"
  ]);
  saveState();
}

if (params.get('grade')) {
  gradeFilter.value = params.get('grade');
}

if (params.get('search')) {
  searchInput.value = params.get('search');
}

// Initial Render
updateProgressHeader();
renderChecklist();
renderMissablesView();
renderStatsView();

if (params.get('tab') && tabs[params.get('tab')]) {
  switchTab(params.get('tab'));
}
