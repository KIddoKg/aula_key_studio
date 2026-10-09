'use strict';
// =====================================================================
//  UI widgets
// =====================================================================
function setRange(el, v) { el.value = v; el.style.setProperty('--p', ((v - el.min) / (el.max - el.min) * 100) + '%'); }
function bindRange(el, get, set, out, fmt = v => v) {
  setRange(el, get()); if (out) out.textContent = fmt(get());
  el.addEventListener('input', () => { const v = +el.value; setRange(el, v); if (out) out.textContent = fmt(v); set(v); });
}
function segmented(host, options, get, set) {
  host.innerHTML = '';
  const btns = options.map(([v, label]) => h('button', { onclick: () => { set(v); paint(); } }, label));
  const paint = () => btns.forEach((b, i) => b.classList.toggle('on', options[i][0] === get()));
  host.append(...btns); paint();
  return paint;
}

const KEYBOARDS = [];
function makeKeyboard(host, { decorate, onKey, drag = false }) {
  const board = h('div', { class: 'kb' });
  host.append(board);
  let els = new Map(), byEl = new Map(), decos = [];
  let dragging = false, dragVal;
  const keyAt = el => byEl.get(el?.closest?.('.key'));
  board.addEventListener('pointerdown', e => {
    const k = keyAt(e.target); if (!k) return;
    dragVal = onKey(k, false);
    if (drag) { dragging = true; try { board.setPointerCapture(e.pointerId); } catch {} }
  });
  board.addEventListener('pointermove', e => {
    if (!dragging) return;
    const k = keyAt(document.elementFromPoint(e.clientX, e.clientY)); if (k) onKey(k, true, dragVal);
  });
  addEventListener('pointerup', () => { dragging = false; });
  const layout = () => {
    const pad = 12, u = (board.clientWidth - pad * 2) / KB_W, g = Math.max(2, u * 0.08);
    board.style.height = (KB_H * u + pad * 2) + 'px';
    const place = (s, o) => { s.left = pad + o.x * u + 'px'; s.top = pad + o.y * u + 'px'; s.width = o.w * u - g + 'px'; s.height = o.h * u - g + 'px'; };
    for (const k of L) { const s = els.get(k.id).style; place(s, k); s.fontSize = Math.max(7, u * 0.24) + 'px'; }
    for (const [el, d] of decos) {
      if (d.t === 'knob') { const dd = Math.min(d.w, d.h) * u * 0.9; Object.assign(el.style, { left: pad + d.x * u + (d.w * u - g - dd) / 2 + 'px', top: pad + d.y * u + (d.h * u - g - dd) / 2 + 'px', width: dd + 'px', height: dd + 'px' }); }
      else place(el.style, d);
    }
  };
  const rebuild = () => {
    board.innerHTML = ''; els = new Map(); byEl = new Map();
    for (const k of L) {
      const b = h('button', { class: 'key' + (k.mod ? ' mod' : '') });
      els.set(k.id, b); byEl.set(b, k); board.append(b);
    }
    decos = LAY.deco.map(d => {
      const el = h('div', { class: d.t });
      board.append(el); return [el, d];
    });
    layout(); refresh();
  };
  const refresh = () => { for (const k of L) decorate(k, els.get(k.id)); };
  new ResizeObserver(() => requestAnimationFrame(layout)).observe(board);
  const api = { refresh, rebuild, get els() { return els; }, get decos() { return decos; } };
  KEYBOARDS.push(api);
  rebuild();
  return api;
}

// HSV wheel + RGB sliders + presets, like the driver's palette
const rgb2hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
const hex2rgb = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
function hsv2rgb(h, s, v) {
  const f = n => { const k = (n + h / 60) % 6; return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)))); };
  return [f(5), f(3), f(1)];
}
function rgb2hsv([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let hh = 0;
  if (d) hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(hh * 60 + 360) % 360, mx ? d / mx : 0, mx];
}
const PRESETS = ['#ff0000', '#ff7a00', '#ffee00', '#00e000', '#0040ff', '#00e5ff', '#ff00ff', '#ffffff', '#000000'];
function colorPicker(host, get, set) {
  const sw = h('div', { class: 'swatch' });
  const cv = h('canvas', { width: 260, height: 260 });
  const mk = h('div', { class: 'mk' });
  const wheel = h('div', { class: 'wheel' }, cv, mk);
  const ctx = cv.getContext('2d');
  const cg = ctx.createConicGradient(0, 130, 130);
  for (let i = 0; i <= 6; i++) cg.addColorStop(i / 6, `hsl(${i * 60},100%,50%)`);
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(130, 130, 130, 0, Math.PI * 2); ctx.fill();
  const rg = ctx.createRadialGradient(130, 130, 0, 130, 130, 130);
  rg.addColorStop(0, '#fff'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg; ctx.fill();
  const sliders = [], nums = [];
  const rgb = h('div', { class: 'rgb' });
  ['R', 'G', 'B'].forEach((n, i) => {
    const r = h('input', { type: 'range', min: 0, max: 255 });
    const num = h('input', { class: 'num', type: 'number', min: 0, max: 255 });
    r.addEventListener('input', () => { const c = [...get()]; c[i] = +r.value; set(c); paint(); });
    num.addEventListener('change', () => { const c = [...get()]; c[i] = clamp(+num.value || 0, 0, 255); set(c); paint(); });
    sliders.push(r); nums.push(num);
    rgb.append(h('span', { class: 'lbl' }, n), r, num);
  });
  const presets = h('div', { class: 'presets' }, PRESETS.map(p => h('button', { style: 'background:' + p, title: p, onclick: () => { set(hex2rgb(p)); paint(); } })));
  const pickAt = e => {
    const r = wheel.getBoundingClientRect();
    const dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
    const rad = Math.min(1, Math.hypot(dx, dy) / (r.width / 2));
    const hue = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    set(hsv2rgb(hue, rad, 1)); paint();
  };
  let down = false;
  wheel.addEventListener('pointerdown', e => { down = true; wheel.setPointerCapture(e.pointerId); pickAt(e); });
  wheel.addEventListener('pointermove', e => down && pickAt(e));
  wheel.addEventListener('pointerup', () => down = false);
  const paint = () => {
    const c = get();
    sw.style.background = rgb2hex(c);
    c.forEach((v, i) => { setRange(sliders[i], v); nums[i].value = v; });
    const [hh, s] = rgb2hsv(c);
    mk.style.left = 50 + Math.cos(hh * Math.PI / 180) * s * 50 + '%';
    mk.style.top = 50 + Math.sin(hh * Math.PI / 180) * s * 50 + '%';
  };
  host.append(h('div', { class: 'cp' },
    h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:10px' }, sw, wheel),
    h('div', {}, rgb, presets)));
  paint();
  return paint;
}
