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
  const APP_PAGES = /^(index|apply|login|gathering-001)\.html$/i;

  let shared = null;
  let navInstalled = false;
  let navigating = false;

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
      const hint = document.querySelector(".core-hint");
      if (hint) hint.style.display = audio.paused ? "" : "none";
      const btn = document.getElementById("bgmBtn") || document.getElementById("coreJoin");
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
      const toggle = ui.toggleId ? document.getElementById(ui.toggleId) : null;
      const sigilEl = ui.sigilEl || document.getElementById("sigil");
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
    const sigil = document.getElementById("sigil");
    const core = document.getElementById("coreJoin");
    if (sigil && core) {
      init({ mode: "sigil", toggleId: "coreJoin", sigilEl: sigil, gestureKick: true });
      return;
    }
    if (document.getElementById("bgmBtn")) {
      init({ mode: "button", toggleId: "bgmBtn", gestureKick: true });
    }
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
          new Function(text)();
        } catch (err) {
          console.warn("cc-nav inline", err);
        }
        continue;
      }
      const abs = new URL(src, base);
      const path = abs.pathname;
      if (/\/js\/(util|theme|api|bgm)\.js$/.test(path)) continue;
      if (/\/js\/data\.js$/.test(path) && typeof DATA !== "undefined") continue;
      try {
        const code = await fetch(abs.href, { credentials: "same-origin" }).then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.text();
        });
        new Function(code)();
      } catch (err) {
        console.warn("cc-nav script", path, err);
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

  async function prepareStyles(doc, base) {
    const wanted = new Set();
    const pending = [];
    doc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;
      wanted.add(new URL(href, base).pathname);
    });
    wanted.forEach((path) => {
      let el = [...document.querySelectorAll('link[rel="stylesheet"]')].find(
        (l) => cssPathname(l.href, location.href) === path
      );
      if (el) {
        el.disabled = false;
        return;
      }
      el = document.createElement("link");
      el.rel = "stylesheet";
      el.href = "css/" + path.split("/").pop();
      pending.push(
        new Promise((resolve) => {
          el.addEventListener("load", resolve, { once: true });
          el.addEventListener("error", resolve, { once: true });
        })
      );
      document.head.appendChild(el);
    });
    document.querySelectorAll("style[data-cc-page]").forEach((s) => s.remove());
    doc.querySelectorAll("head style").forEach((s) => {
      const el = document.createElement("style");
      el.dataset.ccPage = "1";
      el.textContent = s.textContent;
      document.head.appendChild(el);
    });
    if (pending.length) await Promise.all(pending);
    return wanted;
  }

  function pruneStyles(wanted) {
    document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
      const path = cssPathname(l.href, location.href);
      if (wanted.has(path) || /\/css\/(tokens|base|auth)\.css$/.test(path)) {
        l.disabled = false;
      } else {
        l.disabled = true;
      }
    });
  }

  async function go(href, opts = {}) {
    const url = new URL(href, location.href);
    if (!isAppUrl(url)) {
      location.href = url.href;
      return;
    }
    if (!opts.pop && pageName(url) === pageName(location.href) && url.search === location.search) {
      return;
    }
    if (navigating) return;
    navigating = true;
    persist();
    try {
      const res = await fetch(url.href, {
        credentials: "same-origin",
        headers: { Accept: "text/html" }
      });
      if (!res.ok) throw new Error("nav " + res.status);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const wanted = await prepareStyles(doc, url.href);
      document.title = doc.title || document.title;

      const keep = ["bgm", "themeBtn"]
        .map((id) => document.getElementById(id))
        .filter(Boolean);
      keep.forEach((el) => el.remove());

      const incoming = doc.body.cloneNode(true);
      incoming.querySelectorAll("script").forEach((s) => s.remove());
      incoming.querySelector("#bgm")?.remove();
      incoming.querySelector("#themeBtn")?.remove();

      document.body.className = doc.body.className || "";
      document.body.style.transition = "none";
      document.body.replaceChildren(...Array.from(incoming.childNodes));
      keep.forEach((el) => document.body.appendChild(el));
      pruneStyles(wanted);

      if (!opts.pop) history.pushState({ cc: 1 }, "", url.href);
      window.scrollTo(0, 0);

      await new Promise((r) => requestAnimationFrame(r));
      document.body.style.transition = "";
      await runPageScripts(doc, url.href);
      bindPageBgm();
      if (CC.Theme && typeof CC.Theme.apply === "function") {
        CC.Theme.apply(CC.Theme.readPref());
      }
      const audio = document.getElementById("bgm");
      if (audio && audio.paused && shared?.shouldPlay()) shared.resume({ soft: true });
    } catch (_) {
      location.href = url.href;
    } finally {
      navigating = false;
    }
  }

  function installNav() {
    if (navInstalled) return;
    navInstalled = true;
    document.addEventListener(
      "click",
      (e) => {
        if (e.defaultPrevented) return;
        if (e.button && e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = e.target.closest && e.target.closest("a[href]");
        if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
        const href = a.getAttribute("href") || "";
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
