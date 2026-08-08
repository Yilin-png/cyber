/* 通用小工具 */
window.CC = window.CC || {};

CC.$ = s => document.querySelector(s);
CC.$$ = s => [...document.querySelectorAll(s)];
CC.esc = s => String(s).replace(/[&<>"]/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/** 统一按北京时间展示（服务端存的是 UTC ISO） */
CC.fmtChinaTime = (iso, withSeconds = false) => {
  if (!iso) return "—";
  try {
    const opts = {
      timeZone: "Asia/Shanghai",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    };
    if (withSeconds) opts.second = "2-digit";
    return new Date(iso).toLocaleString("zh-CN", opts);
  } catch (_) {
    return String(iso);
  }
};

/** 今天（北京时间）YYYY-MM-DD，给 date input 用 */
CC.todayChina = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
