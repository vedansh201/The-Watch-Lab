// Logic for discover.html — the Archive. Pulls everything out of
// localStorage (via app.js) and renders the full catalog: elements,
// discovery combinations, and every watch that's been generated.

(async function () {
  await WatchLab.loadData();

  WatchLab.renderNavProgress(document.getElementById('navProgress'));
  renderStats();
  renderElementArchive();
  renderComboList();

  function renderStats() {
    const total = WatchLab.allElements().length;
    const unlocked = WatchLab.getUnlocked().length;
    const totalCombos = WatchLab.unlockCombos().length + WatchLab.watchDiscoveries().length;
    const doneCombos = WatchLab.getDiscoveredCombos().length;
    const watchesMade = WatchLab.getWatches().length;

    document.getElementById('statsRow').innerHTML = `
      <div class="stat-block">
        <div class="stat-num">${unlocked}/${total}</div>
        <div class="stat-label">elements unlocked</div>
      </div>
      <div class="stat-block">
        <div class="stat-num">${doneCombos}/${totalCombos}</div>
        <div class="stat-label">combinations found</div>
      </div>
      <div class="stat-block">
        <div class="stat-num">${watchesMade}</div>
        <div class="stat-label">watches created</div>
      </div>
    `;
  }

  function renderElementArchive() {
    const grid = document.getElementById('archiveGrid');
    const unlockedIds = WatchLab.getUnlocked();
    grid.innerHTML = '';

    WatchLab.allElements().forEach(el => {
      const unlocked = unlockedIds.includes(el.id);
      const card = document.createElement('div');
      card.className = 'el-card' + (unlocked ? '' : ' locked');
      card.style.setProperty('--el-color', el.color);

      if (!unlocked) {
        // keep it vague on purpose — no name, no description, just the
        // rarity tier as a hint of what's out there to find
        card.innerHTML = `
          <span class="el-symbol">${el.symbol}</span>
          <p class="el-name">???</p>
          <p class="el-desc">Not yet discovered. Try combining elements in the Lab.</p>
          <div class="badge-row">
            <span class="badge-rarity" style="color:${WatchLab.rarityVar(el.rarity)}">${WatchLab.rarityLabel(el.rarity)}</span>
            <span class="lock-icon">🔒</span>
          </div>
        `;
        grid.appendChild(card);
        return;
      }

      const usedIn = WatchLab.watchesUsingElement(el.id);
      const usedHTML = usedIn.length
        ? `<div class="el-props">${usedIn.slice(0, 4).map(w => `<li>Watch made ${new Date(w.createdAt).toLocaleDateString()} — ${WatchLab.rarityLabel(w.rarity)}</li>`).join('')}</div>`
        : `<p class="el-desc" style="margin-top:10px;">Not used in a watch yet.</p>`;

      card.innerHTML = `
        <span class="el-symbol">${el.symbol}</span>
        <p class="el-name">${el.name}</p>
        <p class="el-desc">${el.description}</p>
        <ul class="el-props">${el.properties.map(p => `<li>${p}</li>`).join('')}</ul>
        <div class="badge-row">
          <span class="badge-rarity" style="color:${WatchLab.rarityVar(el.rarity)}">${WatchLab.rarityLabel(el.rarity)}</span>
          <span class="lock-icon" title="Unlocked">✓</span>
        </div>
        <div class="section-note" style="margin:12px 0 4px;font-size:0.72rem;">Watches using ${el.name}</div>
        ${usedHTML}
      `;
      grid.appendChild(card);
    });
  }

  function renderComboList() {
    const list = document.getElementById('comboList');
    list.innerHTML = '';

    // unlock combos and watch-discovery combos both get listed together,
    // tagged with a "kind" so we know which fields to read off each one
    const allCombos = [
      ...WatchLab.unlockCombos().map(c => ({ ...c, kind: 'unlock' })),
      ...WatchLab.watchDiscoveries().map(c => ({ ...c, kind: 'watch' })),
    ];

    allCombos.forEach(combo => {
      const [aId, bId] = combo.elements;
      const discovered = WatchLab.isComboDiscovered(aId, bId);
      const row = document.createElement('div');
      row.className = 'combo-row' + (discovered ? '' : ' pending');

      if (!discovered) {
        // don't reveal which two elements it even needs — half the fun
        // is stumbling into it
        row.innerHTML = `
          <div class="combo-parts"><span>🔒</span><span class="combo-arrow">+</span><span>🔒</span></div>
          <div class="combo-arrow">→</div>
          <div class="combo-result"><span class="combo-result-name">Undiscovered combination</span></div>
        `;
        list.appendChild(row);
        return;
      }

      const elA = WatchLab.elementById(aId);
      const elB = WatchLab.elementById(bId);
      const rarity = combo.rarity;

      let resultHTML;
      let desc = '';
      if (combo.kind === 'unlock') {
        const resEl = WatchLab.elementById(combo.unlocks);
        resultHTML = `<span>${resEl.symbol}</span><span class="combo-result-name">${resEl.name}</span>`;
        desc = resEl.description;
      } else {
        resultHTML = `<span>${combo.symbol}</span><span class="combo-result-name">${combo.name} watch</span>`;
        desc = combo.description;
      }

      row.innerHTML = `
        <div class="combo-parts"><span>${elA.symbol}</span><span class="combo-arrow">+</span><span>${elB.symbol}</span></div>
        <div class="combo-arrow">→</div>
        <div class="combo-result">
          ${resultHTML}
          <span class="badge-rarity" style="color:${WatchLab.rarityVar(rarity)}">${WatchLab.rarityLabel(rarity)}</span>
        </div>
        <div class="combo-desc">${desc}</div>
      `;
      list.appendChild(row);
    });

    renderWatchGallery();
  }

  function renderWatchGallery() {
    const gallery = document.getElementById('watchGallery');
    const watches = WatchLab.getWatches();
    if (watches.length === 0) {
      gallery.innerHTML = `<p class="empty-note">No watches created yet. Head to the Lab to build one.</p>`;
      return;
    }
    gallery.innerHTML = '';
    watches.forEach((w, i) => {
      // "gallery0", "gallery1"... — has to be unique per card so each
      // watch's hands get their own ticking clock instead of all
      // pointing at the same DOM ids
      const idSuffix = 'gallery' + i;
      const config = {
        caseEl: WatchLab.elementById(w.caseEl),
        dialEl: WatchLab.elementById(w.dialEl),
        handsEl: WatchLab.elementById(w.handsEl),
        strapEl: WatchLab.elementById(w.strapEl),
        effectEl: WatchLab.elementById(w.effectEl),
      };
      const card = document.createElement('div');
      card.className = 'mini-watch-card';
      
      card.innerHTML = `
        ${WatchLab.buildWatchSVG(config, { idSuffix })}
        <div class="mini-watch-time">${WatchLab.rarityLabel(w.rarity)} · ${new Date(w.createdAt).toLocaleDateString()}</div>
      `;
      gallery.appendChild(card);
      WatchLab.startClock(idSuffix);
    });
  }
})();