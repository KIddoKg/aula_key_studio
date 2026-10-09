'use strict';
// =====================================================================
//  Connection
// =====================================================================
let kb = null;
const onPage = (d, p) => d.collections.some(c => c.usagePage === p);
// Any SONiX-based AULA board: the config interface (0xFF13) is required, the screen interface (0xFF68) is optional.
const ours = d => onPage(d, 0xff13) && (d.vendorId === VID || /aula/i.test(d.productName));
const sameBoard = (a, b) => a.vendorId === b.vendorId && a.productId === b.productId && a.productName === b.productName;

function pickPair(devs) {
  const ctrl = devs.find(ours);
  if (!ctrl) return null;
  const data = devs.find(d => onPage(d, 0xff68) && sameBoard(d, ctrl)) || null;
  return { ctrl, data };
}
async function connect(interactive) {
  if (!('hid' in navigator)) {
    if (interactive) toast('Trình duyệt này không hỗ trợ WebHID. Hãy mở file bằng Chrome, Edge hoặc Brave.', 'err');
    return;
  }
  let pair = pickPair(await navigator.hid.getDevices());
  if (!pair && interactive) {
    try { await navigator.hid.requestDevice({ filters: [{ vendorId: VID }, { usagePage: 0xff13 }] }); } catch { return; }
    pair = pickPair(await navigator.hid.getDevices());
  }
  if (!pair) {
    if (interactive) toast('Không tìm thấy cổng cấu hình. Hãy cắm dây USB (không dùng dongle/Bluetooth). Mẫu dùng chip khác sẽ không hỗ trợ.', 'err');
    return;
  }
  try {
    for (const d of [pair.ctrl, pair.data]) if (d && !d.opened) await d.open();
  } catch (e) {
    toast('Không mở được thiết bị: ' + e.message + '. Hãy đóng các app khác đang dùng bàn phím.', 'err');
    return;
  }
  kb = new Keyboard(pair.ctrl, pair.data);
  const name = pair.ctrl.productName || 'bàn phím';
  const found = MODELS.find(m => m.match?.test(name));
  detected = { name, model: found || null };
  if (found) { if (found.id !== S.model) setModel(found.id); toast(`Tự nhận mẫu: ${found.name} (tên USB "${name}")`); }
  else toast(`Không nhận ra mẫu "${name}" — chọn sơ đồ phù hợp ở menu trên cùng`, 'warn');
  renderModelSel(); renderConn();
  if (!S.slotMap[MODEL.id]) toast('Sơ đồ phím chưa được hiệu chỉnh — nên chạy "Hiệu chỉnh sơ đồ phím" một lần (1–2 phút) để đèn từng phím và gán phím chính xác', 'warn');
  toast('Đã kết nối ' + name);
  try {
    if (localStorage.getItem(CAL_FLAG)) { // a calibration was interrupted: put the real keymap back
      await send('Khôi phục keymap sau hiệu chỉnh dở', k => k.keymap('top', keymapEntries('top')));
      localStorage.removeItem(CAL_FLAG);
    }
  } catch {}
  send('Đồng bộ giờ', k => k.clock(), { quiet: true });
}
if ('hid' in navigator) navigator.hid.addEventListener('disconnect', e => {
  if (kb && (e.device === kb.ctrl || e.device === kb.data)) { kb = null; waitSkipped = false; renderConn(); toast('Bàn phím đã ngắt kết nối', 'warn'); }
});
const hex4 = n => n.toString(16).toUpperCase().padStart(4, '0');
function renderConn() {
  renderWait();
  $('#connBtn').classList.toggle('on', !!kb);
  $('#connText').textContent = kb ? 'Đã kết nối (dây)' : 'Chưa kết nối';
  $('#devInfo').innerHTML = kb
    ? `Tên USB: <b>${kb.ctrl.productName}</b><br>USB ID: ${hex4(kb.ctrl.vendorId)}:${hex4(kb.ctrl.productId)}<br>Cổng cấu hình 0xFF13: có · Cổng màn hình 0xFF68: ${kb.data ? 'có' : 'không'}`
    : 'Chưa kết nối. Cắm dây USB-C rồi bấm nút kết nối ở góc trên.';
  renderScreenNotice();
}
$('#connBtn').onclick = () => connect(true);
// Waiting screen: shown while no keyboard is connected, until the user chooses to look around without one.
let waitSkipped = false;
function renderWait() {
  const w = $('#waitScreen');
  w.hidden = !!kb || waitSkipped;
  if (!('hid' in navigator)) {
    $('#waitMsg').innerHTML = '<span style="color:var(--err)">Trình duyệt này không hỗ trợ WebHID.</span> Hãy mở file bằng Chrome, Edge hoặc Brave.';
    $('#waitConnect').disabled = true;
  }
}
$('#waitConnect').onclick = () => connect(true);
$('#waitSkip').onclick = () => { waitSkipped = true; renderWait(); };
// The browser reports newly plugged devices it already has permission for: connect to them automatically.
if ('hid' in navigator) navigator.hid.addEventListener('connect', () => { if (!kb) connect(false); });

