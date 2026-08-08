/** 解析报名表拼出的 intentDates 文案（兼容旧自由文本） */
export function parseIntent(raw) {
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
}
