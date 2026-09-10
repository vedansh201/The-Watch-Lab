// Logic for index.html — the Lab. Handles slot picking, the element
// grid, generating a watch, and the discovery combine bar.

(async function () {
  await WatchLab.loadData();

  const SLOTS = [
    { key: 'caseEl', label: 'Case' },
    { key: 'dialEl', label: 'Dial' },
    { key: 'handsEl', label: 'Hands' },
    { key: 'strapEl', label: 'Strap' },
    { key: 'effectEl', label: 'Special effect' },
  ];

  // what's currently sitting in each slot, before the watch is generated
  const selection = { caseEl: null, dialEl: null, handsEl: null, strapEl: null, effectEl: null };
  let activeSlot = 'caseEl'; // whichever slot clicking an element card will fill

  const combineChoice = { a: null, b: null }; // the two elements picked in the discovery bar

  let clockTimer = null;
  const PREVIEW_ID = 'preview';

  WatchLab.renderNavProgress(document.getElementById('navProgress'));

  function renderSlots() {
    const rail = document.getElementById('slotRail');
    rail.innerHTML = '';
    SLOTS.forEach(slot => {
      const elId = selection[slot.key];
      const el = elId ? WatchLab.elementById(elId) : null;
      const div = document.createElement('button');
      div.className = 'slot' + (slot.key === activeSlot ? ' active' : '') + (el ? ' filled' : '');
      div.style.color = el ? el.color : '';
      div.innerHTML = `
        <div class="slot-label">${slot.label}</div>
        <div class="slot-symbol">${el ? el.symbol : '<span class="slot-empty">—</span>'}</div>
      `;
      div.addEventListener('click', () => {
        activeSlot = slot.key;
        renderSlots();
      });
      rail.appendChild(div);
    });
    updateGenerateState();
  }

  function renderElementGrid() {
    const grid = document.getElementById('elementGrid');
    grid.innerHTML = '';
    const unlocked = WatchLab.getUnlocked();

    WatchLab.allElements().forEach(el => {
      const isUnlockedEl = unlocked.includes(el.id);
      const card = document.createElement('button');
      card.className = 'el-card' + (isUnlockedEl ? '' : ' locked') +
        (selection[activeSlot] === el.id ? ' selected' : '');
      card.style.setProperty('--el-color', el.color);

      if (isUnlockedEl) {
        card.innerHTML = `
          <span class="el-symbol">${el.symbol}</span>
          <p class="el-name">${el.name}</p>
          <div class="badge-row">
            <span class="badge-rarity" style="color:${WatchLab.rarityVar(el.rarity)}">${WatchLab.rarityLabel(el.rarity)}</span>
            <span class="lock-icon" title="Unlocked">✓</span>
          </div>
        `;
        // clicking a card drops it into whichever slot is currently active
        card.addEventListener('click', () => {
          selection[activeSlot] = el.id;
          renderSlots();
          renderElementGrid();
          renderPreview();
        });
      } else {
        // locked cards are unclickable — just a teaser
        card.innerHTML = `
          <span class="el-symbol">${el.symbol}</span>
          <p class="el-name">???</p>
          <div class="badge-row">
            <span class="badge-rarity" style="color:${WatchLab.rarityVar(el.rarity)}">${WatchLab.rarityLabel(el.rarity)}</span>
            <span class="lock-icon" title="Locked">🔒</span>
          </div>
        `;
      }
      grid.appendChild(card);
    });
  }

  function currentConfig() {
    return {
      caseEl: selection.caseEl ? WatchLab.elementById(selection.caseEl) : null,
      dialEl: selection.dialEl ? WatchLab.elementById(selection.dialEl) : null,
      handsEl: selection.handsEl ? WatchLab.elementById(selection.handsEl) : null,
      strapEl: selection.strapEl ? WatchLab.elementById(selection.strapEl) : null,
      effectEl: selection.effectEl ? WatchLab.elementById(selection.effectEl) : null,
    };
  }

  function renderPreview() {
    const wrap = document.getElementById('previewWrap');
    wrap.innerHTML = WatchLab.buildWatchSVG(currentConfig(), { idSuffix: PREVIEW_ID });
    // kill the old interval before starting a new one, otherwise every
    // slot change stacks another ticking timer on top of the last
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = WatchLab.startClock(PREVIEW_ID);
    renderResultPanel();
  }

  function renderResultPanel() {
    const panel = document.getElementById('resultPanel');
    const filled = SLOTS.filter(s => selection[s.key]);
    if (filled.length === 0) {
      panel.innerHTML = `<p>Pick an element for each slot, then generate the watch.</p>`;
      return;
    }
    const rows = SLOTS.map(s => {
      const elId = selection[s.key];
      const el = elId ? WatchLab.elementById(elId) : null;
      return `<div class="result-row"><span>${s.label}</span><span>${el ? el.symbol + ' ' + el.name : '—'}</span></div>`;
    }).join('');
    panel.innerHTML = `<strong>Watch combination result</strong><div class="result-rows">${rows}</div>`;
  }

  function updateGenerateState() {
    const btn = document.getElementById('generateBtn');
    const complete = SLOTS.every(s => selection[s.key]);
    btn.disabled = !complete;
    btn.textContent = complete ? 'Create watch' : `Fill all 5 slots (${SLOTS.filter(s => selection[s.key]).length}/5)`;
  }

  // little status line under the button — shows how many watches are
  // saved so far without needing to jump over to the Archive to check
  function renderSavedCount(flash) {
    const el = document.getElementById('savedCount');
    const count = WatchLab.getWatches().length;
    el.textContent = count === 0
      ? 'No watches saved to the Archive yet.'
      : `${count} watch${count === 1 ? '' : 'es'} saved to the Archive.`;
    if (flash) {
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1200);
    }
  }

  document.getElementById('generateBtn').addEventListener('click', () => {
    const complete = SLOTS.every(s => selection[s.key]);
    if (!complete) return;

    // rarity of the finished watch = average rarity of its five parts,
    // rounded to the nearest tier
    const rarityScore = SLOTS
      .map(s => WatchLab.RARITY_ORDER.indexOf(WatchLab.elementById(selection[s.key]).rarity))
      .reduce((a, b) => a + b, 0) / SLOTS.length;
    const rarity = WatchLab.RARITY_ORDER[Math.round(rarityScore)];

    const watch = {
      id: 'w_' + Date.now(),
      createdAt: new Date().toISOString(),
      caseEl: selection.caseEl,
      dialEl: selection.dialEl,
      handsEl: selection.handsEl,
      strapEl: selection.strapEl,
      effectEl: selection.effectEl,
      rarity,
    };
    WatchLab.addWatch(watch);
    renderSavedCount(true);

    const btn = document.getElementById('generateBtn');
    const original = btn.textContent;
    btn.textContent = '✓ Saved to Archive';
    setTimeout(() => { btn.textContent = original; }, 1600);
  });

  // --- discovery lab: combine two unlocked elements ---

  function renderCombineBar() {
    const bar = document.getElementById('combineBar');
    const unlocked = WatchLab.getUnlocked();

    function slotHTML(which) {
      const id = combineChoice[which];
      const el = id ? WatchLab.elementById(id) : null;
      return `<button class="combine-slot" data-which="${which}" title="Choose element ${which.toUpperCase()}">${el ? el.symbol : '?'}</button>`;
    }

    bar.innerHTML = `
      ${slotHTML('a')}
      <span class="combine-plus">+</span>
      ${slotHTML('b')}
      <span class="combine-hint">Pick two unlocked elements to see what they make.</span>
      <button class="combine-btn" id="combineGo">Combine</button>
    `;

    bar.querySelectorAll('.combine-slot').forEach(btn => {
      btn.addEventListener('click', () => openCombinePicker(btn.dataset.which, unlocked));
    });

    const go = document.getElementById('combineGo');
    go.disabled = !(combineChoice.a && combineChoice.b);
    go.addEventListener('click', handleCombine);
  }

  // no dropdown here — clicking a combine slot just cycles through the
  // unlocked elements one at a time. simple, and there's rarely more
  // than a handful unlocked at once so it doesn't get tedious
  function openCombinePicker(which, unlocked) {
    const options = unlocked;
    if (options.length === 0) return;
    const current = combineChoice[which];
    const idx = current ? options.indexOf(current) : -1;
    const next = options[(idx + 1) % options.length];
    combineChoice[which] = next;
    renderCombineBar();
  }

  function handleCombine() {
    const { a, b } = combineChoice;
    if (!a || !b || a === b) return;
    const result = WatchLab.tryCombine(a, b);
    const elA = WatchLab.elementById(a);
    const elB = WatchLab.elementById(b);

    if (!result) {
      showModal({
        symbol: '💤',
        title: `${elA.name} and ${elB.name} don't react`,
        desc: `Nothing happens when ${elA.symbol} meets ${elB.symbol}. Not every pair is meant to combine.`,
        cta: 'Close',
      });
      return;
    }

    if (result.type === 'unlock') {
      renderNavAndGrids(); // refresh nav progress + element grid right away
      if (result.alreadyKnown) {
        showModal({
          symbol: result.element.symbol,
          title: `You already have ${result.element.name}`,
          desc: `You unlocked ${result.element.name} from this pair a while back — it's sitting in your element grid whenever you need it.`,
          cta: 'Close',
        });
      } else {
        showModal({
          symbol: result.element.symbol,
          title: `You've unlocked ${result.element.name}`,
          desc: result.element.description,
          cta: 'Use it now',
          onUse: () => { selection[activeSlot] = result.element.id; renderSlots(); renderElementGrid(); renderPreview(); },
        });
      }
    } else if (result.type === 'watch') {
      showModal({
        symbol: result.discovery.symbol,
        title: result.alreadyKnown
          ? `You've already found the ${result.discovery.name} watch`
          : `You've discovered the ${result.discovery.name} watch`,
        desc: result.discovery.description,
        cta: 'Close',
      });
    }

    combineChoice.a = null;
    combineChoice.b = null;
    renderCombineBar();
  }

  

  function showModal({ symbol, title, desc, cta, onUse }) {
    const overlay = document.getElementById('modalOverlay');
    overlay.innerHTML = `
      <div class="modal-card">
        <button class="modal-close" id="modalClose" aria-label="Close">✕</button>
        <div class="modal-symbol">${symbol}</div>
        <h3 class="modal-title">${title}</h3>
        <p class="modal-desc">${desc}</p>
        <button class="modal-btn" id="modalCta">${cta}</button>
      </div>
    `;
    overlay.classList.add('open');
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCta').addEventListener('click', () => {
      if (onUse) onUse();
      closeModal();
    });
    
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
  }

  function renderNavAndGrids() {
    WatchLab.renderNavProgress(document.getElementById('navProgress'));
    renderElementGrid();
    renderCombineBar();
  }

  // --- kick everything off ---

  renderSlots();
  renderElementGrid();
  renderPreview();
  renderCombineBar();
  renderSavedCount(false);
})();