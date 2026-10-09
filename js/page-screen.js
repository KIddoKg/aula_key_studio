'use strict';
// =====================================================================
//  Page: Screen (GIF upload)
// =====================================================================
let src = [];          // decoded frames: { bmp: ImageBitmap, ms }
let SEC_PER_CHUNK = 0.066; // measured after each upload
const fmtTime = sec => sec < 60 ? `${Math.max(1, Math.round(sec))} giây` : `${Math.floor(sec / 60)} phút ${String(Math.round(sec % 60)).padStart(2, '0')} giây`;
let srcName = '';
const SZ = () => [S.screen.w, S.screen.h];
const SIZES = [[135, 240, '135 × 240 (dọc · S75 Pro)'], [240, 135, '240 × 135 (ngang · F108 Pro)'], [128, 128, '128 × 128 (F75 Max)']];

function renderSizes() {
  const host = $('#sizeList'); host.innerHTML = '';
  for (const [w, hh, n] of SIZES)
    host.append(h('button', { class: 'radio' + (S.screen.w === w && S.screen.h === hh ? ' on' : ''), onclick: () => { S.screen.w = w; S.screen.h = hh; screenChanged(); } }, h('i'), n));
  $('#scrW').value = S.screen.w; $('#scrH').value = S.screen.h;
}
$('#scrW').onchange = e => { S.screen.w = clamp(+e.target.value || 240, 16, 320); screenChanged(); };
$('#scrH').onchange = e => { S.screen.h = clamp(+e.target.value || 135, 16, 320); screenChanged(); };

async function loadFile(file) {
  if (!file || !file.type.startsWith('image/')) return toast('Hãy chọn file ảnh hoặc GIF', 'warn');
  const frames = [];
  try {
    if ('ImageDecoder' in window && await ImageDecoder.isTypeSupported(file.type)) {
      const dec = new ImageDecoder({ data: await file.arrayBuffer(), type: file.type });
      await dec.tracks.ready;
      const n = Math.min(dec.tracks.selectedTrack?.frameCount || 1, 600);
      for (let i = 0; i < n; i++) {
        const { image } = await dec.decode({ frameIndex: i });
        const ms = image.duration ? image.duration / 1000 : (n > 1 ? 100 : 500);
        frames.push({ bmp: await createImageBitmap(image), ms: ms || 100 });
        image.close();
      }
      dec.close();
    } else {
      frames.push({ bmp: await createImageBitmap(file), ms: 500 });
    }
  } catch (e) { return toast('Không đọc được ảnh: ' + e.message, 'err'); }
  src.forEach(f => f.bmp.close?.());
  src = frames; srcName = file.name;
  screenChanged();
}
const drop = $('#drop');
drop.onclick = () => $('#file').click();
$('#file').onchange = e => loadFile(e.target.files[0]);
drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); loadFile(e.dataTransfer.files[0]); });

