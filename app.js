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
    list.unshift(watch); 
    localStorage.setItem(STORAGE_KEYS.watches, JSON.stringify(list));
    return watch;
  }

  function watchesUsingElement(elementId) {
    return getWatches().filter(w =>
      [w.caseEl, w.dialEl, w.handsEl, w.strapEl, w.effectEl].includes(elementId)
    );
  }

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

    return null; 
  }

  function rarityLabel(r) { return RARITY_LABEL[r] || r; }

  function rarityVar(r) { return `var(--rarity-${r})`; }


  const ICON_PATHS = {
    fire: '<path d="M12 3c-3 3-5 6-5 9a5 5 0 0 0 10 0c0-1.5-.5-2.5-1-3 .2 1.8-1 3-2 3-1.2 0-2-1-1-2.5C14 7 12 5 12 3z"/>',
    water: '<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/>',
    nature: '<path d="M4 20C4 10 10 4 20 4c0 10-6 16-16 16z"/><path d="M4 20 20 4"/>',
    electric: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>',
    shadow: '<path d="M15 3a9 9 0 1 0 6 15 7 7 0 0 1-6-15z"/>',
    ice: '<path d="M12 2v20M4.9 4.9l14.2 14.2M4.9 19.1 19.1 4.9"/>',
    magma: '<path d="M12 3 3 20h18L12 3z"/><path d="M12 3v6"/><circle cx="12" cy="17" r="1.3"/>',
    cosmic: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(35 12 12)"/>',
    thermal: '<rect x="10" y="3" width="4" height="12" rx="2"/><circle cx="12" cy="18" r="3"/>',
    storm: '<path d="M7 16a4 4 0 0 1 .5-8 5 5 0 0 1 9.7 1.2A3.5 3.5 0 0 1 17 16H7z"/><path d="M13 16l-2 4h3l-2 4"/>',
    void: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    check: '<polyline points="4,12 9,17 20,6"/>',
    close: '<path d="M5 5l14 14M19 5 5 19"/>',
    none: '<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>',
    watch: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/><rect x="10" y="1.5" width="4" height="2" rx="0.5"/>',
  };

  function icon(name) {
    const path = ICON_PATHS[name] || ICON_PATHS.none;
    return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  }

  function coloredIcon(name, color) {
    return `<span style="color:${color}">${icon(name)}</span>`;
  }

  function renderNavProgress(mountEl) {
    const total = DATA.elements.length;
    const unlocked = getUnlocked().length;
    mountEl.innerHTML = `
      <span class="nav-progress-label">${unlocked} of ${total} catalogued</span>
      <div class="progress-track"><div class="progress-fill" style="width:${(unlocked / total) * 100}%"></div></div>
    `;
  }

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

  function buildWatchSVG(config, opts = {}) {
    const idSuffix = opts.idSuffix || Math.random().toString(36).slice(2, 8);
    const c = config.caseEl;
    const d = config.dialEl;
    const h = config.handsEl;
    const s = config.strapEl;
    const fx = config.effectEl;

    const caseColor = c ? c.color : '#3a4150';
    const caseDark = c ? c.colorDark : '#20242c';
    const dialColor = d ? d.color : '#20242c';
    const handColor = h ? h.color : '#e9e7e1';
    const strapColor = s ? s.color : '#2d3340';
    const fxColor = fx ? fx.color : 'transparent';
    const fxClass = fx ? (FX_ANIMATION[fx.id] || 'fx-pulse') : '';

    const cx = 130, cy = 130;

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
    tick(); 
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
    icon,
    coloredIcon,
    renderNavProgress,
    buildWatchSVG,
    startClock,
  };
})();