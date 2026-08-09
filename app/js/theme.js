/* 主题：默认按北京时间日出/日落；用户只在 light / dark 间切换 */
window.CC = window.CC || {};

CC.Theme = (function () {
  const KEY = "cc-theme";
  const PURGE_KEY = "cc-theme-purged-v3";
  /* 固定北京坐标，不搜集用户位置 */
  const LAT = 39.9042;
  const LNG = 116.4074;
  const LABELS = { light: "浅色", dark: "深色" };
  const ICONS = { light: "☀", dark: "☾" };

  let switchTimer = 0;

  function purgeLegacyPref() {
    try {
      if (localStorage.getItem(PURGE_KEY)) return;
      localStorage.removeItem(KEY);
      localStorage.removeItem("cc-lat");
      localStorage.removeItem("cc-lng");
      localStorage.setItem(PURGE_KEY, "1");
    } catch (_) {}
  }

  function readPref() {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "light" || v === "dark") return v;
      if (v === "system") localStorage.removeItem(KEY);
    } catch (_) {}
    return null;
  }

  function writePref(pref) {
    try {
      if (pref === "light" || pref === "dark") localStorage.setItem(KEY, pref);
      else localStorage.removeItem(KEY);
    } catch (_) {}
  }

  /** NOAA / SunCalc 简化：北京日出日落（Date，绝对时间） */
  function sunTimes(date) {
    const lat = LAT;
    const lng = LNG;
    const rad = Math.PI / 180;
    const dayMs = 86400000;
    const J1970 = 2440588;
    const J2000 = 2451545;
    const e = rad * 23.4397;
    const toJulian = (d) => d.valueOf() / dayMs - 0.5 + J1970;
    const fromJulian = (j) => new Date((j + 0.5 - J1970) * dayMs);
    const toDays = (d) => toJulian(d) - J2000;
    const solarMeanAnomaly = (d) => rad * (357.5291 + 0.98560028 * d);
    const eclipticLongitude = (M) => {
      const C =
        rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
      return M + C + rad * 102.9372 + Math.PI;
    };
    const declination = (l) => Math.asin(Math.sin(l) * Math.sin(e));
    const julianCycle = (d, lw) => Math.round(d - 0.0009 - lw / (2 * Math.PI));
    const approxTransit = (Ht, lw, n) => 0.0009 + (Ht + lw) / (2 * Math.PI) + n;
    const solarTransitJ = (ds, M, L) =>
      J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
    const hourAngle = (h, phi, d) =>
      Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));

    const lw = -lng * rad;
    const phi = lat * rad;
    const d = toDays(date);
    const n = julianCycle(d, lw);
    const ds = approxTransit(0, lw, n);
    const M = solarMeanAnomaly(ds);
    const L = eclipticLongitude(M);
    const dec = declination(L);
    const Jnoon = solarTransitJ(ds, M, L);
    const h0 = -0.833 * rad;
    let w;
    try {
      w = hourAngle(h0, phi, dec);
    } catch (_) {
      return null;
    }
    if (!Number.isFinite(w)) return null;
    const a = approxTransit(w, lw, n);
    const Jset = solarTransitJ(a, M, L);
    const Jrise = Jnoon - (Jset - Jnoon);
    return { sunrise: fromJulian(Jrise), sunset: fromJulian(Jset) };
  }

  function isDaylight(now = new Date()) {
    const times = sunTimes(now);
    if (!times) {
      /* 兜底：按北京时间粗分昼夜 */
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Shanghai",
        hour: "numeric",
        minute: "numeric",
        hourCycle: "h23"
      }).formatToParts(now);
      const hour = Number(parts.find((p) => p.type === "hour")?.value || 12);
      const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
      const h = hour + minute / 60;
      return h >= 6 && h < 18.5;
    }
    return now >= times.sunrise && now < times.sunset;
  }

  function resolve(pref) {
    if (pref === "light") return "light";
    if (pref === "dark") return "dark";
    return isDaylight() ? "light" : "dark";
  }

  function apply(pref) {
    const mode = resolve(pref);
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.dataset.themePref = pref || "auto";
    root.style.colorScheme = mode;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        "content",
        getComputedStyle(root).getPropertyValue("--theme-meta").trim() ||
          (mode === "light" ? "#F5F3FB" : "#07060E")
      );
    }

    document.dispatchEvent(
      new CustomEvent("cc:theme", { detail: { pref: pref || "auto", theme: mode } })
    );
    syncControls(mode);
    scheduleAutoSwitch(pref);
    return mode;
  }

  function setPref(pref) {
    const next = pref === "light" || pref === "dark" ? pref : null;
    writePref(next);
    return apply(next);
  }

  function cycle() {
    const mode = resolve(readPref());
    return setPref(mode === "light" ? "dark" : "light");
  }

  function syncControls(mode) {
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.setAttribute("aria-label", `切换为${mode === "light" ? "深色" : "浅色"}`);
      btn.title = `当前：${LABELS[mode]}（点击切换）`;
      btn.dataset.theme = mode;
      btn.setAttribute("aria-pressed", mode === "light" ? "true" : "false");
      const icon = btn.querySelector("[data-theme-icon]");
      if (icon) icon.textContent = ICONS[mode];
    });
  }

  function scheduleAutoSwitch(pref) {
    if (switchTimer) {
      clearTimeout(switchTimer);
      switchTimer = 0;
    }
    if (pref != null) return;
    const now = new Date();
    const today = sunTimes(now);
    if (!today) return;
    let nextAt = now < today.sunrise ? today.sunrise : now < today.sunset ? today.sunset : null;
    if (!nextAt) {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const t2 = sunTimes(tomorrow);
      if (t2) nextAt = t2.sunrise;
    }
    if (!nextAt) return;
    const delay = Math.min(Math.max(nextAt - now + 500, 1000), 2147483647);
    switchTimer = setTimeout(() => {
      if (readPref() == null) apply(null);
    }, delay);
  }

  function ensureToggle() {
    if (document.querySelector("[data-theme-toggle]")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "themeBtn";
    btn.dataset.themeToggle = "";
    btn.innerHTML = '<span data-theme-icon aria-hidden="true">☾</span>';
    document.body.appendChild(btn);
  }

  function bind() {
    if (bind._done) return;
    bind._done = true;
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-theme-toggle]");
      if (!btn) return;
      e.preventDefault();
      cycle();
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && readPref() == null) apply(null);
    });
  }

  function init() {
    ensureToggle();
    apply(readPref());
    bind();
  }

  return {
    KEY,
    LABELS,
    readPref,
    resolve,
    apply,
    setPref,
    cycle,
    isDaylight,
    sunTimes,
    init
  };
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => CC.Theme.init());
} else {
  CC.Theme.init();
}
