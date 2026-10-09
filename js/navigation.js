'use strict';
// =====================================================================
//  Navigation
// =====================================================================
const TITLES = { keys: 'Key Settings', macro: 'Macro', lighting: 'Lighting Mode', perkey: 'Custom Lighting', screen: 'Screen GIF & Time', settings: 'Settings' };
let page = 'lighting';
function go(p) {
  page = p;
  $$('#rail button').forEach(b => b.classList.toggle('active', b.dataset.go === p));
  $$('.sub .group').forEach(g => g.classList.toggle('show', g.dataset.for === p));
  $$('.page').forEach(g => g.classList.toggle('show', g.dataset.page === p));
  $('#pageTitle').textContent = TITLES[p];
  try { localStorage.setItem('s75studio.page', p); } catch {}
}
$$('#rail button').forEach(b => b.onclick = () => go(b.dataset.go));
