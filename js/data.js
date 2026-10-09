'use strict';
// =====================================================================
//  Data: layout, key names
// =====================================================================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const h = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'style') e.style.cssText = v;
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c);
  return e;
};

// ---------------------------------------------------------------------
// Layouts. Each row is "y: tokens"; a token is a key name, optionally
// "*width" and "^height", "_gap" moves right, "#" is the knob, "LCD" the screen.
// ---------------------------------------------------------------------
const MAIN = {
  num: "` 1 2 3 4 5 6 7 8 9 0 - = Bksp*2",
  num65: "Esc 1 2 3 4 5 6 7 8 9 0 - = Bksp*2",
  top: "Tab*1.5 Q W E R T Y U I O P [ ] \\*1.5",
  home: "Caps*1.75 A S D F G H J K L ; ' Enter*2.25",
  shift: "LShift*2.25 Z X C V B N M , . /",
  fkeys: "Esc _.25 F1 F2 F3 F4 _.25 F5 F6 F7 F8 _.25 F9 F10 F11 F12",
  fkeysTkl: "Esc _1 F1 F2 F3 F4 _.5 F5 F6 F7 F8 _.5 F9 F10 F11 F12",
  bottom: "LCtrl*1.25 Win*1.25 LAlt*1.25 Space*6.25",
};
const LAYOUTS = {
  '60': { name: '60%', rows: [
    [0, MAIN.num65], [1, MAIN.top], [2, MAIN.home], [3, MAIN.shift + " RShift*2.75"],
    [4, MAIN.bottom + " RAlt*1.25 Fn*1.25 Menu*1.25 RCtrl*1.25"]] },
  '65': { name: '65%', rows: [
    [0, MAIN.num65 + " Del"], [1, MAIN.top + " PgUp"], [2, MAIN.home + " PgDn"], [3, MAIN.shift + " RShift*1.75 ↑ End"],
    [4, MAIN.bottom + " RAlt Fn RCtrl ← ↓ →"]] },
  '75': { name: '75% có núm xoay', rows: [
    [0, MAIN.fkeys + " _1.25 #"], [1.25, MAIN.num + " Del"], [2.25, MAIN.top + " PgUp"], [3.25, MAIN.home + " PgDn"],
    [4.25, MAIN.shift + " RShift*1.75 ↑ End"], [5.25, MAIN.bottom + " RAlt Fn RCtrl ← ↓ →"]] },
  's75': { name: '75% có màn hình (S75)', rows: [
    [0, MAIN.fkeys + " _.25 Del _.25 #"], [1.25, MAIN.num + " _.25 Home"], [2.25, MAIN.top + " _.25 End"],
    [3.25, MAIN.home + " _.25 LCD*1^2"], [4.25, MAIN.shift + " RShift*1.75 _.25 ↑"], [5.25, MAIN.bottom + " RAlt Fn RCtrl _.25 ← ↓ →"]] },
  'tkl': { name: 'TKL 80% (87 phím)', rows: [
    [0, MAIN.fkeysTkl + " _.25 PrtSc ScrLk Pause"], [1.25, MAIN.num + " _.25 Ins Home PgUp"], [2.25, MAIN.top + " _.25 Del End PgDn"],
    [3.25, MAIN.home], [4.25, MAIN.shift + " RShift*2.75 _1.25 ↑"],
    [5.25, MAIN.bottom + " RAlt*1.25 Fn*1.25 Menu*1.25 RCtrl*1.25 _.25 ← ↓ →"]] },
  '96': { name: '96% / 98% (có numpad gọn)', rows: [
    [0, MAIN.fkeys + " _1.5 Del Home End #"], [1.25, MAIN.num + " _.25 Num N/ N* N-"], [2.25, MAIN.top + " _.25 N7 N8 N9 N+^2"],
    [3.25, MAIN.home + " _.25 N4 N5 N6"], [4.25, MAIN.shift + " RShift*1.75 ↑ _.25 N1 N2 N3 NEnter^2"],
    [5.25, MAIN.bottom + " RAlt Fn RCtrl ← ↓ → _.25 N0 N."]] },
  'full': { name: 'Full 100%', rows: [
    [0, MAIN.fkeysTkl + " _.25 PrtSc ScrLk Pause"], [1.25, MAIN.num + " _.25 Ins Home PgUp _.25 Num N/ N* N-"],
    [2.25, MAIN.top + " _.25 Del End PgDn _.25 N7 N8 N9 N+^2"], [3.25, MAIN.home + " _3.5 N4 N5 N6"],
    [4.25, MAIN.shift + " RShift*2.75 _1.25 ↑ _1.25 N1 N2 N3 NEnter^2"],
    [5.25, MAIN.bottom + " RAlt*1.25 Fn*1.25 Menu*1.25 RCtrl*1.25 _.25 ← ↓ → _.25 N0*2 N."]] },
  'fullScreen': { name: 'Full 100% có màn hình', rows: [
    [0, MAIN.fkeysTkl + " _.25 PrtSc ScrLk Pause _.25 LCD*3 #"], [1.25, MAIN.num + " _.25 Ins Home PgUp _.25 Num N/ N* N-"],
    [2.25, MAIN.top + " _.25 Del End PgDn _.25 N7 N8 N9 N+^2"], [3.25, MAIN.home + " _3.5 N4 N5 N6"],
    [4.25, MAIN.shift + " RShift*2.75 _1.25 ↑ _1.25 N1 N2 N3 NEnter^2"],
    [5.25, MAIN.bottom + " RAlt*1.25 Fn*1.25 Menu*1.25 RCtrl*1.25 _.25 ← ↓ → _.25 N0*2 N."]] },
};

