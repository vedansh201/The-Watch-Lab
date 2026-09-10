// Shared logic for both pages. Loaded before lab.js / archive.js,
// which both just call into the WatchLab object below.
//
// State lives in localStorage so it survives page reloads and carries
// over between index.html and discover.html without needing a backend.

const WatchLab = (() => {
  const STORAGE_KEYS = {
    unlocked: 'watchlab_unlocked',
    combos: 'watchlab_discovered_combos',
    watches: 'watchlab_watches',
  };

  const RARITY_LABEL = {
    common: 'Common',
    uncommon: 'Uncommon',
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary',
    mythic: 'Mythic',
  };

  // low to high, used to average rarity across a watch's five elements
  const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

  let DATA = null; // filled in once by loadData() — { elements, unlockCombos, watchDiscoveries }

  async function loadData() {
    if (DATA) return DATA; // already loaded, don't fetch twice
    const res = await fetch('data.json');
    if (!res.ok) throw new Error('Could not load data.json');
    DATA = await res.json();
    ensureInitialState();
    return DATA;
  }

  // first visit ever: seed localStorage so the rest of the app doesn't
  // have to keep checking "is this null?" everywhere
  function ensureInitialState() {
    if (localStorage.getItem(STORAGE_KEYS.unlocked) === null) {
      const startIds = DATA.elements.filter(e => e.startUnlocked).map(e => e.id);
      localStorage.setItem(STORAGE_KEYS.unlocked, JSON.stringify(startIds));
    }
    if (localStorage.getItem(STORAGE_KEYS.combos) === null) {
      localStorage.setItem(STORAGE_KEYS.combos, JSON.stringify([]));
    }
    if (localStorage.getItem(STORAGE_KEYS.watches) === null) {
      localStorage.setItem(STORAGE_KEYS.watches, JSON.stringify([]));
    }
  }

  // --- elements ---

  function allElements() { return DATA.elements; }

  function elementById(id) { return DATA.elements.find(e => e.id === id) || null; }

  function unlockCombos() { return DATA.unlockCombos; }

  function watchDiscoveries() { return DATA.watchDiscoveries; }

  function getUnlocked() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.unlocked) || '[]');
  }

  function isUnlocked(id) { return getUnlocked().includes(id); }

  function unlockElement(id) {
    const list = getUnlocked();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(STORAGE_KEYS.unlocked, JSON.stringify(list));
    }
  }

  function getDiscoveredCombos() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.combos) || '[]');
  }

  // order shouldn't matter when combining fire+water vs water+fire,
  // so just sort the pair before turning it into a key
  function comboKey(a, b) { return [a, b].sort().join('+'); }

  function markComboDiscovered(a, b) {
    const key = comboKey(a, b);
    const list = getDiscoveredCombos();
    if (!list.includes(key)) {
      list.push(key);
      localStorage.setItem(STORAGE_KEYS.combos, JSON.stringify(list));
    }
    return key;
  }

  function isComboDiscovered(a, b) {
    return getDiscoveredCombos().includes(comboKey(a, b));
  }

  function getWatches() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.watches) || '[]');
  }

  function addWatch(watch) {
    const list = getWatches();
    list.unshift(watch); // newest first, feels more natural in the gallery
    localStorage.setItem(STORAGE_KEYS.watches, JSON.stringify(list));
    return watch;
  }

  function watchesUsingElement(elementId) {
    return getWatches().filter(w =>
      [w.caseEl, w.dialEl, w.handsEl, w.strapEl, w.effectEl].includes(elementId)
    );
  }

  // Combine two element ids and see what happens. Checks the unlock
  // table first, then the watch-discovery table, then gives up.
  function tryCombine(idA, idB) {
    const unlockMatch = DATA.unlockCombos.find(
      c => comboKey(c.elements[0], c.elements[1]) === comboKey(idA, idB)
    );
    if (unlockMatch) {
      const alreadyUnlocked = isUnlocked(unlockMatch.unlocks);
      markComboDiscovered(idA, idB);
      if (!alreadyUnlocked) unlockElement(unlockMatch.unlocks);
      return {
        type: 'unlock',
        alreadyKnown: alreadyUnlocked,
        element: elementById(unlockMatch.unlocks),
      };
    }

    const watchMatch = DATA.watchDiscoveries.find(
      c => comboKey(c.elements[0], c.elements[1]) === comboKey(idA, idB)
    );
    if (watchMatch) {
      const alreadyKnown = isComboDiscovered(idA, idB);
      markComboDiscovered(idA, idB);
      return { type: 'watch', alreadyKnown, discovery: watchMatch };
    }

    return null; // no reaction between these two
  }

  // --- rarity helpers ---

  function rarityLabel(r) { return RARITY_LABEL[r] || r; }

  function rarityVar(r) { return `var(--rarity-${r})`; }

  // --- nav progress bar, shared between both pages ---

  function renderNavProgress(mountEl) {
    const total = DATA.elements.length;
    const unlocked = getUnlocked().length;
    mountEl.innerHTML = `
      <span class="nav-progress-label">${unlocked} of ${total} catalogued</span>
      <div class="progress-track"><div class="progress-fill" style="width:${(unlocked / total) * 100}%"></div></div>
    `;
  }

  // --- watch SVG ---

  // which glow animation each element's "special effect" slot gets.
  // cosmic spins slowly because it felt right for something described
  // as "nowhere left to go but out of this world" — everything else pulses.
  const FX_ANIMATION = {
    fire: 'fx-pulse',
    electric: 'fx-pulse',
    cosmic: 'fx-orbit',
    shadow: 'fx-pulse',
    water: 'fx-pulse',
    nature: 'fx-pulse',
    ice: 'fx-pulse',
    magma: 'fx-pulse',
  };

  // Builds one watch as an SVG string. config = { caseEl, dialEl, handsEl,
  // strapEl, effectEl } — each is either an element object or null.
  // idSuffix has to be unique per instance on the page, since gradient
  // and hand ids need to not collide when several watches render at once
  // (e.g. the mini gallery cards on the Archive page).
  function buildWatchSVG(config, opts = {}) {
    const idSuffix = opts.idSuffix || Math.random().toString(36).slice(2, 8);
    const c = config.caseEl;
    const d = config.dialEl;
    const h = config.handsEl;
    const s = config.strapEl;
    const fx = config.effectEl;

    // fall back to plain greys if a slot hasn't been filled yet
    const caseColor = c ? c.color : '#3a4150';
    const caseDark = c ? c.colorDark : '#20242c';
    const dialColor = d ? d.color : '#20242c';
    const handColor = h ? h.color : '#e9e7e1';
    const strapColor = s ? s.color : '#2d3340';
    const fxColor = fx ? fx.color : 'transparent';
    const fxClass = fx ? (FX_ANIMATION[fx.id] || 'fx-pulse') : '';

    const cx = 130, cy = 130;

    // 12 tick marks around the dial, every 3rd one drawn a bit thicker/longer
    let ticks = '';
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30) * (Math.PI / 180);
      const r1 = 92;
      const r2 = i % 3 === 0 ? 80 : 85;
      const x1 = cx + r1 * Math.sin(angle);
      const y1 = cy - r1 * Math.cos(angle);
      const x2 = cx + r2 * Math.sin(angle);
      const y2 = cy - r2 * Math.cos(angle);
      ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${handColor}" stroke-width="${i % 3 === 0 ? 2.5 : 1.3}" opacity="0.85"/>`;
    }

    return `
<svg viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg" style="--fx-color:${fxColor}">
  <defs>
    <radialGradient id="caseGrad-${idSuffix}" cx="35%" cy="30%" r="80%">
      <stop offset="0%" stop-color="${caseColor}"/>
      <stop offset="100%" stop-color="${caseDark}"/>
    </radialGradient>
    <radialGradient id="dialGrad-${idSuffix}" cx="40%" cy="35%" r="75%">
      <stop offset="0%" stop-color="${dialColor}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${dialColor}" stop-opacity="0.35"/>
    </radialGradient>
  </defs>

  <!-- strap, top and bottom -->
  <rect x="106" y="0" width="48" height="42" rx="6" fill="${strapColor}" opacity="0.9"/>
  <rect x="106" y="218" width="48" height="42" rx="6" fill="${strapColor}" opacity="0.9"/>
  <rect x="112" y="0" width="6" height="42" fill="#000" opacity="0.15"/>
  <rect x="112" y="218" width="6" height="42" fill="#000" opacity="0.15"/>

  <!-- lugs connecting strap to case -->
  <rect x="96" y="34" width="16" height="20" rx="3" fill="#12151b"/>
  <rect x="148" y="34" width="16" height="20" rx="3" fill="#12151b"/>
  <rect x="96" y="206" width="16" height="20" rx="3" fill="#12151b"/>
  <rect x="148" y="206" width="16" height="20" rx="3" fill="#12151b"/>

  <!-- case, with the effect glow/animation wrapped around it -->
  <g class="${fxClass}">
    <circle cx="${cx}" cy="${cy}" r="104" fill="url(#caseGrad-${idSuffix})" stroke="#0d0f13" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="104" fill="none" stroke="${fxColor}" stroke-width="2" opacity="0.55"/>
  </g>

  <circle cx="${cx}" cy="${cy}" r="97" fill="none" stroke="#0d0f13" stroke-width="4" opacity="0.6"/>

  <circle cx="${cx}" cy="${cy}" r="88" fill="url(#dialGrad-${idSuffix})" stroke="#0d0f13" stroke-width="2"/>

  ${ticks}

  <rect x="230" y="122" width="14" height="16" rx="3" fill="${caseDark}" stroke="#0d0f13" stroke-width="1.5"/>

  <!-- hands — startClock() rotates these via transform every second -->
  <g id="hourHand-${idSuffix}" style="transform-origin:${cx}px ${cy}px;">
    <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 46}" stroke="${handColor}" stroke-width="5" stroke-linecap="round"/>
  </g>
  <g id="minuteHand-${idSuffix}" style="transform-origin:${cx}px ${cy}px;">
    <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 68}" stroke="${handColor}" stroke-width="3.5" stroke-linecap="round"/>
  </g>
  <g id="secondHand-${idSuffix}" style="transform-origin:${cx}px ${cy}px;">
    <line x1="${cx}" y1="${cy + 16}" x2="${cx}" y2="${cy - 76}" stroke="${fxColor !== 'transparent' ? fxColor : '#e9433f'}" stroke-width="1.6" stroke-linecap="round"/>
  </g>
  <circle cx="${cx}" cy="${cy}" r="4.5" fill="${handColor}"/>
</svg>`.trim();
  }

  // Wires up a live clock for one rendered watch. idSuffix has to match
  // whatever was passed to buildWatchSVG for this instance, since that's
  // how it finds the right <g> elements to rotate.
  function startClock(idSuffix) {
    function tick() {
      const now = new Date();
      const h = now.getHours() % 12;
      const m = now.getMinutes();
      const s = now.getSeconds();

      const hourDeg = h * 30 + m * 0.5;
      const minDeg = m * 6 + s * 0.1;
      const secDeg = s * 6;

      const hourEl = document.getElementById(`hourHand-${idSuffix}`);
      const minEl = document.getElementById(`minuteHand-${idSuffix}`);
      const secEl = document.getElementById(`secondHand-${idSuffix}`);
      if (hourEl) hourEl.style.transform = `rotate(${hourDeg}deg)`;
      if (minEl) minEl.style.transform = `rotate(${minDeg}deg)`;
      if (secEl) secEl.style.transform = `rotate(${secDeg}deg)`;

      const digital = document.getElementById(`digitalTime-${idSuffix}`);
      if (digital) {
        digital.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    }
    tick(); // paint immediately, don't wait a full second for the first frame
    return setInterval(tick, 1000);
  }

  return {
    STORAGE_KEYS,
    RARITY_ORDER,
    loadData,
    allElements,
    elementById,
    unlockCombos,
    watchDiscoveries,
    getUnlocked,
    isUnlocked,
    unlockElement,
    getDiscoveredCombos,
    comboKey,
    isComboDiscovered,
    getWatches,
    addWatch,
    watchesUsingElement,
    tryCombine,
    rarityLabel,
    rarityVar,
    renderNavProgress,
    buildWatchSVG,
    startClock,
  };
})();