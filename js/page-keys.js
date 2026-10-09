'use strict';
// =====================================================================
//  Page: Keys & layers
// =====================================================================
let layer = 'top', selKey = null, cat = 'key';
function actionLabel(a) {
  if (!a) return null;
  switch (a.t) {
    case 'key': return MODS.filter(([b]) => a.mods & b).map(([, n]) => n).concat(usageName(a.u)).join('+');
    case 'cons': return CONSUMER_NAME.get(a.u) || 'Media';
    case 'mouse': return (MOUSE.find(m => m[0] === a.b) || [0, 'Chuột'])[1];
    case 'macro': return 'M:' + (S.macros[a.slot]?.name || 'Macro ' + (a.slot + 1));
    case 'off': return 'Tắt';
  }
}
const kbKeys = makeKeyboard($('#kbKeys'), {
  decorate(k, el) {
    const a = k.slot != null ? S.keymap[layer][k.slot] : null;
    el.textContent = actionLabel(a) || k.label;
    el.classList.toggle('mapped', !!a);
    el.classList.toggle('sel', selKey?.id === k.id);
    el.classList.toggle('noslot', k.slot == null);
    el.classList.toggle('fixedkey', !!k.fixed);
    el.classList.toggle('dupkey', k.dup);
  },
  onKey(k) { selKey = k; kbKeys.refresh(); renderAssign(); },
});
function renderLayerTabs() {
  $$('[data-layer]').forEach(b => b.classList.toggle('on', b.dataset.layer === layer));
  $('#cntTop').textContent = Object.keys(S.keymap.top).length || '';
  $('#cntFn').textContent = Object.keys(S.keymap.fn).length || '';
}
$$('[data-layer]').forEach(b => b.onclick = () => { layer = b.dataset.layer; renderLayerTabs(); kbKeys.refresh(); renderAssign(); });
$('#resetLayer').onclick = e => {
  flashRadio(e.currentTarget);
  if (!confirm(`Xoá toàn bộ thay đổi của ${layer === 'top' ? 'Top' : 'Fn'} Layer?`)) return;
  S.keymap[layer] = {}; save(); kbKeys.refresh(); renderLayerTabs(); renderAssign();
  send('Khôi phục layer', k => k.keymap(layer, keymapEntries(layer)));
};
const sendKeymap = debounce(l => send(`Gán phím (${l === 'top' ? 'Top' : 'Fn'} Layer)`, k => k.keymap(l, keymapEntries(l))), 300);
function assign(a) {
  if (!selKey) return toast('Chọn một phím trên bàn phím trước', 'warn');
  if (selKey.fixed) return toast('Phím này do firmware cố định (lúc hiệu chỉnh nó vẫn gõ ra chính nó), nên không đổi chức năng được', 'warn');
  if (selKey.slot == null) return toast('Phím này chưa biết vị trí — chạy "Hiệu chỉnh sơ đồ phím" trước', 'warn');
  if (a) S.keymap[layer][selKey.slot] = a; else delete S.keymap[layer][selKey.slot];
  save(); kbKeys.refresh(); renderLayerTabs(); renderAssign(); sendKeymap(layer);
}