// Known AULA models. `screen` is the default upload size (null = no screen / unknown).
// Every model here is assumed to use the SONiX controller protocol; only the
// F75 Max (128×128) and F108 Pro (240×135) have been confirmed by other projects.
const MODELS = [
  { id: 's75pro', name: 'AULA S75 Pro', match: /S75/i, layout: 's75', screen: [135, 240], verified: true },
  { id: 'f75max', name: 'AULA F75 Max', match: /F75.?MAX/i, layout: '75', screen: [128, 128], verified: true },
  { id: 'f75pro', name: 'AULA F75 Pro', match: /F75.?PRO/i, layout: '75', screen: null },
  { id: 'f75', name: 'AULA F75', match: /F75/i, layout: '75', screen: null },
  { id: 'f65', name: 'AULA F65', match: /F65/i, layout: '65', screen: null },
  { id: 'f87pro', name: 'AULA F87 Pro', match: /F87.?PRO/i, layout: 'tkl', screen: null },
  { id: 'f87', name: 'AULA F87', match: /F87/i, layout: 'tkl', screen: null },
  { id: 'f99', name: 'AULA F99 / F99 Pro', match: /F99/i, layout: '96', screen: null },
  { id: 'f108pro', name: 'AULA F108 Pro', match: /F108/i, layout: 'fullScreen', screen: [240, 135], verified: true },
  { id: 'f2088', name: 'AULA F2088 / F2088 Pro', match: /F2088/i, layout: 'full', screen: null },
  ...Object.entries(LAYOUTS).map(([id, l]) => ({ id: 'generic-' + id, name: 'Khác — ' + l.name, layout: id, screen: null, generic: true })),
];
const MODEL_BY_ID = new Map(MODELS.map(m => [m.id, m]));

const SHIFTED = { '`': '~\n`', 1: '!\n1', 2: '@\n2', 3: '#\n3', 4: '$\n4', 5: '%\n5', 6: '^\n6', 7: '&\n7', 8: '*\n8', 9: '(\n9', 0: ')\n0',
  '-': '_\n-', '=': '+\n=', '[': '{\n[', ']': '}\n]', '\\': '|\n\\', ';': ':\n;', "'": '"\n\'', ',': '<\n,', '.': '>\n.', '/': '?\n/' };
const DISPLAY = { ...SHIFTED, Bksp: 'Backspace', Caps: 'Caps Lock', LShift: 'Shift', RShift: 'Shift', LCtrl: 'Ctrl', RCtrl: 'Ctrl', LAlt: 'Alt',
  RAlt: 'Alt', Space: '', Del: 'Delete', NEnter: 'Enter', 'N/': '/', 'N*': '*', 'N-': '-', 'N+': '+', 'N.': '.', PgUp: 'PgUp', PgDn: 'PgDn' };
for (let i = 0; i <= 9; i++) DISPLAY['N' + i] = String(i);

const USAGE_OF = { Esc: 0x29, Bksp: 0x2a, Tab: 0x2b, Caps: 0x39, Enter: 0x28, Space: 0x2c, LShift: 0xe1, RShift: 0xe5, LCtrl: 0xe0, RCtrl: 0xe4,
  LAlt: 0xe2, RAlt: 0xe6, Win: 0xe3, Menu: 0x65, Fn: 0, '↑': 0x52, '↓': 0x51, '←': 0x50, '→': 0x4f, Del: 0x4c, Ins: 0x49, Home: 0x4a, End: 0x4d,
  PgUp: 0x4b, PgDn: 0x4e, PrtSc: 0x46, ScrLk: 0x47, Pause: 0x48, Num: 0x53, 'N/': 0x54, 'N*': 0x55, 'N-': 0x56, 'N+': 0x57, NEnter: 0x58, 'N.': 0x63,
  N0: 0x62, '`': 0x35, '-': 0x2d, '=': 0x2e, '[': 0x2f, ']': 0x30, '\\': 0x31, ';': 0x33, "'": 0x34, ',': 0x36, '.': 0x37, '/': 0x38 };
