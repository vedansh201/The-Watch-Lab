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

  let DATA = null; 
  async function loadData() {
    if (DATA) return DATA; 
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
  const ICON_DEFS = {
    fire: {
      viewBox: '0 0 24 24', mode: 'fill',
      paths: '<path fill-rule="evenodd" clip-rule="evenodd" d="M10.0284 1.11813C9.69728 1.2952 9.53443 1.61638 9.49957 1.97965C9.48456 2.15538 9.46201 2.32986 9.43136 2.50363C9.3663 2.87248 9.24303 3.3937 9.01205 3.98313C8.5513 5.15891 7.67023 6.58926 5.96985 7.65195C3.57358 9.14956 2.68473 12.5146 3.06456 15.527C3.45234 18.6026 5.20871 21.7903 8.68375 22.9486C9.03 23.0641 9.41163 22.9817 9.67942 22.7337C10.0071 22.4303 10.0238 22.0282 9.94052 21.6223C9.87941 21.3244 9.74999 20.5785 9.74999 19.6875C9.74999 19.3992 9.76332 19.1034 9.79413 18.8068C10.3282 20.031 11.0522 20.9238 11.7758 21.5623C12.8522 22.5121 13.8694 22.8574 14.1722 22.9466C14.402 23.0143 14.6462 23.0185 14.8712 22.9284C17.5283 21.8656 19.2011 20.4232 20.1356 18.7742C21.068 17.1288 21.1993 15.3939 20.9907 13.8648C20.7833 12.3436 20.2354 10.9849 19.7537 10.0215C19.3894 9.29292 19.0534 8.77091 18.8992 8.54242C18.7101 8.26241 18.4637 8.04626 18.1128 8.00636C17.8332 7.97456 17.5531 8.06207 17.3413 8.24739L15.7763 9.61686C15.9107 7.44482 15.1466 5.61996 14.1982 4.24472C13.5095 3.24609 12.7237 2.47913 12.1151 1.96354C11.8094 1.70448 11.5443 1.50549 11.3525 1.36923C11.2564 1.30103 11.1784 1.24831 11.1224 1.21142C10.7908 0.99291 10.3931 0.923125 10.0284 1.11813ZM7.76396 20.256C7.75511 20.0744 7.74999 19.8842 7.74999 19.6875C7.75 18.6347 7.89677 17.3059 8.47802 16.0708C8.67271 15.6572 8.91614 15.254 9.21914 14.8753C9.47408 14.5566 9.89709 14.4248 10.2879 14.5423C10.6787 14.6598 10.959 15.003 10.9959 15.4094C11.2221 17.8977 12.2225 19.2892 13.099 20.0626C13.5469 20.4579 13.979 20.7056 14.292 20.8525C15.5 20.9999 17.8849 18.6892 18.3955 17.7882C19.0569 16.6211 19.1756 15.356 19.0091 14.1351C18.8146 12.7092 18.2304 11.3897 17.7656 10.5337L14.6585 13.2525C14.3033 13.5634 13.779 13.5835 13.401 13.3008C13.023 13.018 12.8942 12.5095 13.092 12.0809C14.4081 9.22933 13.655 6.97987 12.5518 5.38019C12.1138 4.74521 11.6209 4.21649 11.18 3.80695C11.0999 4.088 10.9997 4.39262 10.8742 4.71284C10.696 5.16755 10.4662 5.65531 10.1704 6.15187C9.50801 7.26379 8.51483 8.41987 7.02982 9.34797C5.57752 10.2556 4.71646 12.6406 5.04885 15.2768C5.29944 17.2643 6.20241 19.1244 7.76396 20.256Z"/>',
    },
    water: {
      viewBox: '0 0 24 24', mode: 'fill',
      paths: '<path d="M12,6.36c2,2.58,4,5.87,4,7.64a4,4,0,0,1-8,0c0-1.77,2-5.06,4-7.64M12,3.2S6,10,6,14a6,6,0,0,0,12,0c0-4-6-10.8-6-10.8Z"/>',
    },
    nature: {
      viewBox: '0 0 64 64', mode: 'fill',
      paths: '<path d="M60.893,1.549c-0.136-0.269-0.386-0.462-0.679-0.525c-2.98-0.652-6.97-0.982-11.856-0.982c-4.922,0-10.564,0.353-15.481,0.967C17.641,2.912,7,13.601,7,27v18.678L3.103,60.225c-0.428,1.598,0.523,3.244,2.122,3.674c1.598,0.426,3.245-0.525,3.673-2.121L11.25,53H31c14.337,0,26-11.663,26-26c0-6.663,0-15.788,3.914-24.594C61.036,2.132,61.028,1.816,60.893,1.549z M6.966,61.26c-0.143,0.532-0.691,0.849-1.224,0.707c-0.534-0.145-0.851-0.691-0.708-1.225l2.552-9.686c0.405,0.672,0.998,1.212,1.712,1.55L6.966,61.26z M52.347,8.938c-0.073,0.027-6.014,2.301-14.545,9.321c5.572-0.588,10.233,0.712,10.473,0.779c0.531,0.152,0.838,0.705,0.687,1.235C48.836,20.713,48.436,21,48,21c-0.091,0-0.183-0.013-0.274-0.038c-0.064-0.019-6.464-1.784-12.916-0.135c-1.325,1.187-2.692,2.47-4.103,3.88c-1.642,1.643-3.115,3.228-4.456,4.752c10.211-2.021,19.587,0.46,20.012,0.576c0.533,0.146,0.847,0.694,0.702,1.228C46.844,31.708,46.44,32,46,32c-0.087,0-0.175-0.012-0.263-0.035c-0.107-0.029-10.88-2.889-21.475,0c-0.051,0.014-0.103,0.016-0.154,0.021c-2.702,3.302-4.692,6.203-6.108,8.52c10.2-2.115,18.897,0.418,19.287,0.536c0.529,0.159,0.829,0.716,0.671,1.244C37.828,42.72,37.431,43,37,43c-0.095,0-0.191-0.014-0.287-0.042c-0.097-0.028-9.653-2.805-20.092-0.079c-1.184,2.166-1.671,3.434-1.684,3.468C14.788,46.75,14.406,47,14,47c-0.115,0-0.232-0.021-0.347-0.062c-0.518-0.191-0.782-0.766-0.592-1.283c0.057-0.152,0.627-1.652,2.01-4.141c1.837-9.547-0.028-18.21-0.048-18.297c-0.119-0.539,0.221-1.073,0.76-1.192c0.543-0.127,1.073,0.22,1.193,0.759c0.069,0.312,1.422,6.557,0.713,14.457c1.414-2.121,3.204-4.565,5.464-7.261c1.693-10.294-0.111-18.677-0.13-18.763c-0.119-0.539,0.221-1.073,0.76-1.193c0.539-0.116,1.073,0.221,1.193,0.76c0.073,0.33,1.569,7.275,0.571,16.458c1.154-1.277,2.388-2.591,3.745-3.948c1.285-1.285,2.529-2.454,3.744-3.557v-0.008c1.873-6.556,0.052-11.312,0.033-11.359c-0.202-0.513,0.049-1.094,0.562-1.297c0.51-0.206,1.092,0.044,1.297,0.557c0.075,0.188,1.599,4.106,0.657,9.863C44.85,9.642,51.328,7.182,51.654,7.062c0.518-0.188,1.092,0.073,1.283,0.592C53.129,8.171,52.864,8.746,52.347,8.938z"/>',
    },
    electric: {
      viewBox: '-11.2 0 165.24 165.24', mode: 'fill',
      paths: '<path d="M48,42.22c4.74-2.46,9-1.73,13.37,1.68,4.92,3.87,10.19,7.31,15.8,11.28l12.07-12c6.27-6.25,12.52-12.54,18.83-18.77C114,18.6,120,12.83,125.92,7c1-1,2-2,3-3,4.29-4.22,7.09-6.48,13.77.34.53,3.11-.93,6-2.39,8.68-6.8,12.56-13.29,25.27-21,37.37-8.26,13-15.59,26.59-23,40.11a129.89,129.89,0,0,0-8,18c-1,2.63-2.68,3.36-5,4.32-6.57-2.62-8-10.91-14.63-14.25-1.25,1.34-2.41,2.52-3.48,3.79-8.12,9.6-16.09,19.33-24.36,28.8C32.08,141.23,23.66,151.73,13.84,161c-2.16,2-4.35,3.66-7.28,4.14-4.94.82-7.83-2.45-6-7.18,3-7.73,6.07-15.44,9.51-23,5.82-12.75,12.26-25.21,17.86-38.05,4.57-10.47,8.39-21.27,12.35-32C42.94,57.69,45.27,50.35,48,42.22ZM21,134.54l1.25,1.22c2.41-2.37,5-4.59,7.2-7.15,10.55-12.42,21-24.93,31.48-37.39a36.65,36.65,0,0,1,3.5-3.76,4.61,4.61,0,0,1,6.27-.16C71.57,88,72.13,89,73,89.79c2.92,2.63,5.47,5.73,9.4,7.68,7.76-16.62,17-32.08,26.47-47.38,3.92-6.3,7.57-12.77,11.23-19.22.52-.94,2-2.08.23-3.66a42,42,0,0,0-4.74,3.62c-9.49,9.5-19,19-28.31,28.67-2.62,2.73-5.21,5.23-9.08,6.3C69.81,62.92,65.19,54,56,51.53A608.74,608.74,0,0,1,21,134.54Z"/>',
    },
    shadow: {
      viewBox: '0 0 48 48', mode: 'stroke', strokeWidth: 3.2,
      paths: '<path d="M24,2.5A21.4773,21.4773,0,0,0,3.5833,30.7122,10.2206,10.2206,0,1,1,17.2878,44.4167,21.4964,21.4964,0,1,0,24,2.5Z"/>',
    },
    ice: {
      viewBox: '0 0 24 24', mode: 'stroke', strokeWidth: 1.5,
      paths: '<path d="M12 17L9 20M12 17L15 20M12 17V12M12 17V21M12 7L9 4M12 7L15 4M12 7V12M12 7V3M12 12L7.66985 9.49995M12 12L16.3301 14.4999M12 12L7.66985 14.4999M12 12L16.3301 9.49995M16.3301 14.4999L17.4282 18.598M16.3301 14.4999L20.4282 13.4019M16.3301 14.4999L19.7943 16.5M7.66985 9.49995L3.57178 10.598M7.66985 9.49995L6.57178 5.40187M7.66985 9.49995L4.20581 7.5M16.3301 9.49995L20.4282 10.598M16.3301 9.49995L17.4282 5.40187M16.3301 9.49995L19.7943 7.5M7.66985 14.4999L6.57178 18.598M7.66985 14.4999L3.57178 13.4019M7.66985 14.4999L4.20581 16.5"/>',
    },
    magma: {
      viewBox: '0 0 15 15', mode: 'fill',
      paths: '<path d="M8.4844,1.0002c-0.1464,0.005-0.2835,0.0731-0.375,0.1875L6.4492,3.2619L4.8438,1.7385C4.4079,1.3374,3.7599,1.893,4.0899,2.385l1.666,2.4004C5.9472,5.061,6.3503,5.0737,6.5586,4.8108C6.7249,4.6009,7,4.133,7.5,4.133s0.7929,0.4907,0.9414,0.6777c0.175,0.2204,0.4973,0.2531,0.7129,0.0723l1.668-1.4004c0.4408-0.3741,0.0006-1.0735-0.5273-0.8379L9,3.2268V1.5002C9.0002,1.2179,8.7666,0.9915,8.4844,1.0002L8.4844,1.0002z M5,6.0002L2.0762,11.924C1.9993,12.0009,2,12.155,2,12.3088c0,0.5385,0.3837,0.6914,0.6914,0.6914h9.6172c0.3846,0,0.6914-0.153,0.6914-0.6914c0-0.1538,0.0008-0.2309-0.0762-0.3848L10,6.0002c-0.5,0-1,0.5-1,1v0.5c0,0.277-0.223,0.5-0.5,0.5S8,7.7772,8,7.5002v-0.5c0-0.2761-0.2238-0.5-0.5-0.5S7,6.7241,7,7.0002v2c0,0.277-0.223,0.5-0.5,0.5S6,9.2772,6,9.0002v-2C6,6.5002,5.5,6.0002,5,6.0002z"/>',
    },
    cosmic: {
      viewBox: '0 0 512 512', mode: 'fill',
      paths: '<path d="M501.679,371.791c-15.06,8.968-33.148,13.868-51.452,16.521c-18.393,2.624-37.306,3.028-56.093,1.935c-37.574-2.32-75.229-10.249-109.551-24.413c-9.093-3.816-17.936-8.18-26.232-13.099c12.749,2.231,25.345,3.109,38.05,3.369c21.098,0.126,42.134-2.839,62.319-8.645c40.226-11.665,77.675-34.439,104.023-67.901c13.063-16.691,23.123-36.338,27.236-57.813c4.192-21.403,1.505-44.356-7.633-64.057l-17.829,7.875c7.024,16.449,8.619,34.645,4.758,51.989c-3.808,17.363-12.624,33.704-24.288,47.769c-23.464,28.266-57.356,47.806-93.139,57.034c-5.026,1.308-10.114,2.348-15.212,3.243c3.208-2.239,6.424-4.443,9.435-6.97c17.362-14.639,28.57-36.912,30.245-59.202c1.891-22.343-3.914-44.06-13.886-62.704c-10.008-18.734-24.208-34.752-40.773-47.312c-33.264-25.373-75.632-35.747-115.84-33.498l0.735,19.476c36.597-1.003,73.348,9.514,101.129,31.966c13.833,11.118,25.354,25.023,33.086,40.548c7.75,15.481,11.531,32.754,9.658,48.925c-1.586,14.022-7.956,26.537-17.668,36.213c-0.359-3.082-0.985-6.074-1.891-8.744c-2.356-6.827-5.734-12.488-9.415-17.389c-7.168-9.255-14.442-16.897-22.604-24.396c-16.18-14.765-34.51-26.823-53.942-36.204c-38.918-18.734-82.181-27.128-124.916-24.96C77.361,183.508,34.6,196.857,0,222.803l11.477,15.732c31.616-22.416,70.561-33.525,109.408-34.457c38.891-0.95,78.14,7.839,112.418,25.516c6.97,3.602,13.671,7.668,20.166,12.005c-18.339-1.792-36.123-1.774-54.3-0.116c-37.619,3.485-76.135,15.947-106.084,41.382c-30.075,25.05-48.925,62.973-50.816,101.64l19.432,1.389c2.732-33.525,19.728-64.98,45.861-85.469c26.044-20.803,59.721-30.908,93.72-33.014c7.499-0.484,15.168-0.573,22.801-0.385c-6.773,2.284-13.412,4.963-19.647,8.385c-16.35,9.102-31.142,21.269-41.839,37.816c-10.714,16.359-15.382,37.1-12.775,56.334c2.454,19.307,10.983,36.813,22.262,51.264c22.828,29.01,56.334,47.134,91.284,53.593l3.826-19.11c-30.542-6.593-59.049-23.715-76.959-48.209c-8.896-12.139-14.898-26.178-16.171-40.253c-1.362-14.048,2.276-27.844,10.268-39.312c2.186-3.207,4.757-6.209,7.552-9.085c1.174,5.904,3.431,11.02,5.922,15.517c6.299,10.635,14.111,18.555,22.506,25.57c16.86,13.761,35.576,23.033,54.588,30.442c38.165,14.478,78.051,21.591,118.231,22.998c20.087,0.6,40.307-0.377,60.402-3.818c20.023-3.521,40.217-9.326,58.467-20.838L501.679,371.791z"/><path d="M81.115,154.176c7.713,0,13.976-6.253,13.976-13.976c0-7.705-6.262-13.967-13.976-13.967c-7.704,0-13.968,6.262-13.968,13.967C67.148,147.923,73.411,154.176,81.115,154.176z"/><path d="M266.997,57.813c5.591,0,10.115-4.534,10.115-10.106c0-5.591-4.524-10.124-10.115-10.124c-5.59,0-10.114,4.533-10.114,10.124C256.883,53.279,261.406,57.813,266.997,57.813z"/><path d="M410.055,188.865c5.582,0,10.114-4.524,10.114-10.114c0-5.582-4.533-10.114-10.114-10.114c-5.6,0-10.124,4.533-10.124,10.114C399.932,184.342,404.455,188.865,410.055,188.865z"/><path d="M473.431,320.097c0,4.256,3.458,7.714,7.714,7.714c4.256,0,7.704-3.458,7.704-7.714c0-4.255-3.448-7.704-7.704-7.704C476.889,312.393,473.431,315.842,473.431,320.097z"/><path d="M352.654,443.607c-5.581,0-10.124,4.534-10.124,10.123c0,5.582,4.542,10.116,10.124,10.116c5.591,0,10.116-4.534,10.116-10.116C362.77,448.14,358.245,443.607,352.654,443.607z"/><path d="M117.095,377.91c-6.379,0-11.567,5.178-11.567,11.566c0,6.379,5.188,11.558,11.567,11.558c6.388,0,11.566-5.179,11.566-11.558C128.66,383.088,123.483,377.91,117.095,377.91z"/><path d="M89.68,243.005c4.256,0,7.714-3.449,7.714-7.704c0-4.256-3.458-7.715-7.714-7.715c-4.256,0-7.704,3.459-7.704,7.715C81.976,239.556,85.424,243.005,89.68,243.005z"/><path d="M266.997,171.055c0-4.255-3.449-7.714-7.714-7.714c-4.256,0-7.704,3.459-7.704,7.714c0,4.256,3.449,7.705,7.704,7.705C263.548,178.76,266.997,175.31,266.997,171.055z"/>',
    },
    thermal: { viewBox: '0 0 24 24', mode: 'stroke', strokeWidth: 1.6, paths: '<rect x="10" y="3" width="4" height="12" rx="2"/><circle cx="12" cy="18" r="3"/>' },
    storm: { viewBox: '0 0 24 24', mode: 'stroke', strokeWidth: 1.6, paths: '<path d="M7 16a4 4 0 0 1 .5-8 5 5 0 0 1 9.7 1.2A3.5 3.5 0 0 1 17 16H7z"/><path d="M13 16l-2 4h3l-2 4"/>' },
    void: { viewBox: '0 0 24 24', mode: 'stroke', strokeWidth: 1.6, paths: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>' },
    lock: { viewBox: '0 0 24 24', mode: 'stroke', strokeWidth: 1.6, paths: '<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>' },
    check: { viewBox: '0 0 24 24', mode: 'stroke', strokeWidth: 1.6, paths: '<polyline points="4,12 9,17 20,6"/>' },
    close: { viewBox: '0 0 24 24', mode: 'stroke', strokeWidth: 1.6, paths: '<path d="M5 5l14 14M19 5 5 19"/>' },
    none: { viewBox: '0 0 24 24', mode: 'stroke', strokeWidth: 1.6, paths: '<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>' },
    watch: { viewBox: '0 0 24 24', mode: 'stroke', strokeWidth: 1.6, paths: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/><rect x="10" y="1.5" width="4" height="2" rx="0.5"/>' },
  };

  function icon(name) {
    const def = ICON_DEFS[name] || ICON_DEFS.none;
    if (def.mode === 'stroke') {
      return `<svg class="icon" viewBox="${def.viewBox}" fill="none" stroke="currentColor" stroke-width="${def.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${def.paths}</svg>`;
    }
    return `<svg class="icon" viewBox="${def.viewBox}" fill="currentColor" aria-hidden="true">${def.paths}</svg>`;
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

    const caseColor = c ? c.color : '#4a5658';
    const caseDark = c ? c.colorDark : '#262e30';
    const dialColor = d ? d.color : '#1a2022';
    const handColor = h ? h.color : '#e9e7e1';
    const strapColor = s ? s.color : '#39424a';
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


function initCursor() {
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!isFinePointer || reducedMotion) return;

  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);
  document.body.classList.add('has-custom-cursor');

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  window.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
  });
  function followMouse() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    requestAnimationFrame(followMouse);
  }
  followMouse();

  const hoverTargets = 'a, button, .el-card:not(.locked), .slot, .combine-slot';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(hoverTargets)) ring.classList.add('cursor-ring-active');
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(hoverTargets)) ring.classList.remove('cursor-ring-active');
  });

  document.addEventListener('mouseleave', () => {
    dot.style.opacity = '0';
    ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    dot.style.opacity = '1';
    ring.style.opacity = '1';
  });
}


function initScrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  const targets = document.querySelectorAll('.page-head, .bench, .section, .stats-row');
  targets.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  targets.forEach(el => observer.observe(el));
}


function initSnap() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const GONE_MS = 5000;
  const STAGGER_MS = 350;

  function snap() {
    const candidates = Array.from(document.querySelectorAll(
      '.el-card:not(.locked):not(.dust-out):not(.dust-in), .mini-watch-card:not(.dust-out):not(.dust-in)'
    ));
    if (candidates.length === 0) return;
    const toDust = candidates.filter(() => Math.random() < 0.5);
    if (toDust.length === 0) return;

    toDust.forEach(el => {
      el.style.animationDelay = `${Math.random() * STAGGER_MS}ms`;
      el.classList.add('dust-out');
    });

    setTimeout(() => {
      toDust.forEach(el => {
        el.classList.remove('dust-out');
        el.style.animationDelay = `${Math.random() * STAGGER_MS}ms`;
        el.classList.add('dust-in');
      });

      setTimeout(() => {
        toDust.forEach(el => {
          el.classList.remove('dust-in');
          el.style.animationDelay = '';
        });
      }, 1400);
    }, GONE_MS);
  }

  setTimeout(snap, 4000);
  setInterval(snap, 60000);
}

initCursor();
initScrollReveal();
initSnap();