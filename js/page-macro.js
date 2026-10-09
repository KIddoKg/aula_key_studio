'use strict';
// =====================================================================
//  Page: Macro
// =====================================================================
let macroSel = 0, recording = false, lastT = 0;
function renderMacros() {
  const list = $('#macroList'); list.innerHTML = '';
  S.macros.forEach((m, i) => list.append(h('button', { class: 'listitem' + (i === macroSel ? ' on' : ''), onclick: () => { macroSel = i; renderMacros(); } }, m.name, h('small', {}, m.steps.length))));
  if (!S.macros.length) list.append(h('p', { class: 'small muted', style: 'padding:0 8px' }, 'Bấm + để tạo macro.'));
  const m = S.macros[macroSel];
  $('#macroTitle').textContent = m ? m.name : 'Chưa chọn macro';
  $('#recBtn').disabled = !m;
  const tb = $('#stepBody'); tb.innerHTML = '';
  m?.steps.forEach((s, i) => {
    let tag, desc;
    if (s.t === 'w') {
      tag = h('span', { class: 'tag w' }, 'TRỄ');
      const n = h('input', { class: 'num', type: 'number', min: 0, value: s.ms });
      n.onchange = () => { s.ms = clamp(+n.value || 0, 0, 0xffffff); save(); };
      desc = h('span', {}, n, ' ms');
    } else {
      tag = h('span', { class: 'tag ' + (s.d ? 'd' : 'u') }, s.d ? 'NHẤN' : 'NHẢ');
      desc = s.t === 'k' ? usageName(s.u) : (MOUSE.find(x => x[0] === s.b) || [0, 'Chuột'])[1];
    }
    tb.append(h('tr', {}, h('td', {}, i + 1), h('td', {}, tag), h('td', {}, desc),
      h('td', { style: 'text-align:right' }, h('button', { class: 'link', onclick: () => { m.steps.splice(i, 1); save(); renderMacros(); } }, 'xoá'))));
  });
  const used = macroUsed() - MACRO_BASE, cap = MACRO_MAX - MACRO_BASE;
  $('#memMeter i').style.width = Math.min(100, used / cap * 100) + '%';
  $('#memMeter').classList.toggle('full', used > cap);
  $('#memText').textContent = `${used} / ${cap} byte` + (used > cap ? ' — quá giới hạn, hãy bớt bước' : '');
}
$('#mNew').onclick = () => { S.macros.push({ name: 'Macro ' + (S.macros.length + 1), steps: [] }); macroSel = S.macros.length - 1; save(); renderMacros(); };
$('#mRen').onclick = () => { const m = S.macros[macroSel]; if (!m) return; const n = prompt('Tên macro', m.name); if (n) { m.name = n.slice(0, 24); save(); renderMacros(); } };
$('#mDel').onclick = () => {
  const m = S.macros[macroSel]; if (!m || !confirm(`Xoá "${m.name}"?`)) return;
  S.macros.splice(macroSel, 1);
  // keys pointing at later slots shift down; keys pointing at the deleted one go back to default
  for (const l of ['top', 'fn']) for (const [i, a] of Object.entries(S.keymap[l])) if (a.t === 'macro') {
    if (a.slot === macroSel) delete S.keymap[l][i]; else if (a.slot > macroSel) a.slot--;
  }
  macroSel = Math.max(0, macroSel - 1); save(); renderMacros(); kbKeys.refresh();
};
function recPush(step) {
  const m = S.macros[macroSel]; const now = performance.now();
  if (m.steps.length && lastT) m.steps.push({ t: 'w', ms: $('#realTiming').checked ? Math.max(1, Math.round(now - lastT)) : +$('#fixedDelay').value || 10 });
  m.steps.push(step); lastT = now; renderMacros();
}
function setRecording(on) {
  recording = on;
  const b = $('#recBtn');
  b.textContent = on ? '■ Dừng ghi' : '● Bắt đầu ghi';
  $('#recPad').classList.toggle('capture', on); $('#recPad').classList.toggle('rec', on);
  if (on) { lastT = 0; }
  else { const m = S.macros[macroSel]; if (m?.steps.length && m.steps.at(-1).t !== 'w') m.steps.push({ t: 'w', ms: +$('#fixedDelay').value || 10 }); save(); renderMacros(); }
}
$('#recBtn').onclick = e => { e.currentTarget.blur(); setRecording(!recording); };
addEventListener('keydown', e => { if (!recording || e.repeat || e.isComposing || e.keyCode === 229) return; const u = CODE2USAGE[e.code]; if (u == null) return; e.preventDefault(); recPush({ t: 'k', u, d: true }); }, true);
addEventListener('keyup', e => { if (!recording) return; const u = CODE2USAGE[e.code]; if (u == null) return; e.preventDefault(); recPush({ t: 'k', u, d: false }); }, true);
const btnOf = e => [1, 4, 2, 8, 16][e.button] || 1;
$('#recPad').addEventListener('mousedown', e => { if (recording) { e.preventDefault(); recPush({ t: 'm', b: btnOf(e), d: true }); } });
$('#recPad').addEventListener('mouseup', e => { if (recording) recPush({ t: 'm', b: btnOf(e), d: false }); });
$('#recPad').addEventListener('contextmenu', e => recording && e.preventDefault());
$('#addDelay').onclick = () => { const m = S.macros[macroSel]; if (!m) return; m.steps.push({ t: 'w', ms: 50 }); save(); renderMacros(); };
$('#clearSteps').onclick = () => { const m = S.macros[macroSel]; if (m && confirm('Xoá hết các bước?')) { m.steps = []; save(); renderMacros(); } };
$('#saveMacros').onclick = () => { let mem; try { mem = macroMemory(); } catch (e) { return toast(e.message, 'err'); } send('Lưu macro', k => k.macros(mem)); };
renderMacros();