for (let i = 0; i < 26; i++) USAGE_OF[String.fromCharCode(65 + i)] = 0x04 + i;
for (let i = 1; i <= 9; i++) { USAGE_OF[String(i)] = 0x1d + i; USAGE_OF['N' + i] = 0x58 + i; }
USAGE_OF['0'] = 0x27;
for (let i = 1; i <= 12; i++) USAGE_OF['F' + i] = 0x39 + i;

// Slot guesses from the F75 Max driver's layout file (the keymap / colour
// tables are indexed by these). Calibration replaces them with measured ones.
const GUESS_SLOT = { Esc: 1, '`': 19, '-': 30, '=': 31, Bksp: 103, Tab: 37, '[': 48, ']': 49, '\\': 67, Caps: 55, ';': 65, "'": 66, Enter: 85,
  LShift: 73, RShift: 84, '↑': 101, LCtrl: 91, Win: 92, LAlt: 93, Space: 94, RAlt: 95, Fn: 96, RCtrl: 98, '←': 99, '↓': 100, '→': 102,
  Del: 119, PgUp: 118, End: 120, PgDn: 121, ',': 81, '.': 82, '/': 83 };
for (let i = 1; i <= 12; i++) GUESS_SLOT['F' + i] = 1 + i;
[...'1234567890'].forEach((c, i) => GUESS_SLOT[c] = 20 + i);
[...'QWERTYUIOP'].forEach((c, i) => GUESS_SLOT[c] = 38 + i);
[...'ASDFGHJKL'].forEach((c, i) => GUESS_SLOT[c] = 56 + i);
[...'ZXCVBNM'].forEach((c, i) => GUESS_SLOT[c] = 74 + i);

