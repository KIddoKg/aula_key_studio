'use strict';
// =====================================================================
//  Page: Per-key lighting
// =====================================================================
let pkColor = [255, 106, 19], pkTool = 'paint';
const sendPerKey = debounce(async () => {
  if (!$('#pkLive').checked || !kb) return;
  if (await send('Đèn từng phím', k => k.perKey(perKeyEntries(), S.perkey.brightness), { quiet: true })) {
    S.lighting.mode = MODE_USER; save(); renderModes();
  }
}, 500);
function perKeyChanged() { save(); kbPaint.refresh(); pkInfo(); sendPerKey(); }
const kbPaint = makeKeyboard($('#kbPaint'), {
  drag: true,
  decorate(k, el) {
    el.textContent = k.label;
    const c = S.perkey.colors[k.slot];
    el.classList.toggle('paint', !!c);
    if (c) el.style.setProperty('--g', rgb2hex(c));
    el.classList.toggle('noslot', k.slot == null);
    el.classList.toggle('dupkey', k.dup);
  },
  onKey(k, isDrag) {
    if (k.slot == null) { if (!isDrag) toast('Phím này chưa biết vị trí — chạy "Hiệu chỉnh sơ đồ phím" trước', 'warn'); return; }
    if (pkTool === 'test') {
      // Light only this key (nothing saved) to check the LED really sits under the key you clicked.
      if (isDrag) return;
      if (!kb) return toast('Cần kết nối bàn phím để thử đèn', 'warn');
      const t = new Uint8Array(576);
      for (const x of L) if (x.slot != null) t.set([x.slot, 0, 0, 0], x.slot * 4);
      t.set([k.slot, 255, 255, 255], k.slot * 4);
      send('Thử đèn', kb => kb.perKey(t, 5), { quiet: true });
      toast(`Đang thắp sáng riêng phím ${(k.label || 'Space').replace('\n', ' ')} — xem trên bàn phím có đúng phím đó sáng không`);
      return;
    }
    if (pkTool === 'pick') { const c = S.perkey.colors[k.slot]; if (c) { pkColor = [...c]; paintPicker(); } pkTool = 'paint'; paintTools(); return; }
    const cur = S.perkey.colors[k.slot];
    if (pkTool === 'erase') { if (!cur) return; delete S.perkey.colors[k.slot]; }
    else { if (cur && rgb2hex(cur) === rgb2hex(pkColor)) return; S.perkey.colors[k.slot] = [...pkColor]; }
    $$('[data-for=perkey] .radio').forEach(b => b.classList.remove('on')); // hand-painted: no preset selected
    perKeyChanged();
  },
});
const pkInfo = () => $('#pkInfo').textContent = `${Object.keys(S.perkey.colors).length}/${L.filter(k => k.slot != null).length} phím có màu`;
const paintPicker = colorPicker($('#cpPaint'), () => pkColor, c => { pkColor = c; if (pkTool !== 'paint') { pkTool = 'paint'; paintTools(); } });
const paintTools = segmented($('#pkTools'), [['paint', '🖌 Tô màu'], ['erase', '⌫ Tẩy'], ['pick', '💧 Lấy màu'], ['test', '🔦 Thử đèn']], () => pkTool, v => {
  const wasTest = pkTool === 'test'; pkTool = v;
  if (v === 'test') toast('Bấm một phím trên hình: chỉ phím đó sáng trên bàn phím thật. Chọn lại "Tô màu" để quay về màu đã tô.');
  if (wasTest && v !== 'test') sendPerKey(); // put the painted colours back
});
bindRange($('#pkBright'), () => S.perkey.brightness, v => { S.perkey.brightness = v; save(); sendPerKey(); }, $('#pkBrightV'));
const fillAll = (f, btn, msg) => {
  L.forEach(k => { if (k.slot != null) { const c = f(k); c ? S.perkey.colors[k.slot] = c : delete S.perkey.colors[k.slot]; } });
  perKeyChanged();
  $$('[data-for=perkey] .radio').forEach(b => b.classList.toggle('on', b === btn)); // remember which preset is shown
  toast(msg + (kb && $('#pkLive').checked ? ' — đang gửi lên bàn phím' : ''));
};
$('#pkFillAll').onclick = e => fillAll(() => [...pkColor], e.currentTarget, 'Đã tô tất cả');
$('#pkRainbow').onclick = e => fillAll(k => hsv2rgb((k.x / KB_W) * 330, 1, 1), e.currentTarget, 'Đã tô cầu vồng');
$('#pkWasd').onclick = e => fillAll(k => ['W', 'A', 'S', 'D', '↑', '↓', '←', '→'].includes(k.name) ? [...pkColor] : S.perkey.colors[k.slot] || [40, 40, 60], e.currentTarget, 'Đã làm nổi WASD + mũi tên');
$('#pkClear').onclick = e => fillAll(() => null, e.currentTarget, 'Đã xoá hết màu');
$('#pkApply').onclick = async () => {
  if (!Object.keys(S.perkey.colors).length) return toast('Chưa có phím nào có màu — bấm lên phím để tô trước', 'warn');
  if (await send('Đèn từng phím', k => k.perKey(perKeyEntries(), S.perkey.brightness))) {
    S.lighting.mode = MODE_USER; save(); renderModes();
  }
};
pkInfo();
