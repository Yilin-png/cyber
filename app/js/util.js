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

/** 解析报名表拼出的 intentDates（兼容旧自由文本） */
CC.parseIntent = (raw) => {
  const text = String(raw || "").trim();
  const out = {
    nextLabel: "",
    joinNext: "",
    period: "",
    slot: "",
    area: "",
    note: "",
    legacy: text
  };
  if (!text) return out;

  const joinM = text.match(/最近一期（([^）]+)）：\s*([^｜]+)/);
  if (joinM) {
    out.nextLabel = joinM[1].trim();
    out.joinNext = joinM[2].trim();
    out.legacy = "";
  }

  const grab = (key) => {
    const m = text.match(new RegExp(`${key}：\\s*([^｜]+)`));
    return m ? m[1].trim() : "";
  };
  out.period = grab("区间");
  out.slot = grab("时段");
  out.area = grab("片区");
  out.note = grab("补充");

  if (!out.joinNext && !out.period && !out.slot && !out.area) {
    out.legacy = text;
  }
  return out;
};

/** 今天（北京时间）YYYY-MM-DD，给 date input 用 */
CC.todayChina = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