const LIGHT_CAP = /^([A-Z0-9]|[`\-=[\]\;',./])$/;
function parseLayout(spec) {
  const keys = [], deco = [];
  for (const [y, line] of spec.rows) {
    let x = 0;
    for (const tok of line.trim().split(/\s+/)) {
      if (tok[0] === '_' && tok.length > 1) { x += parseFloat(tok.slice(1)); continue; }
      const m = tok.match(/^(.+?)(?:\*([\d.]+))?(?:\^([\d.]+))?$/);
      const name = m[1], w = +(m[2] || 1), hh = +(m[3] || 1);
      if (name === '#' || name === 'LCD') deco.push({ t: name === '#' ? 'knob' : 'lcd', x, y, w, h: hh });
      else keys.push({ id: `${name}@${x},${y}`, name, x, y, w, h: hh, u: USAGE_OF[name] ?? 0, label: DISPLAY[name] ?? name, mod: !LIGHT_CAP.test(name) });
      x += w;
    }
  }
  const all = [...keys, ...deco];
  return { keys, deco, W: Math.max(...all.map(k => k.x + k.w)), H: Math.max(...all.map(k => k.y + k.h)) };
}


// HID keyboard usages grouped for the picker
const KEY_GROUPS = [];
{
  const letters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((c, i) => [0x04 + i, c]);
  const digits = [...'1234567890'].map((c, i) => [0x1e + i, c]);
  const fkeys = Array.from({ length: 24 }, (_, i) => [i < 12 ? 0x3a + i : 0x68 + i - 12, 'F' + (i + 1)]);
  KEY_GROUPS.push(['Chữ cái', letters], ['Số', digits], ['Phím F', fkeys]);
  KEY_GROUPS.push(['Ký hiệu', [[0x35, '`'], [0x2d, '-'], [0x2e, '='], [0x2f, '['], [0x30, ']'], [0x31, '\\'], [0x33, ';'], [0x34, "'"], [0x36, ','], [0x37, '.'], [0x38, '/']]]);
  KEY_GROUPS.push(['Điều khiển', [[0x29, 'Esc'], [0x2b, 'Tab'], [0x39, 'Caps'], [0x28, 'Enter'], [0x2a, 'Backspace'], [0x2c, 'Space'], [0x4c, 'Delete'], [0x49, 'Insert'],
    [0x4a, 'Home'], [0x4d, 'End'], [0x4b, 'PgUp'], [0x4e, 'PgDn'], [0x52, '↑'], [0x51, '↓'], [0x50, '←'], [0x4f, '→'], [0x46, 'PrtSc'], [0x47, 'ScrLk'], [0x48, 'Pause'], [0x65, 'Menu']]]);
  KEY_GROUPS.push(['Bổ trợ', [[0xe0, 'L-Ctrl'], [0xe1, 'L-Shift'], [0xe2, 'L-Alt'], [0xe3, 'L-Win/⌘'], [0xe4, 'R-Ctrl'], [0xe5, 'R-Shift'], [0xe6, 'R-Alt'], [0xe7, 'R-Win/⌘']]]);
}
const USAGE_NAME = new Map(KEY_GROUPS.flatMap(g => g[1]));
const CONSUMER = [[0xcd, 'Play/Pause'], [0xb5, 'Bài tiếp'], [0xb6, 'Bài trước'], [0xb7, 'Dừng'], [0xe2, 'Tắt tiếng'], [0xe9, 'Âm lượng +'], [0xea, 'Âm lượng −'],
  [0x6f, 'Độ sáng +'], [0x70, 'Độ sáng −'], [0x192, 'Máy tính'], [0x18a, 'Mail'], [0x194, 'My Computer'], [0x223, 'Trình duyệt'], [0x221, 'Tìm kiếm'],
  [0x224, 'Back'], [0x225, 'Forward'], [0x227, 'Refresh']];
const CONSUMER_NAME = new Map(CONSUMER);
const MOUSE = [[1, 'Chuột trái'], [2, 'Chuột phải'], [4, 'Chuột giữa'], [8, 'Chuột lùi'], [16, 'Chuột tiến']];
const MODS = [[1, 'Ctrl'], [2, 'Shift'], [4, 'Alt'], [8, 'Win/⌘']];

const CODE2USAGE = {
  Escape: 0x29, Backquote: 0x35, Minus: 0x2d, Equal: 0x2e, Backspace: 0x2a, Tab: 0x2b, BracketLeft: 0x2f, BracketRight: 0x30, Backslash: 0x31,
  CapsLock: 0x39, Semicolon: 0x33, Quote: 0x34, Enter: 0x28, Comma: 0x36, Period: 0x37, Slash: 0x38, Space: 0x2c, ShiftLeft: 0xe1, ShiftRight: 0xe5,
  ControlLeft: 0xe0, ControlRight: 0xe4, AltLeft: 0xe2, AltRight: 0xe6, MetaLeft: 0xe3, MetaRight: 0xe7, ArrowUp: 0x52, ArrowDown: 0x51,
  ArrowLeft: 0x50, ArrowRight: 0x4f, Delete: 0x4c, Home: 0x4a, End: 0x4d, PageUp: 0x4b, PageDown: 0x4e, Insert: 0x49, PrintScreen: 0x46,
  ScrollLock: 0x47, Pause: 0x48, ContextMenu: 0x65, IntlBackslash: 0x64,
};
for (let i = 0; i < 26; i++) CODE2USAGE['Key' + String.fromCharCode(65 + i)] = 0x04 + i;
for (let i = 1; i <= 9; i++) CODE2USAGE['Digit' + i] = 0x1d + i;
CODE2USAGE.Digit0 = 0x27;
for (let i = 1; i <= 24; i++) CODE2USAGE['F' + i] = i <= 12 ? 0x39 + i : 0x67 + i - 12;
const usageName = u => USAGE_NAME.get(u) || ('0x' + u.toString(16));

// What the official driver offers per effect (config_func bitmask from the AULA driver, via
// parsiya/f108-pro): speed / colour picker / direction (lr = left-right, ud = up-down, values 0/1).
const EFFECT_CAPS = { 1: { speed: false }, 6: { color: false }, 8: { color: false },
  10: { dir: 'ud' }, 11: { dir: 'lr' }, 12: { dir: 'lr' }, 16: { dir: 'lr' }, 18: { dir: 'lr' } };
const caps = m => ({ speed: true, color: true, dir: null, ...EFFECT_CAPS[m] });
const EFFECTS = ['Static', 'SingleOn', 'SingleOff', 'Glittering', 'Falling', 'Colourful', 'Breath', 'Spectrum', 'Outward', 'Scrolling',
  'Rolling', 'Rotating', 'Explode', 'Launch', 'Ripples', 'Flowing', 'Pulsating', 'Tilt', 'Shuttle'];
const MODE_OFF = 0, MODE_USER = 0x80;
