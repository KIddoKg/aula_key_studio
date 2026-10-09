'use strict';
// =====================================================================
//  Page: Lighting
// =====================================================================
const sendLighting = debounce(() => send('Đèn', k => k.lighting(S.lighting), { quiet: true }), 200);
function lightingChanged() { save(); renderModes(); sendLighting(); fx.keyT.clear(); fx.events = []; renderLightHint(); renderLightControls(); }
function renderModes() {
  const host = $('#modeList'); host.innerHTML = '';
  const items = EFFECTS.map((n, i) => [i + 1, n]).concat([[MODE_OFF, 'LED Off']]);
  for (const [v, n] of items)
    host.append(h('button', { class: 'radio' + (S.lighting.mode === v ? ' on' : ''), onclick: () => { S.lighting.mode = v; lightingChanged(); } }, h('i'), n));
}
// ---------------------------------------------------------------- live preview
// An approximation of each firmware effect, so you can see roughly what you picked.
const kbLight = makeKeyboard($('#kbLight'), { decorate(k, el) { el.textContent = k.label; }, onKey(k) { fx.lastReal = performance.now(); fx.press(k); } });
const fx = {
  events: [], keyT: new Map(), seeds: new Map(), last: 0,
  seed(k) { if (!this.seeds.has(k.id)) this.seeds.set(k.id, Math.random()); return this.seeds.get(k.id); },
  t: 0, // effect clock (already scaled by speed); events are stamped with it
  lastReal: -1e9, lastDemo: -1e9,
  press(k) { this.keyT.set(k.id, this.t); this.events.push({ x: k.cx, y: k.cy, row: rowOf(k), t0: this.t }); },
};
// Row index of a key (rows = distinct y positions of the current layout).
let rowCache = { lay: null, map: new Map() };
function rowOf(k) {
  if (rowCache.lay !== LAY) {
    const ys = [...new Set(L.map(x => x.y))].sort((a, b) => a - b);
    rowCache = { lay: LAY, map: new Map(ys.map((y, i) => [y, i])) };
  }
  return rowCache.map.get(k.y) ?? 0;
}
const rowCount = () => { rowOf(L[0]); return rowCache.map.size; };
function effect(mode, k, t, l) {
  const nx = k.cx / KB_W, ny = k.cy / KB_H, d = l.direction ? 1 : 0;
  const xr = d ? 1 - nx : nx; // horizontal position, flipped by direction
  const r = Math.hypot((nx - .5) * KB_W / KB_H, ny - .5);
  const rnd = fx.seed(k), now = t;
  const since = fx.keyT.has(k.id) ? now - fx.keyT.get(k.id) : 99;
  const ring = (thick, span) => fx.events.reduce((v, e) => {
    const a = now - e.t0, dd = Math.hypot(k.cx - e.x, k.cy - e.y);
    return Math.max(v, Math.max(0, 1 - Math.abs(dd - a * span) * thick) * Math.max(0, 1 - a / 1.6));
  }, 0);
  const base = nx * 330 + ny * 30;
  switch (mode) {
    case 1: return [base, 1];
    case 2: return [base + since * 80, Math.max(0, 1 - since * .9)];
    case 3: return [base, Math.min(1, since * .9)];
    case 4: { const p = (t * 1.3 + rnd * 7) % 3; return [base, p < .3 ? .08 : 1]; } // Glittering: all lit, random keys blink off
    case 5: { const col = Math.round(k.cx * 2), drop = ((t * .9 + (col * .37) % 1) % 1.6) * KB_H; return [col * 40, Math.max(.05, 1 - Math.abs(k.cy - drop) * 1.4)]; }
    case 6: return [rnd * 360 + t * 50, .9];
    case 7: return [base + t * 15, Math.pow((Math.sin(t * 2) + 1) / 2, 1.5)];
    case 8: return [t * 70, 1];
    case 9: return [r * 400 - t * 90, .55 + .45 * Math.cos(r * 14 - t * 5)];
    case 10: return [(d ? ny : 1 - ny) * 360 - t * 140, 1];                 // Scrolling: vertical (up / down)
    case 11: return [xr * 360 - t * 140, 1];                                  // Rolling: horizontal (left / right)
    case 12: return [Math.atan2(ny - .5, nx - .5) * 180 / Math.PI + t * 140 * (d ? -1 : 1), 1]; // Rotating
    case 13: { // Explode: the pressed key's row lights up, spreading outward along that row
      const ri = rowOf(k);
      const v = fx.events.reduce((m, e) => {
        if (e.row !== ri) return m;
        const a = now - e.t0, reach = a * 9, dx = Math.abs(k.cx - e.x);
        if (dx > reach) return m;
        return Math.max(m, Math.max(0, 1 - a / 1.5) * (1 - .4 * dx / Math.max(reach, .01)));
      }, 0);
      return [base + t * 30, Math.max(.03, v)];
    }
    case 14: { // Launch: a vertical line bursts out of the pressed key and runs sideways both ways
      const v = fx.events.reduce((m, e) => {
        const a = now - e.t0, front = a * 8, dx = Math.abs(k.cx - e.x);
        return Math.max(m, Math.max(0, 1 - Math.abs(dx - front) * 1.6) * Math.max(0, 1 - a / 1.8));
      }, 0);
      return [base + t * 20, Math.max(.03, v)];
    }
    case 15: return [base + t * 30, Math.max(.04, ring(2.2, 6))];
    case 16: { // Flowing: one light runs along a row, then continues from the start of the next row
      const rows = rowCount(), path = rowOf(k) + xr, head = (t * 1.1) % (rows + 1);
      const dist = head - path;
      return [path / rows * 360, dist >= 0 && dist < .45 ? 1 - dist / .45 : .03];
    }
    case 17: return [nx * 300 + t * 15, .5 + .5 * Math.sin(nx * 13 + ny * 2) * Math.sin(t * 3)]; // Pulsating: standing wave
    case 18: { const q = xr + ny * .5; return [q * 300 - t * 130, .55 + .45 * Math.sin(q * 11 - t * 5)]; } // Tilt: diagonal stripes moving sideways
    case 19: { // Shuttle: a light runs along every row, alternate rows in opposite directions
      const ri = rowOf(k), pos = ri % 2 ? 1 - nx : nx, p = (t * .7) % 1.4 - .2;
      return [ri * 55 + t * 20, Math.max(.05, 1 - Math.abs(pos - p) * 6)];
    }
  }
  return [0, 0];
}
function renderPreview(now) {
  requestAnimationFrame(renderPreview);
  if (page !== 'lighting' || document.hidden || now - fx.last < 33) return;
  fx.last = now;
  const l = S.lighting, t = now / 1000 * (0.35 + l.speed * 0.3), br = 0.35 + l.brightness * 0.13;
  fx.t = t;
  // Reactive effects stay dark until a key is pressed; when you're not typing, demo a press now and then.
  if (REACTIVE.has(l.mode) && now - fx.lastReal > 2500 && now - fx.lastDemo > 900) {
    fx.lastDemo = now;
    fx.press(L[Math.floor(Math.random() * L.length)]);
  }
  fx.events = fx.events.filter(e => t - e.t0 < 2 && t >= e.t0);
  const els = kbLight.els;
  for (const k of L) {
    const el = els.get(k.id); if (!el) continue;
    let col = null;
    if (l.mode === MODE_USER) { const c = S.perkey.colors[k.slot]; if (c) col = `rgba(${c},${br})`; }
    else if (l.mode !== MODE_OFF) {
      const [hue, v] = effect(l.mode, k, caps(l.mode).speed ? t : 0, l);
      const multi = l.rainbow || [6, 8].includes(l.mode);
      let a = clamp(v, 0, 1) * br;
      // Wave effects move by shifting hue; with a single colour that would look frozen, so
      // turn the same wave into moving light/dark bands instead.
      if (!multi && HUE_WAVES.has(l.mode)) a *= .15 + .85 * (.5 + .5 * Math.cos(hue * Math.PI / 180));
      col = multi ? `hsla(${((hue % 360) + 360) % 360},100%,55%,${a})` : `rgba(${l.color},${a})`;
    }
    el.classList.toggle('glow', !!col); el.classList.toggle('lit', !!col);
    if (col) el.style.setProperty('--g', col);
  }
}
requestAnimationFrame(renderPreview);
const REACTIVE = new Set([2, 3, 13, 14, 15]);
const HUE_WAVES = new Set([9, 10, 11, 12, 18]);
addEventListener('keydown', e => {
  if (page !== 'lighting' || e.repeat || cal) return;
  const u = CODE2USAGE[e.code], k = u != null && L.find(x => x.u === u);
  if (k) { fx.lastReal = performance.now(); fx.press(k); }
});
function renderLightHint() {
  $('#lightHint').textContent = REACTIVE.has(S.lighting.mode)
    ? 'Hiệu ứng này sáng theo phím bấm. Đang tự chạy thử — gõ phím thật (hoặc bấm vào phím trên hình) để xem đúng chỗ bạn bấm.' : '';
}
bindRange($('#lBright'), () => S.lighting.brightness, v => { S.lighting.brightness = v; lightingChanged(); }, $('#lBrightV'));
bindRange($('#lSpeed'), () => S.lighting.speed, v => { S.lighting.speed = v; lightingChanged(); }, $('#lSpeedV'));
function renderLightControls() {
  const c = caps(S.lighting.mode), on = S.lighting.mode !== MODE_OFF && S.lighting.mode !== MODE_USER;
  $('#lSpeedBox').hidden = !on || !c.speed;
  $('#lDirBox').hidden = !on || !c.dir;
  $('#lColorBox').hidden = on && !c.color;
  $('#lNoColor').hidden = !(on && !c.color);
  if (c.dir) segmented($('#lDir'), c.dir === 'ud' ? [[0, '▲ Lên'], [1, '▼ Xuống']] : [[0, '◀ Trái'], [1, '▶ Phải']],
    () => S.lighting.direction, v => { S.lighting.direction = v; lightingChanged(); });
}
if (S.lighting.direction > 1) S.lighting.direction = 0; // older versions offered 4 values; the firmware takes 0/1
$('#lRainbow').checked = S.lighting.rainbow;
$('#lRainbow').onchange = e => { S.lighting.rainbow = e.target.checked; lightingChanged(); };
colorPicker($('#cpLight'), () => S.lighting.color, c => {
  S.lighting.color = c;
  if (S.lighting.rainbow) { S.lighting.rainbow = false; $('#lRainbow').checked = false; }
  if (S.lighting.mode === MODE_OFF || S.lighting.mode === MODE_USER) S.lighting.mode = 1;
  lightingChanged();
});
renderModes(); renderLightHint(); renderLightControls();
