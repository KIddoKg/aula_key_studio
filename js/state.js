'use strict';
// =====================================================================
//  State (kept in the browser — the keyboard cannot be read back)
// =====================================================================
const DEFAULT = {
  lighting: { mode: 11, color: [255, 0, 0], rainbow: true, brightness: 5, speed: 3, direction: 0 },
  keymap: { top: {}, fn: {} },
  perkey: { colors: {}, brightness: 5 },
  macros: [],
  system: { sleep: 1, response: 2, win: false, altTab: false, altF4: false },
  screen: { w: 135, h: 240, fit: 'cover', rot: 0, zoom: 100, ox: 0, oy: 0, speed: 100, skip: 1, maxFrames: 120, smooth: true, bg: '#000000' },
  model: 's75pro',
  slotMap: {}, // model id → { key id: measured slot }
  fixedMap: {}, // model id → [key ids the firmware ignores the keymap for]
};
const STORE = 's75studio.v1';
function loadState() {
  const s = structuredClone(DEFAULT);
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved) for (const k of Object.keys(s)) if (saved[k] !== undefined)
      s[k] = Array.isArray(s[k]) ? saved[k] : (typeof s[k] === 'object' ? { ...s[k], ...saved[k] } : saved[k]);
  } catch {}
  return s;
}
let S = loadState();
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch {} };

// Current model: its parsed layout, with each key's table slot (measured > guessed > unknown)
let MODEL, LAY, L, KB_W, KB_H, DUPS = [];
function loadModel() {
  MODEL = MODEL_BY_ID.get(S.model) || MODELS[0];
  LAY = parseLayout(LAYOUTS[MODEL.layout]);
  const measured = S.slotMap[MODEL.id] || {}, fixed = new Set(S.fixedMap?.[MODEL.id] || []);
  // A guess must never land on a slot that calibration proved belongs to another key.
  const taken = new Set(Object.values(measured));
  L = LAY.keys.map(k => {
    const m = k.id in measured;
    let slot = m ? measured[k.id] : GUESS_SLOT[k.name] ?? null;
    if (!m && slot != null && taken.has(slot)) slot = null;
    return { ...k, cx: k.x + k.w / 2, cy: k.y + k.h / 2, slot, measured: m, fixed: fixed.has(k.id), dup: false };
  });
  // Two keys on one slot means a bad calibration: painting/remapping one would change the other.
  const bySlot = new Map();
  for (const k of L) if (k.slot != null) { const o = bySlot.get(k.slot); if (o) { o.dup = k.dup = true; } else bySlot.set(k.slot, k); }
  DUPS = L.filter(k => k.dup);
  KB_W = LAY.W; KB_H = LAY.H;
}
loadModel();
