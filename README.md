# Watch Lab

A small two-page site where you build wristwatches out of elements. You start with fire, water, and nature, and unlock the rest — electric, shadow, ice, magma, cosmic — by combining things you already have. There's no backend. Everything you build lives in your browser's localStorage.

## How it works 

The whole thing is static HTML, CSS, and vanilla JS — no framework, no build step. A few parts of it were worth doing carefully though.

### The watch is one SVG template, not five separate assets

Instead of drawing five different watch parts as images, `buildWatchSVG()` in `app.js` takes whatever element you picked for each slot and builds the whole watch as a single SVG string, pulling each part's color straight from that element's data:

```js
const caseColor = c ? c.color : '#3a4150';
const dialColor = d ? d.color : '#20242c';
const handColor = h ? h.color : '#e9e7e1';
```

That's what lets the preview update instantly every time you click a different element — there's nothing to load, it's just a new string getting dropped into the DOM.

### The clock hands are real transforms, not pre-rendered angles

Every watch on the page — the live preview, and every mini watch in the Archive gallery — is actually ticking off your system clock, not just a static illustration with hands drawn at 10:10. `startClock()` runs a `setInterval` that reads `new Date()` every second and rotates each hand by degrees:

```js
const hourDeg = h * 30 + m * 0.5;
const minDeg = m * 6 + s * 0.1;
const secDeg = s * 6;
```

Because more than one watch can be on screen at once (the gallery on the Archive page can have several), every SVG gets a unique `idSuffix` so their hands don't all grab the same DOM element and spin together.

### Combining two elements doesn't care about order

Fire + water and water + fire need to count as the same combination, so instead of storing combos as ordered pairs, everything gets funneled through one sort-then-join function before it's ever compared or saved:

```js
function comboKey(a, b) { return [a, b].sort().join('+'); }
```

Every unlock check, every "have I already found this" check, and every entry saved to localStorage goes through that function, so the order you click things in never matters.

### State lives entirely in localStorage

There's no database and no accounts. Which elements you've unlocked, which combos you've found, and every watch you've built are all just JSON blobs sitting in `localStorage` under a few keys (`watchlab_unlocked`, `watchlab_discovered_combos`, `watchlab_watches`). The Lab and Archive pages both read from the same keys, which is the only reason progress carries over between them — there's no syncing logic, they're just looking at the same storage.

## What's in the folder

```
index.html       the Lab — where you build watches
discover.html    the Archive — everything you've found so far
style.css        styling, shared by both pages
app.js           shared logic: data loading, localStorage, the SVG builder, the clock
lab.js           logic specific to the Lab page
archive.js       logic specific to the Archive page
data.json        the elements, unlock combos, and watch discoveries
```

All seven files need to stay in the same folder — they reference each other by relative path.

## The unlock chain

You start with fire, water, and nature. Everything past that is gated behind a combination, and a couple of the later ones need an element you've already unlocked from an earlier combo, so it's meant to be worked through gradually rather than solved in one sitting. Rarity on a finished watch is just the average rarity of its five parts, rounded to the nearest tier.
