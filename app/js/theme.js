/* 主题：默认按北京日出/日落自动切换；点击仅临时覆盖到下一次日出或日落 */
window.CC = window.CC || {};

CC.Theme = (function () {
  const KEY = "cc-theme";
  const TZ = "Asia/Shanghai";
  /* 固定北京坐标，不搜集用户位置 */
  const LAT = 39.9042;
  const LNG = 116.4074;
  const LABELS = { light: "浅色", dark: "深色" };
  const ICONS = { light: "☀", dark: "☾" };

  let switchTimer = 0;
  let pollTimer = 0;
  let scheduledFor = 0;

  function beijingYmd(date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const get = (type) => parts.find((p) => p.type === type)?.value;
    return `${get("year")}-${get("month")}-${get("day")}`;
  }

  function beijingNoon(date) {
    return new Date(`${beijingYmd(date)}T12:00:00+08:00`);
  }

  function clearLegacyStore() {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem("cc-lat");
      localStorage.removeItem("cc-lng");
      localStorage.removeItem("cc-theme-purged-v3");
    } catch (_) {}
  }

  function readPref() {
    try {
      const v = sessionStorage.getItem(KEY);
      if (v === "light" || v === "dark") return v;
    } catch (_) {}
    return null;
  }

  function writePref(pref) {
    try {
      if (pref === "light" || pref === "dark") sessionStorage.setItem(KEY, pref);
      else sessionStorage.removeItem(KEY);
    } catch (_) {}
  }

  /** NOAA / SunCalc：以北京日历日正午为基准，避免 UTC 日界算错天 */
  function sunTimes(date = new Date()) {
    const noon = beijingNoon(date);
    if (Number.isNaN(noon.getTime())) return null;
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
    const hourAngle = (h, phi, d) => {
      const cosH =
        (Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d));
      if (!Number.isFinite(cosH)) return NaN;
      return Math.acos(Math.min(1, Math.max(-1, cosH)));
    };

    const lw = -lng * rad;
    const phi = lat * rad;
    const d = toDays(noon);
    const n = julianCycle(d, lw);
    const ds = approxTransit(0, lw, n);
    const M = solarMeanAnomaly(ds);
    const L = eclipticLongitude(M);
    const dec = declination(L);
    const Jnoon = solarTransitJ(ds, M, L);
    const w = hourAngle(-0.833 * rad, phi, dec);
    if (!Number.isFinite(w)) return null;
    const a = approxTransit(w, lw, n);
    const Jset = solarTransitJ(a, M, L);
    const Jrise = Jnoon - (Jset - Jnoon);
    const sunrise = fromJulian(Jrise);
    const sunset = fromJulian(Jset);
    if (Number.isNaN(sunrise.getTime()) || Number.isNaN(sunset.getTime())) return null;
    return { sunrise, sunset };
  }

  function beijingHour(now) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(now);
    const hourRaw = Number(parts.find((p) => p.type === "hour")?.value || 12);
    const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
    const hour = hourRaw === 24 ? 0 : hourRaw;
    return hour + minute / 60;
  }

  function isDaylight(now = new Date()) {
    const times = sunTimes(now);
    if (!times) return beijingHour(now) >= 6 && beijingHour(now) < 18.5;
    return now >= times.sunrise && now < times.sunset;
  }

  function nextSwitchAt(now = new Date()) {
    const today = sunTimes(now);
    if (!today) {
      const h = beijingHour(now);
      const ymd = beijingYmd(now);
      if (h < 6) return new Date(`${ymd}T06:00:00+08:00`);
      if (h < 18.5) return new Date(`${ymd}T18:30:00+08:00`);
      const next = new Date(beijingNoon(now).getTime() + 86400000);
      return new Date(`${beijingYmd(next)}T06:00:00+08:00`);
    }
    if (now < today.sunrise) return today.sunrise;
    if (now < today.sunset) return today.sunset;
    return sunTimes(new Date(beijingNoon(now).getTime() + 86400000))?.sunrise || null;
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
    syncControls(mode, pref);
    scheduleAutoSwitch();
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

  function syncControls(mode, pref) {
    const auto = !pref;
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.setAttribute("aria-label", `切换为${mode === "light" ? "深色" : "浅色"}`);
      btn.title = auto
        ? `当前：${LABELS[mode]}（北京日出日落自动；点击可临时切换）`
        : `当前：${LABELS[mode]}（临时；下次日出/日落恢复自动）`;
      btn.dataset.theme = mode;
      btn.setAttribute("aria-pressed", mode === "light" ? "true" : "false");
      const icon = btn.querySelector("[data-theme-icon]");
      if (icon) icon.textContent = ICONS[mode];
    });
  }

  function scheduleAutoSwitch() {
    if (switchTimer) {
      clearTimeout(switchTimer);
      switchTimer = 0;
    }
    const now = new Date();
    const nextAt = nextSwitchAt(now);
    if (!nextAt) return;
    scheduledFor = nextAt.getTime();
    const delay = Math.min(Math.max(scheduledFor - now.getTime() + 400, 1000), 2147483647);
    switchTimer = setTimeout(() => {
      writePref(null);
      apply(null);
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

  function resumeIfSunPassed() {
    if (scheduledFor && Date.now() >= scheduledFor) {
      writePref(null);
      apply(null);
      return;
    }
    const pref = readPref();
    const want = resolve(pref);
    if (document.documentElement.dataset.theme !== want) apply(pref);
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
      if (!document.hidden) resumeIfSunPassed();
    });
    window.addEventListener("pageshow", resumeIfSunPassed);
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(resumeIfSunPassed, 60000);
  }

  function init() {
    clearLegacyStore();
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
    nextSwitchAt,
    init
  };
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => CC.Theme.init());
} else {
  CC.Theme.init();
}