// ---------------------------------------------------------------- model picker
let detected = null; // { name, model } from the last connection
function renderModelSel() {
  const sel = $('#modelSel'); sel.innerHTML = '';
  const named = h('optgroup', { label: 'Mẫu AULA' }), generic = h('optgroup', { label: 'Sơ đồ chung (mẫu khác)' });
  for (const m of MODELS) {
    const o = h('option', { value: m.id }, m.name + (S.slotMap[m.id] ? ' ✓' : ''));
    if (m.id === S.model) o.selected = true;
    (m.generic ? generic : named).append(o);
  }
  sel.append(named, generic);
  const measured = L.filter(k => k.measured).length, unknown = L.filter(k => k.slot == null).length;
  const status = measured ? `<span class="badge ok">đã hiệu chỉnh ${measured}/${L.length} phím</span>`
    : `<span class="badge warn">vị trí phím đang dự đoán</span>`;
  const how = detected ? (detected.model?.id === MODEL.id ? `<span class="badge ok">tự nhận từ USB</span>` : `<span class="badge warn">chọn tay (USB: ${detected.name})</span>`) : '';
  $('#modelInfo').innerHTML = `<b style="color:#fff">${MODEL.name}</b> ${how} ${status}<br>Sơ đồ: ${LAYOUTS[MODEL.layout].name} · ${L.length} phím` +
    (unknown ? ` · ${unknown} phím chưa biết vị trí` : '') +
    `<br>Màn hình: ${MODEL.screen ? MODEL.screen.join(' × ') : 'không có / chưa rõ'}` +
    (MODEL.verified ? ' (đã được kiểm chứng)' : '');
  for (const b of $$('.calBanner')) {
    b.innerHTML = '';
    if (DUPS.length) {
      const names = [...new Set(DUPS.map(k => (k.label || 'Space').replace('\n', ' ')))].join(', ');
      b.append(h('div', { class: 'notice err', style: 'margin-bottom:12px;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap' },
        h('span', {}, `Các phím ${names} đang bị trùng vị trí (viền đỏ) nên tô/gán phím này sẽ đổi luôn phím kia. Hãy hiệu chỉnh lại (tắt bộ gõ tiếng Việt trước).`),
        h('button', { class: 'btn primary', onclick: calStart }, 'Hiệu chỉnh lại')));
      continue;
    }
    if (measured) continue;
    b.append(h('div', { class: 'notice', style: 'margin-bottom:12px;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap' },
      h('span', {}, `Vị trí phím của ${MODEL.name} đang là dự đoán. Bàn phím không cho đọc sơ đồ phím, nên cần hiệu chỉnh một lần (bấm lần lượt từng phím, khoảng 1–2 phút).`),
      h('button', { class: 'btn primary', onclick: calStart }, 'Hiệu chỉnh ngay')));
  }
  $('#calState').innerHTML = measured ? `Đã hiệu chỉnh ${measured}/${L.length} phím.` : 'Vị trí phím đang là <b>dự đoán</b>. Nên chạy hiệu chỉnh một lần để chính xác.';
}
$('#modelSel').onchange = e => setModel(e.target.value);
function setModel(id) {
  S.model = id; loadModel(); save();
  if (MODEL.screen) { [S.screen.w, S.screen.h] = MODEL.screen; }
  selKey = null;
  KEYBOARDS.forEach(k => k.rebuild());
  renderModelSel(); renderAssign(); pkInfo(); screenChanged(); renderScreenNotice();
}


let busyCount = 0;
async function send(label, fn, { quiet = false } = {}) {
  if (!kb) { if (!quiet) toast('Chưa kết nối — đã lưu, bấm nút kết nối rồi thử lại', 'warn'); return false; }
  busyCount++; $('#busy').classList.add('show');
  try { await fn(kb); if (!quiet) toast(label + ' ✓'); return true; }
  catch (e) { console.error(e); toast(label + ' lỗi: ' + e.message, 'err'); return false; }
  finally { if (--busyCount === 0) $('#busy').classList.remove('show'); }
}
function toast(msg, kind = 'ok') {
  const t = h('div', { class: 'toast ' + kind }, msg);
  $('#toasts').append(t);
  setTimeout(() => t.remove(), kind === 'err' ? 6000 : 2800);
}
const flashRadio = b => { b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 600); };
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
