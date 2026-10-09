'use strict';
// =====================================================================
//  Key-map calibration
//  The keyboard can't report which table slot a physical key uses, so we
//  temporarily remap slots to distinct keys and watch what each press types.
//  Pass 1 maps slots 0–71 to unique keys and every other slot to a marker
//  key (Numpad =); pass 2 does the same for slots 72–143.
// =====================================================================
const CAL_FLAG = 'aulastudio.calibrating';
const POOL = [
  ...[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((c, i) => ['Key' + c, 0x04 + i]),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n, i) => ['Digit' + n, 0x1e + i]),
  ['Minus', 0x2d], ['Equal', 0x2e], ['BracketLeft', 0x2f], ['BracketRight', 0x30], ['Backslash', 0x31], ['Semicolon', 0x33],
  ['Quote', 0x34], ['Backquote', 0x35], ['Comma', 0x36], ['Period', 0x37], ['Slash', 0x38],
  ['Enter', 0x28], ['Escape', 0x29], ['Backspace', 0x2a], ['Tab', 0x2b], ['Space', 0x2c],
  ['ArrowRight', 0x4f], ['ArrowLeft', 0x50], ['ArrowDown', 0x51], ['ArrowUp', 0x52],
  ['Home', 0x4a], ['PageUp', 0x4b], ['Delete', 0x4c], ['End', 0x4d], ['PageDown', 0x4e],
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n, i) => ['Numpad' + n, 0x59 + i]),
  ['NumpadDivide', 0x54], ['NumpadMultiply', 0x55], ['NumpadSubtract', 0x56], ['NumpadAdd', 0x57], ['NumpadEnter', 0x58], ['NumpadDecimal', 0x63],
].slice(0, 72);
const POOL_IDX = new Map(POOL.map(([code], i) => [code, i]));
const MARKER = ['NumpadEqual', 0x67];
const BATCH = 72;

