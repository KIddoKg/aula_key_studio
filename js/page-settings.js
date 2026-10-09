'use strict';
// =====================================================================
//  Page: Settings
// =====================================================================
segmented($('#sleepSeg'), [[0, 'Không'], [1, '1 phút'], [2, '5 phút'], [3, '30 phút']], () => S.system.sleep, v => { S.system.sleep = v; save(); });
bindRange($('#resp'), () => S.system.response, v => { S.system.response = v; save(); }, $('#respV'));
for (const [id, key] of [['dWin', 'win'], ['dAltTab', 'altTab'], ['dAltF4', 'altF4']]) {
  $('#' + id).checked = S.system[key];
  $('#' + id).onchange = e => { S.system[key] = e.target.checked; save(); };
}
$('#applySys').onclick = () => send('Cài đặt hệ thống', k => k.system(S.system));
async function sendAll() {
  let mem; try { mem = macroMemory(); } catch (e) { return toast(e.message, 'err'); }
  await send('Gửi tất cả', async k => {
    await k.system(S.system);
    await k.keymap('top', keymapEntries('top'));
    await k.keymap('fn', keymapEntries('fn'));
    await k.macros(mem);
    if (S.lighting.mode === MODE_USER) await k.perKey(perKeyEntries(), S.perkey.brightness);
    else await k.lighting(S.lighting);
    await k.clock();
  });
}
$('#sendAll').onclick = sendAll;
$('#backup').onclick = () => {
  const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify({ app: 's75studio', v: 2, state: { ...S } }, null, 2)], { type: 'application/json' })), download: 'aula-studio-backup.json' });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('#restoreBtn').onclick = () => $('#restoreFile').click();
$('#restoreFile').onchange = async e => {
  try {
    const j = JSON.parse(await e.target.files[0].text());
    if (j.app !== 's75studio') throw new Error('không phải file sao lưu của Aula Key Studio');
    localStorage.setItem(STORE, JSON.stringify(j.state));
    S = loadState(); refreshAll(); toast('Đã khôi phục. Bấm "Gửi tất cả" để áp dụng lên bàn phím.');
  } catch (err) { toast('Khôi phục lỗi: ' + err.message, 'err'); }
  e.target.value = '';
};
$('#factory').onclick = () => {
  if (!confirm('Đưa mọi cài đặt về mặc định và gửi lên bàn phím?')) return;
  const keepModel = S.model, keepSlots = S.slotMap;
  S = structuredClone(DEFAULT); S.model = keepModel; S.slotMap = keepSlots; save(); refreshAll(); sendAll();
};
function refreshAll() {
  setModel(S.model); renderModes(); renderLayerTabs(); renderMacros();
  setRange($('#lBright'), S.lighting.brightness); $('#lBrightV').textContent = S.lighting.brightness;
  setRange($('#lSpeed'), S.lighting.speed); $('#lSpeedV').textContent = S.lighting.speed;
  $('#lRainbow').checked = S.lighting.rainbow;
  setRange($('#resp'), S.system.response); $('#respV').textContent = S.system.response;
  $('#dWin').checked = S.system.win; $('#dAltTab').checked = S.system.altTab; $('#dAltF4').checked = S.system.altF4;
  screenChanged();
}
