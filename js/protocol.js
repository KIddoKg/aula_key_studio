'use strict';
// =====================================================================
//  Protocol (wired, 0C45:800A)
//  Control: vendor page 0xFF13, 64-byte feature reports, every write is
//           04 18 (begin) → 04 TT SS … NN (target) → NN×64 data → 04 02 (end)
//  Screen:  vendor page 0xFF68, 4096-byte output reports, each acked 01 5A
// =====================================================================
const VID = 0x0c45, PID = 0x800a;
const PKT = 64, CHUNK = 4096;

function packet(bytes, size = PKT, markerAt = -1) {
  const p = new Uint8Array(size);
  p.set(bytes);
  if (markerAt >= 0) { p[markerAt] = 0xaa; p[markerAt + 1] = 0x55; }
  return p;
}

class Keyboard {
  constructor(ctrl, data) { this.ctrl = ctrl; this.data = data; this.queue = Promise.resolve(); }

  serial(fn) {
    const next = this.queue.then(fn, fn);
    this.queue = next.catch(() => {});
    return next;
  }
  // The controller sometimes refuses a report while still busy; back off and retry.
  async feature(bytes) {
    const p = bytes instanceof Uint8Array && bytes.length === PKT ? bytes : packet(bytes);
    for (let n = 1; ; n++) {
      try { return await this.ctrl.sendFeatureReport(0, p); }
      catch (e) { if (n >= 4) throw e; await sleep(60 * n); }
    }
  }
  async cmd(bytes) {
    await this.feature(bytes);
    await sleep(20);
    const r = await this.ctrl.receiveFeatureReport(0);
    return new Uint8Array(r.buffer, r.byteOffset, r.byteLength);
  }
  write(target, sub, data, begin = 0x18) {
    return this.serial(async () => {
      const n = data.length / PKT;
      await this.cmd([0x04, begin]);
      await this.cmd([0x04, target, sub, 0, 0, 0, 0, 0, n]);
      for (let i = 0; i < n; i++) { await this.feature(data.slice(i * PKT, (i + 1) * PKT)); await sleep(40); }
      await this.cmd([0x04, 0x02]);
    });
  }
  table(entries) { // 144 × 4-byte slots, AA 55 in the last two bytes
    const t = new Uint8Array(576);
    t.set(entries.subarray(0, 574));
    t[574] = 0xaa; t[575] = 0x55;
    return t;
  }

  lighting(l) {
    let body;
    if (l.mode === MODE_OFF) body = [];
    else if (l.mode === MODE_USER) body = [MODE_USER, 0, 0, 0, 0, 0, 0, 0, 0, l.brightness];
    else body = [l.mode, ...l.color, 0, 0, 0, 0, l.rainbow ? 1 : 0, l.brightness, l.speed, l.direction];
    return this.write(0x13, 0, packet(body, PKT, 14));
  }
  system(s) {
    return this.write(0x17, 1, packet([0, 1, +s.altTab, +s.altF4, +s.win, 0, s.sleep, 0, s.response], PKT, 62));
  }
  clock(d = new Date()) {
    return this.write(0x28, 0, packet([0, 1, 0x5a, d.getFullYear() - 2000, d.getMonth() + 1, d.getDate(),
      d.getHours(), d.getMinutes(), d.getSeconds(), 0, d.getDay()], PKT, 62));
  }
  keymap(layer, entries) { return this.write(layer === 'top' ? 0x11 : 0x27, 0, this.table(entries)); }
  async perKey(entries, brightness) {
    await this.lighting({ mode: MODE_USER, brightness });
    await this.write(0x23, 0, this.table(entries));
  }
  macros(mem) {
    const out = new Uint8Array(512);
    out.set(mem.subarray(0, 510));
    out[510] = 0xaa; out[511] = 0x55;
    return this.write(0x15, 0, out, 0x19);
  }
  screen(payload, onProgress) {
    if (!this.data) return Promise.reject(new Error('bàn phím này không có cổng màn hình'));
    const chunks = payload.length / CHUNK;
    return this.serial(async () => {
      await this.cmd([0x04, 0x18]);
      await this.cmd([0x04, 0x72, 1, 0, 0, 0, 0, 0, chunks & 0xff, chunks >> 8]);
      try {
        for (let i = 0; i < chunks; i++) {
          await this.sendChunk(payload.slice(i * CHUNK, (i + 1) * CHUNK), i);
          onProgress?.(i + 1, chunks);
        }
      } finally { await this.cmd([0x04, 0x02]); }
    });
  }
  sendChunk(chunk, i) {
    return new Promise((resolve, reject) => {
      const done = err => { clearTimeout(t); this.data.removeEventListener('inputreport', on); err ? reject(err) : resolve(); };
      const on = e => { const v = e.data; if (v.getUint8(0) === 0x01 && v.getUint8(1) === 0x5a) done(); };
      const t = setTimeout(() => done(new Error('bàn phím không phản hồi ở gói ' + i)), 4000);
      this.data.addEventListener('inputreport', on);
      this.data.sendReport(0, chunk).catch(done);
    });
  }
}

// Builders shared by "apply" buttons
function actionBytes(a) {
  switch (a?.t) {
    case 'key': return [0x02, a.mods || 0, a.u, 0];
    case 'cons': return [0x03, a.u & 0xff, a.u >> 8, 0];
    case 'mouse': return [0x01, a.b, 0x01, 0];
    case 'macro': return [0x06, a.slot, a.mode, a.mode === 1 ? a.count : 0];
    default: return [0, 0, 0, 0];
  }
}
function keymapEntries(layer) {
  const t = new Uint8Array(576);
  for (const [i, a] of Object.entries(S.keymap[layer])) t.set(actionBytes(a), +i * 4);
  return t;
}
function perKeyEntries() {
  const t = new Uint8Array(576);
  for (const k of L) if (k.slot != null) t.set([k.slot, ...(S.perkey.colors[k.slot] || [0, 0, 0])], k.slot * 4);
  return t;
}
const MACRO_BASE = 0x190, MACRO_MAX = 510;
const macroSize = m => 8 + 4 * m.steps.length;
const macroUsed = () => MACRO_BASE + S.macros.reduce((n, m) => n + macroSize(m), 0);
function macroMemory() {
  const used = macroUsed();
  if (used > MACRO_MAX) throw new Error(`macro dùng ${used - MACRO_BASE} byte, tối đa ${MACRO_MAX - MACRO_BASE}`);
  const mem = new Uint8Array(used), v = new DataView(mem.buffer);
  let at = MACRO_BASE;
  S.macros.forEach((m, i) => {
    v.setUint32(i * 4, at, true);
    v.setUint32(at, m.steps.length, true);
    m.steps.forEach((s, j) => {
      const w = s.t === 'w' ? (0x50 << 24) | clamp(Math.round(s.ms), 0, 0xffffff)
        : s.t === 'k' ? ((s.d ? 0xb0 : 0x30) << 24) | (s.u << 16)
        : ((s.d ? 0x90 : 0x10) << 24) | (s.b << 16);
      v.setUint32(at + 8 + j * 4, w >>> 0, true);
    });
    at += macroSize(m);
  });
  return mem;
}