let cal = null;
const kbCal = makeKeyboard($('#kbCal'), {
  decorate(k, el) {
    el.textContent = k.label;
    const target = cal && !cal.busy && cal.list[cal.idx]?.id === k.id;
    el.classList.toggle('target', !!target);
    el.classList.toggle('done', !!cal && k.id in cal.found);
    el.classList.toggle('later', !!cal && cal.pending.includes(k));
  },
  onKey() {},
});
function calRender() {
  if (!cal) return;
  const k = cal.list[cal.idx];
  $('#calPhase').textContent = `Lượt ${cal.phase + 1}/2`;
  $('#calMsg').innerHTML = cal.busy ? 'Đang gửi bảng phím tạm xuống bàn phím…'
    : k ? `Bấm phím <b>${(k.label || 'Space').replace('\n', ' ')}</b>` + ` <span class="muted small">(${cal.idx + 1}/${cal.list.length})</span>` + (cal.note ? `<br><span class="small" style="color:var(--warn)">${cal.note}</span>` : '')
    : 'Xong lượt này.';
  const total = L.length, done = Object.keys(cal.found).length;
  $('#calProg').style.width = (done / total * 100) + '%';
  $('#calBack').disabled = cal.busy || cal.idx === 0;
  $('#calSkip').disabled = cal.busy || !k;
  kbCal.refresh();
}
async function calLoad(phase) {
  cal.phase = phase; cal.busy = true; cal.note = '';
  calRender();
  const base = phase * BATCH, t = new Uint8Array(576);
  for (let s = 0; s < 144; s++) {
    const u = s >= base && s < base + BATCH ? POOL[s - base][1] : MARKER[1];
    t.set([0x02, 0, u, 0], s * 4);
  }
  try { localStorage.setItem(CAL_FLAG, '1'); } catch {}
  const ok = await send('Bảng phím tạm', k => k.keymap('top', t), { quiet: true });
  if (!ok) { await calClose(false); return; }
  cal.busy = false; cal.idx = 0;
  calRender();
}
async function calStart() {
  if (!kb) return toast('Cần kết nối bàn phím bằng dây trước', 'warn');
  if (!confirm('Trước khi bắt đầu: hãy TẮT bộ gõ tiếng Việt (chuyển sang ABC/English), nếu không tool sẽ nhảy sai phím.\n\nTrong lúc hiệu chỉnh, các phím sẽ gõ ra ký tự khác. Tool sẽ tự khôi phục khi xong hoặc khi bấm Huỷ. Bắt đầu?')) return;
  capturing = false; if (recording) setRecording(false);
  cal = { phase: 0, list: [...L], idx: 0, found: {}, fixed: new Set(), pending: [], busy: false, note: '', quietUntil: 0, lastAt: 0 };
  $('#calib').hidden = false;
  kbCal.rebuild();
  await calLoad(0);
}
function calAdvance() {
  cal.idx++; cal.note = '';
  if (cal.idx < cal.list.length) return calRender();
  if (cal.phase === 0 && cal.pending.length) { cal.list = cal.pending; cal.pending = []; calLoad(1); }
  else calClose(true);
}
async function calClose(keep) {
  const c = cal; cal = null;
  $('#calib').hidden = true;
  await send('Khôi phục keymap', k => k.keymap('top', keymapEntries('top')), { quiet: true });
  try { localStorage.removeItem(CAL_FLAG); } catch {}
  if (keep && c && (Object.keys(c.found).length || c.fixed.size)) {
    S.slotMap[MODEL.id] = { ...c.found }; // a run covers every key, so it replaces the old (possibly wrong) data
    S.fixedMap ??= {};
    S.fixedMap[MODEL.id] = [...c.fixed];
    save(); setModel(MODEL.id);
    toast(`Đã hiệu chỉnh ${Object.keys(c.found).length} phím cho ${MODEL.name}` + (c.fixed.size ? ` · ${c.fixed.size} phím do firmware cố định` : ''));
  }
}
addEventListener('keydown', e => {
  if (!cal) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (cal.busy || e.repeat) return;
  // Vietnamese input methods (Unikey/EVKey/OpenKey, Telex) answer a keystroke by injecting a burst of
  // fake Backspace + letter presses a few ms apart. No human presses two keys within 90 ms, so drop them.
  if (e.isComposing || e.keyCode === 229) return;
  if (performance.now() - cal.lastAt < 90) { cal.lastAt = performance.now(); return; }
  cal.lastAt = performance.now();
  const k = cal.list[cal.idx]; if (!k) return;
  if (e.code === MARKER[0]) {
    if (cal.phase === 0) { cal.pending.push(k); return calAdvance(); }
    cal.note = 'Phím này không phản hồi ở cả hai lượt — bấm "Bỏ qua".'; return calRender();
  }
  const i = POOL_IDX.get(e.code);
  if (i == null && CODE2USAGE[e.code] === k.u && k.u) {
    // The key still types its normal code, so the firmware doesn't take it from the keymap table
    // (typical for the F-row on some boards). Lighting keeps the guessed slot; remapping is disabled.
    cal.fixed.add(k.id); delete cal.found[k.id];
    const note = `${k.label.replace('\n', ' ')} vẫn gõ ra chính nó → phím này do firmware cố định, không đổi chức năng được. Đã ghi nhận, chuyển phím tiếp.`;
    calAdvance(); if (cal) { cal.note = note; calRender(); }
    return;
  }
  if (i == null) { cal.note = `Không nhận ra (${e.code || e.key}). Nếu phím này không gõ ra gì, bấm "Bỏ qua".`; return calRender(); }
  const slot = cal.phase * BATCH + i;
  const dup = Object.entries(cal.found).find(([, s]) => s === slot);
  if (dup) { cal.note = 'Phím này trùng vị trí với một phím đã bấm — có thể bạn bấm nhầm. Lùi lại nếu cần.'; }
  cal.found[k.id] = slot;
  const note = cal.note; calAdvance(); if (cal && note) { cal.note = note; calRender(); }
}, true);
addEventListener('keyup', e => { if (cal) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
$('#calSkip').onclick = e => {
  e.currentTarget.blur();
  const k = cal?.list[cal.idx];
  calAdvance();
};
$('#calBack').onclick = e => {
  e.currentTarget.blur();
  if (!cal || cal.idx === 0) return;
  cal.idx--; const k = cal.list[cal.idx];
  delete cal.found[k.id]; cal.fixed.delete(k.id); cal.pending = cal.pending.filter(p => p !== k); cal.note = ''; calRender();
};
$('#calCancel').onclick = () => calClose(false);
$('#calDone').onclick = () => calClose(true);
$('#calOpen').onclick = e => { flashRadio(e.currentTarget); calStart(); };
$('#calOpen2').onclick = calStart;
$('#calForget').onclick = () => {
  if (!S.slotMap[MODEL.id] || !confirm('Xoá dữ liệu hiệu chỉnh của ' + MODEL.name + '?')) return;
  delete S.slotMap[MODEL.id]; if (S.fixedMap) delete S.fixedMap[MODEL.id]; save(); setModel(MODEL.id);
};