const CATS = [['key', 'Phím đơn'], ['combo', 'Tổ hợp phím'], ['cons', 'Đa phương tiện'], ['mouse', 'Chuột'], ['macro', 'Macro'], ['default', 'Mặc định']];
let comboMods = 0, capturing = false;
function renderAssign() {
  const cur = selKey && selKey.slot != null ? S.keymap[layer][selKey.slot] : null;
  $('#assignTitle').textContent = selKey ? `Phím: ${selKey.label.replace('\n', ' ') || 'Space'} · ${layer === 'top' ? 'Top' : 'Fn'} Layer` : 'Chọn một phím';
  $('#assignCurrent').textContent = !selKey ? '' : selKey.fixed ? 'Firmware cố định — không đổi được' : selKey.slot == null ? 'Chưa biết vị trí phím — cần hiệu chỉnh'
    : 'Hiện tại: ' + (actionLabel(cur) || 'mặc định') + (selKey.measured ? '' : ' · vị trí phím dự đoán');
  const cats = $('#cats'); cats.innerHTML = '';
  CATS.forEach(([id, n]) => cats.append(h('button', { class: cat === id ? 'on' : '', onclick: () => { cat = id; renderAssign(); } }, n)));
  const body = $('#catBody'); body.innerHTML = '';
  const isOn = a => cur && JSON.stringify(cur) === JSON.stringify(a);
  if (cat === 'key' || cat === 'combo') {
    const mods = cat === 'combo' ? comboMods : 0;
    if (cat === 'combo') body.append(h('div', { class: 'row', style: 'margin-bottom:8px' }, MODS.map(([b, n]) => {
      const c = h('input', { type: 'checkbox' }); c.checked = !!(comboMods & b);
      c.onchange = () => { comboMods ^= b; renderAssign(); };
      return h('label', { class: 'check' }, c, n);
    })));
    const cap = h('div', { class: 'capture' + (capturing ? ' rec' : ''), tabindex: 0 }, capturing ? 'Bấm phím bạn muốn gán…' : 'Bấm vào đây rồi nhấn một phím trên bàn phím để chọn nhanh');
    cap.onclick = () => { capturing = true; renderAssign(); };
    body.append(cap);
    const chips = h('div', { class: 'chips', style: 'margin-top:8px' });
    for (const [g, list] of KEY_GROUPS) {
      chips.append(h('h5', {}, g));
      for (const [u, n] of list) { const a = { t: 'key', u, mods }; chips.append(h('button', { class: 'chip' + (isOn(a) ? ' on' : ''), onclick: () => assign(a) }, n)); }
    }
    body.append(chips);
  } else if (cat === 'cons') {
    body.append(h('div', { class: 'chips' }, CONSUMER.map(([u, n]) => { const a = { t: 'cons', u }; return h('button', { class: 'chip' + (isOn(a) ? ' on' : ''), onclick: () => assign(a) }, n); })));
  } else if (cat === 'mouse') {
    body.append(h('div', { class: 'chips' }, MOUSE.map(([b, n]) => { const a = { t: 'mouse', b }; return h('button', { class: 'chip' + (isOn(a) ? ' on' : ''), onclick: () => assign(a) }, n); })),
      h('p', { class: 'small muted' }, 'Chỉ chuột trái đã được kiểm chứng; các nút khác là suy đoán.'));
  } else if (cat === 'macro') {
    if (!S.macros.length) { body.append(h('p', { class: 'muted' }, 'Chưa có macro. Vào trang Macro để tạo.')); return; }
    const m = cur?.t === 'macro' ? cur : { t: 'macro', slot: 0, mode: 0, count: 1 };
    const slot = h('select', { class: 'sel' }, S.macros.map((x, i) => { const o = h('option', { value: i }, x.name); if (i === m.slot) o.selected = true; return o; }));
    const mode = h('select', { class: 'sel' }, [[0, 'Chạy 1 lần'], [1, 'Chạy N lần'], [3, 'Lặp khi giữ phím'], [2, 'Bật/tắt (chưa kiểm chứng)']].map(([v, n]) => { const o = h('option', { value: v }, n); if (v === m.mode) o.selected = true; return o; }));
    const count = h('input', { class: 'num', type: 'number', min: 1, max: 255, value: m.count || 1 });
    body.append(h('div', { class: 'row' }, h('div', { class: 'field' }, h('label', {}, 'Macro'), slot), h('div', { class: 'field' }, h('label', {}, 'Cách chạy'), mode), h('div', { class: 'field' }, h('label', {}, 'Số lần'), count)),
      h('div', { style: 'margin-top:12px' }, h('button', { class: 'btn primary', onclick: () => assign({ t: 'macro', slot: +slot.value, mode: +mode.value, count: clamp(+count.value || 1, 1, 255) }) }, 'Gán macro')),
      h('p', { class: 'small muted' }, 'Nhớ lưu macro vào bàn phím ở trang Macro.'));
  } else {
    body.append(h('p', { class: 'muted' }, 'Trả phím về chức năng gốc.'), h('button', { class: 'btn primary', onclick: () => assign(null) }, 'Khôi phục phím này'));
  }
}
addEventListener('keydown', e => {
  if (!capturing || e.isComposing || e.keyCode === 229) return;
  e.preventDefault();
  const u = CODE2USAGE[e.code];
  capturing = false;
  if (u == null) { toast('Không nhận ra phím ' + e.code, 'warn'); renderAssign(); return; }
  assign({ t: 'key', u, mods: cat === 'combo' ? comboMods : 0 });
}, true);
renderLayerTabs(); renderAssign();