// Frames after skip / limit, with merged delays scaled by playback speed
function selectedFrames() {
  const { skip, maxFrames, speed } = S.screen, out = [];
  for (let i = 0; i < src.length && out.length < maxFrames; i += skip) {
    let ms = 0; for (let j = i; j < Math.min(i + skip, src.length); j++) ms += src[j].ms;
    out.push({ bmp: src[i].bmp, ms: ms / (speed / 100) });
  }
  return out;
}
function drawFrame(ctx, bmp) {
  const [W, H] = SZ(), o = S.screen;
  ctx.save();
  ctx.fillStyle = o.bg; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = o.smooth; ctx.imageSmoothingQuality = 'high';
  const turned = o.rot % 180 !== 0;
  const sw = turned ? bmp.height : bmp.width, sh = turned ? bmp.width : bmp.height;
  let sx, sy;
  if (o.fit === 'stretch') { sx = W / sw; sy = H / sh; }
  else { sx = sy = (o.fit === 'cover' ? Math.max : Math.min)(W / sw, H / sh); }
  sx *= o.zoom / 100; sy *= o.zoom / 100;
  ctx.translate(W / 2 + o.ox / 100 * W / 2, H / 2 + o.oy / 100 * H / 2);
  ctx.rotate(o.rot * Math.PI / 180);
  const [dw, dh] = turned ? [sh * sy, sw * sx] : [sw * sx, sh * sy];
  ctx.drawImage(bmp, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

const pv = $('#pv'), pvx = pv.getContext('2d');
let playTimer = null, playIdx = 0;
function play() {
  clearTimeout(playTimer);
  const fr = selectedFrames(), [W, H] = SZ();
  pv.width = W; pv.height = H;
  const scale = Math.min(380 / W, 300 / H);
  pv.style.width = W * scale + 'px'; pv.style.height = H * scale + 'px';
  if (!fr.length) { pvx.fillStyle = '#000'; pvx.fillRect(0, 0, W, H); return; }
  const tick = () => {
    const f = fr[playIdx % fr.length];
    drawFrame(pvx, f.bmp);
    playIdx++;
    playTimer = setTimeout(tick, Math.max(16, f.ms));
  };
  playIdx = 0; tick();
}
function renderStrip() {
  const host = $('#strip'); host.innerHTML = '';
  const fr = selectedFrames(), [W, H] = SZ();
  fr.slice(0, 40).forEach(f => { const c = h('canvas', { width: W, height: H }); drawFrame(c.getContext('2d'), f.bmp); host.append(c); });
  if (fr.length > 40) host.append(h('span', { class: 'small muted', style: 'align-self:center;white-space:nowrap' }, `+${fr.length - 40} khung`));
}
function encode() {
  const fr = selectedFrames(), [W, H] = SZ();
  const FB = W * H * 2, raw = 256 + fr.length * FB;
  const out = new Uint8Array(Math.ceil(raw / CHUNK) * CHUNK);
  out.fill(0xff, 0, 256);
  out[0] = fr.length;
  const cv = new OffscreenCanvas(W, H), ctx = cv.getContext('2d', { willReadFrequently: true });
  fr.forEach((f, i) => {
    out[1 + i] = clamp(Math.round(f.ms / 2), 1, 255); // delay byte ≈ 2 ms per unit
    drawFrame(ctx, f.bmp);
    const px = ctx.getImageData(0, 0, W, H).data;
    let o = 256 + i * FB;
    for (let j = 0; j < px.length; j += 4) {
      const v = ((px[j] >> 3) << 11) | ((px[j + 1] >> 2) << 5) | (px[j + 2] >> 3);
      out[o++] = v & 0xff; out[o++] = v >> 8;
    }
  });
  return out;
}
function renderScreenInfo() {
  const fr = selectedFrames(), [W, H] = SZ();
  const bytes = 256 + fr.length * W * H * 2;
  $('#pvInfo').textContent = src.length ? `${srcName} · ${src.length} khung gốc → ${fr.length} khung · ${W}×${H}` : `Chưa có ảnh · ${W}×${H}`;
  $('#sizeInfo').textContent = src.length ? `Dung lượng gửi: ${(bytes / 1048576).toFixed(2)} MB (${Math.ceil(bytes / CHUNK)} gói) · ước tính ${fmtTime(Math.ceil(bytes / CHUNK) * SEC_PER_CHUNK)}` : 'Chọn một GIF hoặc ảnh để bắt đầu';
  $('#upload').disabled = !src.length;
}
function renderScreenNotice() {
  const n = $('#screenNotice');
  n.innerHTML = '';
  if (!('hid' in navigator)) n.append(h('div', { class: 'notice err', style: 'margin-bottom:14px' }, 'Trình duyệt này không có WebHID. Mở file bằng Chrome, Edge hoặc Brave.'));
  else if (kb && !kb.data) n.append(h('div', { class: 'notice err', style: 'margin-bottom:14px' }, 'Bàn phím đang kết nối không có cổng màn hình (0xFF68), nên không tải ảnh được. Đèn, phím, macro và cài đặt vẫn dùng bình thường.'));
  else if (!kb && !MODEL.screen) n.append(h('div', { class: 'notice', style: 'margin-bottom:14px' }, `${MODEL.name} không có màn hình (hoặc chưa rõ). Nếu bàn phím của bạn có màn hình, kết nối dây và chọn kích thước ở cột bên trái.`));
  else if (!kb) n.append(h('div', { class: 'notice', style: 'margin-bottom:14px' }, 'Màn hình chỉ tải ảnh được qua dây USB. Gạt bàn phím sang chế độ có dây, cắm cáp rồi bấm nút kết nối ở góc trên.'));
}
const screenChanged = debounce(() => { save(); renderSizes(); renderScreenInfo(); play(); renderStrip(); }, 60);
segmented($('#fitSeg'), [['cover', 'Lấp đầy'], ['contain', 'Vừa khung'], ['stretch', 'Kéo giãn']], () => S.screen.fit, v => { S.screen.fit = v; screenChanged(); });
segmented($('#rotSeg'), [[0, '0°'], [90, '90°'], [180, '180°'], [270, '270°']], () => S.screen.rot, v => { S.screen.rot = v; screenChanged(); });
segmented($('#skipSeg'), [[1, 'Không'], [2, '½'], [3, '⅓'], [4, '¼']], () => S.screen.skip, v => { S.screen.skip = v; screenChanged(); });
bindRange($('#zoom'), () => S.screen.zoom, v => { S.screen.zoom = v; screenChanged(); }, $('#zoomV'), v => v + '%');
bindRange($('#gspeed'), () => S.screen.speed, v => { S.screen.speed = v; screenChanged(); }, $('#speedV'), v => (v / 100) + '×');
bindRange($('#ox'), () => S.screen.ox, v => { S.screen.ox = v; screenChanged(); }, $('#oxV'), v => v + '%');
bindRange($('#oy'), () => S.screen.oy, v => { S.screen.oy = v; screenChanged(); }, $('#oyV'), v => v + '%');
$('#maxFrames').value = S.screen.maxFrames;
$('#maxFrames').onchange = e => { S.screen.maxFrames = clamp(+e.target.value || 1, 1, 255); e.target.value = S.screen.maxFrames; screenChanged(); };
$('#smooth').checked = S.screen.smooth; $('#smooth').onchange = e => { S.screen.smooth = e.target.checked; screenChanged(); };
$('#bgc').value = S.screen.bg; $('#bgc').oninput = e => { S.screen.bg = e.target.value; screenChanged(); };
// The screen endpoint is USB full-speed HID: one 64-byte packet per 1 ms frame,
// so a 4096-byte chunk takes ~64 ms no matter what. Only less data is faster.
$('#upload').onclick = async () => {
  const payload = encode();
  const btn = $('#upload'); btn.disabled = true;
  $('#prog').style.width = '0';
  const t0 = performance.now();
  const ok = await send('Tải ảnh lên màn hình', k => k.screen(payload, (d, t) => {
    const el = (performance.now() - t0) / 1000;
    $('#prog').style.width = (d / t * 100) + '%';
    btn.textContent = `Đang tải ${Math.round(d / t * 100)}%` + (d > 5 ? ` · còn ${fmtTime(el / d * (t - d))}` : '');
  }));
  const chunks = payload.length / CHUNK;
  if (ok) { SEC_PER_CHUNK = (performance.now() - t0) / 1000 / chunks; toast(`Tải xong trong ${fmtTime(SEC_PER_CHUNK * chunks)}`); renderScreenInfo(); }
  btn.textContent = 'Tải lên bàn phím'; btn.disabled = !src.length;
};
$('#syncClock').onclick = () => send('Đồng bộ giờ', k => k.clock());
setInterval(() => $('#clockNow').textContent = new Date().toLocaleString('vi-VN'), 1000);
renderSizes(); renderScreenInfo(); play();
