/** 时间展示：统一按北京时间（Asia/Shanghai） */
function formatChinaTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  /* sv-SE → YYYY-MM-DD HH:mm:ss */
  return d
    .toLocaleString("sv-SE", { timeZone: "Asia/Shanghai", hour12: false })
    .replace("T", " ")
    .slice(0, 16);
}

module.exports = { formatChinaTime };
