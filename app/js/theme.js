/* 主题：默认跟随系统；用户只在 light / dark 间切换 */
window.CC = window.CC || {};

CC.Theme = (function () {
  const KEY = "cc-theme";
  const LABELS = { light: "浅色", dark: "深色" };
  const ICONS = { light: "☀", dark: "☾" };

  const mq = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: light)")
    : { matches: false, addEventListener() {}, addListener() {} };

  /** @returns {"light"|"dark"|null} null = 跟随系统 */
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

  function resolve(pref) {
    if (pref === "light") return "light";
    if (pref === "dark") return "dark";
    return mq.matches ? "light" : "dark";
  }

  function apply(pref) {
    const mode = resolve(pref);
    const root = document.documentElement;
    root.dataset.theme = mode;
    root.dataset.themePref = pref || "system";
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
      new CustomEvent("cc:theme", { detail: { pref: pref || "system", theme: mode } })
    );
    syncControls(mode);
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

    const onChange = () => {
      if (readPref() == null) apply(null);
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
