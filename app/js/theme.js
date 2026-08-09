/* 主题：light / dark / system（跟随系统） */
window.CC = window.CC || {};

CC.Theme = (function () {
  const KEY = "cc-theme";
  const PREFS = ["system", "light", "dark"];
  const LABELS = {
    system: "跟随系统",
    light: "浅色",
    dark: "深色"
  };
  const ICONS = {
    system: "◐",
    light: "☀",
    dark: "☾"
  };

  const mq = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: light)")
    : { matches: false, addEventListener() {}, addListener() {} };

  function readPref() {
    try {
      const v = localStorage.getItem(KEY);
      if (PREFS.includes(v)) return v;
    } catch (_) {}
    return "system";
  }

  function writePref(pref) {
    try {
      localStorage.setItem(KEY, pref);
    } catch (_) {}
  }

  function resolve(pref) {
    if (pref === "light") return "light";
    if (pref === "dark") return "dark";
    return mq.matches ? "light" : "dark";
  }

  function apply(pref) {
    const mode = resolve(pref);
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.dataset.themePref = pref;
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
      new CustomEvent("cc:theme", { detail: { pref, theme: mode } })
    );
    syncControls(pref, mode);
    return mode;
  }

  function setPref(pref) {
    const next = PREFS.includes(pref) ? pref : "system";
    writePref(next);
    return apply(next);
  }

  function cycle() {
    const cur = readPref();
    const i = PREFS.indexOf(cur);
    return setPref(PREFS[(i + 1) % PREFS.length]);
  }

  function syncControls(pref, mode) {
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.setAttribute("aria-label", `主题：${LABELS[pref]}`);
      btn.title = `主题：${LABELS[pref]}（点击切换）`;
      btn.dataset.themePref = pref;
      btn.dataset.theme = mode;
      btn.setAttribute("aria-pressed", mode === "light" ? "true" : "false");
      const icon = btn.querySelector("[data-theme-icon]");
      if (icon) icon.textContent = ICONS[pref];
    });
  }

  function ensureToggle() {
    if (document.querySelector("[data-theme-toggle]")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "themeBtn";
    btn.dataset.themeToggle = "";
    btn.innerHTML = '<span data-theme-icon aria-hidden="true">◐</span>';
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

    const onChange = () => {
      if (readPref() === "system") apply("system");
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  function init() {
    ensureToggle();
    apply(readPref());
    bind();
  }

  return {
    KEY,
    PREFS,
    LABELS,
    readPref,
    resolve,
    apply,
    setPref,
    cycle,
    init
  };
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => CC.Theme.init());
} else {
  CC.Theme.init();
}
