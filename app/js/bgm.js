/* 背景音乐：跨页续播。站内 HTML 用内容替换，不卸载 <audio>，避免自动播放被拦。 */
window.CC = window.CC || {};

CC.BGM = (function () {
  const PLAYLIST = ["assets/audio/bgm.m4a?v=32k"];
  const KEY = {
    t: "cc-bgm-t",
    i: "cc-bgm-i",
    playing: "cc-bgm-playing",
    on: "cc-bgm",
    wall: "cc-bgm-wall"
  };
  const VOL = 0.42;
  const FADE_MS = 280;
  const APP_PAGES = /^(index|apply|login|gathering-\d+|process)\.html$/i;

  let shared = null;
  let navInstalled = false;
  let navigating = false;
  let activeKey = "";
  let viewEl = null;
  const slots = new Map();

  function isAppUrl(url) {
    try {
      const u = url instanceof URL ? url : new URL(url, location.href);
      if (u.origin !== location.origin) return false;
      const name = (u.pathname.replace(/\/+$/, "").split("/").pop() || "index.html");
      if (u.pathname === "/" || name === "" || name === "index.html") return true;
      return APP_PAGES.test(name);
    } catch (_) {
      return false;
    }
  }

  function pageName(url) {
    const u = url instanceof URL ? url : new URL(url, location.href);
    const name = (u.pathname.replace(/\/+$/, "").split("/").pop() || "index.html");
    return name === "" ? "index.html" : name;
  }

  /**
   * @param {object} opts
   * @param {"sigil"|"button"} [opts.mode="button"]
   * @param {string} [opts.audioId="bgm"]
   * @param {string} [opts.toggleId]
   * @param {HTMLElement|null} [opts.sigilEl]
   * @param {boolean} [opts.gestureKick=false]
   */
  function init(opts = {}) {
    const audio = document.getElementById(opts.audioId || "bgm");
    if (!audio) return null;
    if (shared && shared.audio === audio) {
      shared.bindUi(opts);
      if (opts.gestureKick) shared.installGestureKick();
      return shared;
    }

    audio.loop = PLAYLIST.length === 1;
    audio.preload = "auto";
    audio.setAttribute("playsinline", "");
    audio.setAttribute("webkit-playsinline", "");

    const trackSrc = (i) => new URL(PLAYLIST[i], location.href).href;
    const sameTrack = (abs) => {
      try {
        const a = new URL(audio.currentSrc || audio.src, location.href);
        const b = new URL(abs, location.href);
        return a.pathname === b.pathname;
      } catch (_) {
        return false;
      }
    };

    const getI = () => {
      try {
        const i = parseInt(sessionStorage.getItem(KEY.i) || "0", 10);
        return isFinite(i) && i >= 0 && i < PLAYLIST.length ? i : 0;
      } catch (_) {
        return 0;
      }
    };

    let idx = getI();
    let fadeToken = 0;
    let resumeLock = null;
    let uiAbort = null;
    let kickInstalled = false;

    const setTrack = (i, t) => {
      idx = ((i % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
      const abs = trackSrc(idx);
      if (!sameTrack(abs) && audio.paused) {
        audio.src = PLAYLIST[idx];
      }
      if (t != null) {
        const seek = () => {
          try {
            if (isFinite(t)) audio.currentTime = Math.max(0, t);
          } catch (_) {}
        };
        if (audio.readyState >= 1) seek();
        else audio.addEventListener("loadedmetadata", seek, { once: true });
      }
    };
    setTrack(idx);

    if (!audio.loop) {
      audio.addEventListener("ended", () => {
        setTrack(idx + 1, 0);
        audio.play().catch(() => {});
      });
    }

    const shouldPlay = () => {
      try {
        if (localStorage.getItem(KEY.on) === "off") return false;
        if (localStorage.getItem(KEY.on) === "on") return true;
        return sessionStorage.getItem(KEY.playing) === "1";
      } catch (_) {
        return false;
      }
    };

    const wrapTime = (t) => {
      const dur = audio.duration;
      if (!isFinite(dur) || dur <= 0) return Math.max(0, t);
      return ((t % dur) + dur) % dur;
    };

    const getResumeTime = () => {
      try {
        const t = parseFloat(sessionStorage.getItem(KEY.t) || "0");
        if (!isFinite(t) || t < 0) return 0;
        const playing =
          sessionStorage.getItem(KEY.playing) === "1" ||
          localStorage.getItem(KEY.on) === "on";
        if (!playing) return t;
        const wall = parseInt(sessionStorage.getItem(KEY.wall) || "0", 10);
        if (!wall) return t;
        const drift = Math.max(0, (Date.now() - wall) / 1000);
        return t + Math.min(drift, 6);
      } catch (_) {
        return 0;
      }
    };

    const save = () => {
      try {
        sessionStorage.setItem(KEY.t, String(audio.currentTime || 0));
        sessionStorage.setItem(KEY.i, String(idx));
        sessionStorage.setItem(KEY.playing, audio.paused ? "0" : "1");
        sessionStorage.setItem(KEY.wall, String(Date.now()));
      } catch (_) {}
    };

    const syncUi = () => {
      const hint = (pageRoot() || document).querySelector(".core-hint");
      if (hint) hint.style.display = audio.paused ? "" : "none";
      const root = pageRoot() || document;
      const btn = root.querySelector("#bgmBtn") || root.querySelector("#coreJoin");
      if (btn) {
        btn.classList.toggle("on", !audio.paused);
        btn.setAttribute("aria-pressed", String(!audio.paused));
      }
    };

    const fadeTo = (target, ms = FADE_MS) => {
      const token = ++fadeToken;
      const start = audio.volume;
      const t0 = performance.now();
      return new Promise((resolve) => {
        const step = (now) => {
          if (token !== fadeToken) return resolve();
          const p = Math.min(1, (now - t0) / ms);
          const e = 1 - (1 - p) * (1 - p);
          try {
            audio.volume = start + (target - start) * e;
          } catch (_) {}
          if (p < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    };

    const seekWhenReady = (t) =>
      new Promise((resolve) => {
        let done = false;
        const apply = () => {
          if (done) return;
          done = true;
          const x = wrapTime(t);
          try {
            if (Math.abs((audio.currentTime || 0) - x) > 0.18) {
              audio.currentTime = Math.max(0, x);
            }
          } catch (_) {}
          resolve();
        };
        if (audio.readyState >= 1) apply();
        else {
          audio.addEventListener("loadedmetadata", apply, { once: true });
          audio.addEventListener("canplay", apply, { once: true });
          setTimeout(apply, 500);
        }
      });

    const confirmSeek = (t) => {
      try {
        const x = wrapTime(t);
        if (x < 0.8) return;
        const cur = audio.currentTime || 0;
        if (Math.abs(cur - x) > 1.1) audio.currentTime = Math.max(0, x);
      } catch (_) {}
    };

    const resume = (opts = {}) => {
      if (resumeLock) return resumeLock;
      const soft = !!opts.soft;
      if (!audio.paused) {
        try {
          audio.volume = VOL;
        } catch (_) {}
        save();
        syncUi();
        return Promise.resolve();
      }
      resumeLock = (async () => {
        const t = getResumeTime();
        await seekWhenReady(t);
        try {
          audio.volume = soft ? VOL : 0;
        } catch (_) {}
        try {
          await audio.play();
          confirmSeek(t);
          try {
            localStorage.setItem(KEY.on, "on");
          } catch (_) {}
          syncUi();
          save();
          if (!soft) await fadeTo(VOL, FADE_MS);
          else {
            try {
              audio.volume = VOL;
            } catch (_) {}
          }
        } catch (_) {
          syncUi();
        } finally {
          resumeLock = null;
        }
      })();
      return resumeLock;
    };

    const turnOn = () => {
      try {
        localStorage.setItem(KEY.on, "on");
      } catch (_) {}
      if (!audio.paused) {
        try {
          audio.volume = VOL;
        } catch (_) {}
        syncUi();
        save();
        return Promise.resolve();
      }
      return resume({ soft: false });
    };

    const turnOff = async () => {
      try {
        localStorage.setItem(KEY.on, "off");
      } catch (_) {}
      await fadeTo(0, 180);
      audio.pause();
      save();
      syncUi();
    };

    const togglePlay = () => (audio.paused ? turnOn() : turnOff());

    audio.addEventListener("play", () => {
      syncUi();
      save();
    });
    audio.addEventListener("pause", () => {
      syncUi();
      save();
    });
    audio.addEventListener("timeupdate", () => {
      if (!audio.paused) save();
    });

    if (audio.readyState < 1 && audio.paused) {
      try {
        audio.load();
      } catch (_) {}
    }

    const bindUi = (ui = {}) => {
      uiAbort?.abort();
      uiAbort = new AbortController();
      const { signal } = uiAbort;
      const mode = ui.mode || "button";
      const toggle = ui.toggleEl || (ui.toggleId ? (pageRoot() || document).querySelector("#" + ui.toggleId) : null);
      const sigilEl = ui.sigilEl || (pageRoot() || document).querySelector("#sigil");
      syncUi();
      if (!toggle) return;

      if (mode === "sigil") {
        let lastUserAction = 0;
        let castTimer = 0;
        let pressAnim = null;
        let castFromPointer = false;
        const playCast = () => {
          if (!sigilEl) return;
          const mudra = sigilEl.querySelector(".mudra");
          if (mudra && typeof mudra.animate === "function") {
            try {
              pressAnim?.cancel();
            } catch (_) {}
            pressAnim = mudra.animate(
              [
                { transform: "translate3d(0,0,0) scale(1)" },
                { transform: "translate3d(0,2px,0) scale(.82)", offset: 0.16 },
                { transform: "translate3d(0,-1px,0) scale(1.12)", offset: 0.42 },
                { transform: "translate3d(0,0,0) scale(1)" }
              ],
              { duration: 680, easing: "cubic-bezier(.22,.9,.28,1)" }
            );
          }
          sigilEl.classList.remove("casting");
          requestAnimationFrame(() => {
            sigilEl.classList.add("casting");
            if (castTimer) clearTimeout(castTimer);
            castTimer = setTimeout(() => sigilEl.classList.remove("casting"), 1100);
          });
        };
        toggle.addEventListener(
          "pointerdown",
          (e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            castFromPointer = true;
            lastUserAction = performance.now();
            playCast();
          },
          { signal }
        );
        toggle.addEventListener(
          "click",
          () => {
            lastUserAction = performance.now();
            if (!castFromPointer) playCast();
            castFromPointer = false;
            requestAnimationFrame(() => {
              togglePlay();
            });
          },
          { signal }
        );
        const onPause = () => {
          if (localStorage.getItem(KEY.on) === "off") return;
          if (performance.now() - lastUserAction < 1200) return;
          setTimeout(() => {
            if (audio.paused && shouldPlay()) resume({ soft: true });
          }, 240);
        };
        audio.addEventListener("pause", onPause, { signal });
      } else {
        toggle.addEventListener(
          "click",
          (e) => {
            e.stopPropagation();
            togglePlay();
          },
          { signal }
        );
      }
    };

    const installGestureKick = () => {
      if (kickInstalled) return;
      kickInstalled = true;
      const kick = () => {
        if (!shouldPlay()) return;
        if (audio.paused) resume({ soft: true });
      };
      const KICKS = ["pointerdown", "touchstart", "click", "keydown"];
      KICKS.forEach((ev) => document.addEventListener(ev, kick, { passive: true, capture: true }));
      audio.addEventListener("play", () =>
        KICKS.forEach((ev) => document.removeEventListener(ev, kick, { capture: true }))
      );
    };

    const markNav = () => {
      try {
        if (!audio.paused) localStorage.setItem(KEY.on, "on");
      } catch (_) {}
      save();
    };

    window.addEventListener("pagehide", markNav);
    window.addEventListener("pageshow", (e) => {
      if (shouldPlay() && (e.persisted || audio.paused)) resume({ soft: true });
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") save();
      else if (shouldPlay() && audio.paused) resume({ soft: true });
    });
    setInterval(() => {
      if (!audio.paused) save();
    }, 400);

    bindUi(opts);
    if (opts.gestureKick || shouldPlay()) installGestureKick();
    if (shouldPlay()) resume({ soft: true });

    shared = {
      audio,
      resume,
      togglePlay,
      save,
      turnOn,
      turnOff,
      bindUi,
      installGestureKick,
      shouldPlay
    };
    audio._ccBgm = shared;
    return shared;
  }

  function persist(audioEl) {
    const audio = audioEl || document.getElementById("bgm");
    if (!audio) return;
    try {
      sessionStorage.setItem(KEY.t, String(audio.currentTime || 0));
      sessionStorage.setItem(KEY.playing, audio.paused ? "0" : "1");
      sessionStorage.setItem(KEY.wall, String(Date.now()));
      if (!audio.paused) localStorage.setItem(KEY.on, "on");
    } catch (_) {}
  }

  function bindPageBgm() {
    const root = pageRoot() || document;
    const sigil = root.querySelector("#sigil");
    const core = root.querySelector("#coreJoin");
    if (sigil && core) {
      init({ mode: "sigil", toggleEl: core, toggleId: "coreJoin", sigilEl: sigil, gestureKick: true });
      return;
    }
    const btn = root.querySelector("#bgmBtn");
    if (btn) {
      init({ mode: "button", toggleEl: btn, toggleId: "bgmBtn", gestureKick: true });
    }
  }

  function execClassicScript(code, label, isolate) {
    /* 注入脚本包进 IIFE，避免 home.js / gathering.js 的 const $ 撞名 */
    const src = isolate === false
      ? code
      : "(function(){\n" + code + "\n})();";
    const el = document.createElement("script");
    el.textContent = src + (label ? "\n//# sourceURL=" + label : "");
    document.head.appendChild(el);
    el.remove();
  }

  async function runPageScripts(doc, base) {
    const scripts = [...doc.querySelectorAll("script")];
    for (const s of scripts) {
      const src = s.getAttribute("src");
      const text = s.textContent || "";
      if (!src) {
        if (/cc-bgm-t/.test(text) && /getElementById\(["']bgm["']\)/.test(text)) continue;
        if (/__ccPendingNav/.test(text) && /CC\.BGM\.go/.test(text)) continue;
        if (!text.trim()) continue;
        try {
          execClassicScript(text, "cc-inline.js");
        } catch (err) {
          console.warn("cc-nav inline", err);
        }
        continue;
      }
      const abs = new URL(src, base);
      const path = abs.pathname;
      if (/\/js\/(util|theme|api|bgm)\.js$/.test(path)) continue;
      if (/\/js\/data\.js$/.test(path) && window.DATA) continue;
      try {
        const code = await fetch(abs.href, { credentials: "same-origin" }).then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.text();
        });
        execClassicScript(code, path.split("/").pop() || "cc-page.js");
      } catch (err) {
        console.warn("cc-nav script", path, err);
        throw err;
      }
    }
  }

  function cssPathname(href, base) {
    try {
      return new URL(href, base).pathname;
    } catch (_) {
      return "";
    }
  }

  const CHROME_IDS = new Set(["bgm", "themeBtn", "cc-void", "cc-veil"]);
  const SPA_CSS = [
    "css/tokens.css?v=cs1",
    "css/base.css?v=g002-spa",
    "css/home.css?v=g003cv",
    "css/auth.css?v=g003br",
    "css/gathering.css?v=g002"
  ];

  function pageRoot() {
    return slots.get(activeKey)?.el || null;
  }

  function themeBg() {
    return document.documentElement.dataset.theme === "light" ? "#F5F3FB" : "#07060E";
  }

  function ensureVoid() {
    let el = document.getElementById("cc-void");
    if (!el) {
      el = document.createElement("div");
      el.id = "cc-void";
      el.setAttribute("aria-hidden", "true");
      document.body.insertBefore(el, document.body.firstChild);
    }
    el.style.backgroundColor = themeBg();
    return el;
  }

  function ensureVeil() {
    let el = document.getElementById("cc-veil");
    if (!el) {
      el = document.createElement("div");
      el.id = "cc-veil";
      el.setAttribute("aria-hidden", "true");
      document.body.appendChild(el);
    }
    el.style.backgroundColor = themeBg();
    return el;
  }

  function raiseVeil() {
    const el = ensureVeil();
    el.style.backgroundColor = themeBg();
    el.classList.add("on");
    void el.offsetHeight;
    return el;
  }

  function dropVeil() {
    const el = document.getElementById("cc-veil");
    if (!el) return;
    /* 多等两帧，让目标页样式和布局先画完再揭开 */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => el.classList.remove("on"), 48);
      });
    });
  }

  function ensureView() {
    ensureVoid();
    ensureVeil();
    if (viewEl && document.body.contains(viewEl)) return viewEl;
    viewEl = document.getElementById("cc-view");
    if (viewEl) return viewEl;
    viewEl = document.createElement("div");
    viewEl.id = "cc-view";
    const audio = document.getElementById("bgm");
    Array.from(document.body.childNodes).forEach((node) => {
      if (node.nodeType === 1 && CHROME_IDS.has(node.id)) return;
      viewEl.appendChild(node);
    });
    if (audio && audio.nextSibling) document.body.insertBefore(viewEl, audio.nextSibling);
    else document.body.appendChild(viewEl);
    return viewEl;
  }

  function ensureSpaCss() {
    const pending = [];
    SPA_CSS.forEach((href) => {
      const path = cssPathname(href, location.href);
      let el = [...document.querySelectorAll('link[rel="stylesheet"]')].find(
        (l) => cssPathname(l.href, location.href) === path
      );
      if (el) {
        el.disabled = false;
        return;
      }
      el = document.createElement("link");
      el.rel = "stylesheet";
      el.href = href;
      pending.push(
        new Promise((resolve) => {
          el.addEventListener("load", resolve, { once: true });
          el.addEventListener("error", resolve, { once: true });
        })
      );
      document.head.appendChild(el);
    });
    document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
      l.disabled = false;
    });
    return pending.length ? Promise.all(pending) : Promise.resolve();
  }

  function wrapInitial() {
    const view = ensureView();
    const key = pageName(location.href);
    if (!view.querySelector(":scope > [data-cc-slot]")) {
      const slot = document.createElement("div");
      slot.dataset.ccSlot = key;
      while (view.firstChild) slot.appendChild(view.firstChild);
      view.appendChild(slot);
    }
    view.querySelectorAll(":scope > [data-cc-slot]").forEach((el) => {
      const k = el.dataset.ccSlot;
      if (!slots.has(k)) {
        slots.set(k, {
          el,
          title: document.title,
          bodyClass: document.body.className,
          scrollY: 0,
          hydrated: true
        });
      }
    });
    activeKey = key;
    showSlot(key);
    syncGatheringAttr(key);
    ensureSpaCss();
  }

  function snapshot(key) {
    const rec = slots.get(key);
    if (!rec) return;
    rec.title = document.title;
    rec.bodyClass = document.body.className;
    rec.scrollY = window.scrollY || 0;
  }

  function syncGatheringAttr(key) {
    const html = document.documentElement;
    const m = String(key || "").match(/^gathering-(\d+)\.html$/i);
    if (m) html.dataset.gatheringId = m[1];
    else html.removeAttribute("data-gathering-id");
  }

  function showSlot(key) {
    const view = ensureView();
    const next = view.querySelector(`:scope > [data-cc-slot="${key}"]`);
    if (!next) return false;
    view.dataset.show = key;
    view.querySelectorAll(":scope > [data-cc-slot]").forEach((el) => {
      el.classList.toggle("is-on", el === next);
    });
    return true;
  }

  function activate(key, { veil = true } = {}) {
    const rec = slots.get(key);
    if (!rec || !rec.el) return false;
    if (veil) raiseVeil();
    document.title = rec.title || document.title;
    document.body.className = rec.bodyClass || "";
    syncGatheringAttr(key);
    document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
      l.disabled = false;
    });
    if (!showSlot(key)) {
      if (veil) dropVeil();
      return false;
    }
    activeKey = key;
    scrollToY(rec.scrollY || 0);
    void document.documentElement.offsetHeight;
    hydrateChrome();
    if (veil) dropVeil();
    return true;
  }

  function hydrateChrome() {
    ensureVoid();
    bindPageBgm();
    if (CC.Theme && typeof CC.Theme.apply === "function") {
      CC.Theme.apply(CC.Theme.readPref());
    }
    const audio = document.getElementById("bgm");
    if (audio && audio.paused && shared?.shouldPlay()) shared.resume({ soft: true });
  }

  function scrollToY(y) {
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    try {
      window.scrollTo({ top: y || 0, left: 0, behavior: "auto" });
    } catch (_) {
      window.scrollTo(0, y || 0);
    }
    html.style.scrollBehavior = prev;
  }

  /* 两期纪要共用 s01 / s02 这类 id。必须在当前槽里找锚点，不能用 document.getElementById。 */
  function scrollToHash(hash, key) {
    const id = String(hash || "").replace(/^#/, "");
    if (!id) return false;
    const root = slots.get(key || activeKey)?.el;
    if (!root) return false;
    let target = null;
    try {
      target = root.querySelector("#" + CSS.escape(id));
    } catch (_) {
      target = root.querySelector(`[id="${id.replace(/"/g, "")}"]`);
    }
    if (!target) return false;
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: "start" });
    });
    return true;
  }

  async function prepareStyles(doc, base) {
    await ensureSpaCss();
    const wanted = new Set();
    doc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;
      wanted.add(new URL(href, base).pathname);
    });
    return wanted;
  }

  let navGen = 0;

  async function go(href, opts = {}) {
    const url = new URL(href, location.href);
    if (!isAppUrl(url)) {
      location.href = url.href;
      return;
    }
    const key = pageName(url);
    const rec0 = slots.get(key);
    const ready = !!(rec0 && rec0.el && rec0.hydrated);
    if (!opts.pop && key === pageName(location.href) && url.search === location.search && ready) {
      if (url.hash) {
        if (url.href !== location.href) history.pushState({ cc: 1, key }, "", url.href);
        scrollToHash(url.hash, key);
      }
      return;
    }
    if (key === activeKey && !opts.pop && ready) {
      if (url.hash) {
        if (url.href !== location.href) history.pushState({ cc: 1, key }, "", url.href);
        scrollToHash(url.hash, key);
      }
      return;
    }

    persist();

    if (rec0 && rec0.el && !rec0.hydrated) {
      rec0.el.remove();
      slots.delete(key);
    }

    if (slots.has(key) && slots.get(key).el) {
      if (!opts.pop) history.pushState({ cc: 1, key }, "", url.href);
      snapshot(activeKey);
      activate(key);
      scrollToHash(url.hash, key);
      return;
    }

    const gen = ++navGen;
    navigating = true;
    raiseVeil();
    try {
      const res = await fetch(url.href, {
        credentials: "same-origin",
        headers: { Accept: "text/html" }
      });
      if (!res.ok) throw new Error("nav " + res.status);
      /* Assets 常回 text/html 不带 charset，res.text() 会按错编码，中文变乱码 */
      const html = new TextDecoder("utf-8").decode(await res.arrayBuffer());
      if (gen !== navGen) return;
      const doc = new DOMParser().parseFromString(html, "text/html");
      await prepareStyles(doc, url.href);
      if (gen !== navGen) return;

      const incoming = doc.body.cloneNode(true);
      incoming.querySelectorAll("script").forEach((s) => s.remove());
      incoming.querySelector("#bgm")?.remove();
      incoming.querySelector("#themeBtn")?.remove();
      incoming.querySelector("#cc-void")?.remove();
      incoming.querySelector("#cc-veil")?.remove();
      incoming.querySelector("#cc-view")?.remove();

      if (!opts.pop) history.pushState({ cc: 1, key }, "", url.href);

      snapshot(activeKey);

      const slot = document.createElement("div");
      slot.dataset.ccSlot = key;
      slot.append(...Array.from(incoming.childNodes));
      ensureView().appendChild(slot);

      slots.set(key, {
        el: slot,
        title: doc.title || document.title,
        bodyClass: doc.body.className || "",
        scrollY: 0,
        hydrated: false
      });

      activate(key, { veil: false });

      await runPageScripts(doc, url.href);
      if (gen !== navGen) return;
      const rec = slots.get(key);
      if (rec) rec.hydrated = true;
      hydrateChrome();
      scrollToHash(url.hash, key);
    } catch (err) {
      console.warn("cc-nav", err);
      if (!opts.pop) {
        const same = pageName(location.href) === key && url.search === location.search;
        if (same) location.reload();
        else location.href = url.href;
      }
    } finally {
      if (gen === navGen) navigating = false;
      dropVeil();
    }
  }

  function installNav() {
    if (navInstalled) return;
    navInstalled = true;
    try {
      history.scrollRestoration = "manual";
    } catch (_) {}
    wrapInitial();
    try {
      history.replaceState({ cc: 1, key: activeKey }, "", location.href);
    } catch (_) {}
    document.addEventListener(
      "click",
      (e) => {
        if (e.defaultPrevented) return;
        if (e.button && e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = e.target.closest && e.target.closest("a[href]");
        if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
        const href = a.getAttribute("href") || "";
        if (href.startsWith("#") && href.length > 1) {
          const root = slots.get(activeKey)?.el;
          let target = null;
          try {
            target = root && root.querySelector("#" + CSS.escape(href.slice(1)));
          } catch (_) {
            target = null;
          }
          if (target) {
            e.preventDefault();
            e.stopPropagation();
            try { history.pushState({ cc: 1, key: activeKey }, "", href); } catch (_) {}
            target.scrollIntoView({ block: "start" });
          }
          return;
        }
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
          return;
        }
        let url;
        try {
          url = new URL(href, location.href);
        } catch (_) {
          return;
        }
        if (!isAppUrl(url)) return;
        e.preventDefault();
        e.stopPropagation();
        go(url.href);
      },
      true
    );
    window.addEventListener("popstate", () => {
      raiseVeil();
      const key = pageName(location.href);
      if (!isAppUrl(location.href)) {
        dropVeil();
        return;
      }
      navGen += 1;
      navigating = false;
      persist();
      if (key === activeKey) {
        dropVeil();
        return;
      }
      snapshot(activeKey);
      if (activate(key, { veil: false })) {
        scrollToHash(location.hash, key);
        dropVeil();
        return;
      }
      go(location.href, { pop: true });
    });
    if (window.__ccPendingNav) {
      const pending = window.__ccPendingNav;
      window.__ccPendingNav = "";
      go(pending);
    }
  }

  installNav();

  return { init, PLAYLIST, KEY, persist, go, bindPageBgm };
})();
