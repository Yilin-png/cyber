/* 通用小工具 */
window.CC = window.CC || {};

CC.$ = s => document.querySelector(s);
CC.$$ = s => [...document.querySelectorAll(s)];
CC.esc = s => String(s).replace(/[&<>"]/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
