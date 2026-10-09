'use strict';
// =====================================================================
//  Boot
// =====================================================================
let startPage = 'lighting';
try { startPage = localStorage.getItem('s75studio.page') || 'lighting'; } catch {}
go(TITLES[startPage] ? startPage : 'lighting');
renderModelSel();
renderConn();
connect(false); // reconnects silently if the browser already has permission
