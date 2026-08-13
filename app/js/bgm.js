/* 背景音乐：跨页续播（墙上时钟补偿；换页不压音量重淡入） */
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
    if (audio.dataset.ccBgmInit === "1") {
      return audio._ccBgm || null;
    }
    audio.dataset.ccBgmInit = "1";

    const mode = opts.mode || "button";
    const toggle = opts.toggleId ? document.getElementById(opts.toggleId) : null;
    const sigilEl = opts.sigilEl || null;
    const hint = document.querySelector(".core-hint");

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

    /** 读取进度；若上次在播，用墙上时钟把跳转加载耗时补进 currentTime */
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
      if (mode === "sigil" && hint) {
        hint.style.display = audio.paused ? "" : "none";
      }
      if (toggle) {
        toggle.classList.toggle("on", !audio.paused);
        toggle.setAttribute("aria-pressed", String(!audio.paused));
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
      /* 已在播：不要压音量再淡入，换页/早启动会「抽一下」 */
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
    syncUi();

    if (audio.readyState < 1 && audio.paused) {
      try {
        audio.load();
      } catch (_) {}
    }

    if (shouldPlay()) resume({ soft: true });

    if (mode === "sigil" && toggle) {
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

      toggle.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        castFromPointer = true;
        lastUserAction = performance.now();
        playCast();
      });
      toggle.addEventListener("click", () => {
        lastUserAction = performance.now();
        if (!castFromPointer) playCast();
        castFromPointer = false;
        /* 先画按压，下一帧再碰 audio.play，避免解码抢动画帧 */
        requestAnimationFrame(() => {
          togglePlay();
        });
      });
      audio.addEventListener("pause", () => {
        if (localStorage.getItem(KEY.on) === "off") return;
        if (performance.now() - lastUserAction < 1200) return;
        setTimeout(() => {
          if (audio.paused && shouldPlay()) resume({ soft: true });
        }, 240);
      });
    }

    if (mode === "button" && toggle) {
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        togglePlay();
      });
    }

    const markNav = () => {
      try {
        if (!audio.paused) localStorage.setItem(KEY.on, "on");
      } catch (_) {}
      save();
    };

    const bindSaveOnNav = () => {
      document.querySelectorAll("a[href]").forEach((a) => {
        if (a.dataset.bgmBound) return;
        const href = a.getAttribute("href") || "";
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
          return;
        }
        if (/^https?:\/\//i.test(href) && !href.startsWith(location.origin)) return;
        a.dataset.bgmBound = "1";
        a.addEventListener("click", markNav, { capture: true });
        a.addEventListener("pointerdown", markNav, { capture: true, passive: true });
      });
    };
    bindSaveOnNav();
    const mo = new MutationObserver(bindSaveOnNav);
    mo.observe(document.documentElement, { childList: true, subtree: true });

    /* 不要监听 beforeunload：会禁用 bfcache，返回页时音乐必断 */
    window.addEventListener("pagehide", markNav);
    window.addEventListener("pageshow", (e) => {
      if (shouldPlay() && (e.persisted || audio.paused)) resume({ soft: true });
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") save();
      else if (shouldPlay() && audio.paused) resume({ soft: true });
    });
    if (window.navigation && typeof navigation.addEventListener === "function") {
      navigation.addEventListener("navigate", markNav);
    }
    setInterval(() => {
      if (!audio.paused) save();
    }, 400);

    if (opts.gestureKick || shouldPlay()) {
      const kick = () => {
        if (!shouldPlay()) return;
        if (audio.paused) resume({ soft: true });
      };
      const KICKS = ["pointerdown", "touchstart", "click", "keydown"];
      KICKS.forEach((ev) => document.addEventListener(ev, kick, { passive: true, capture: true }));
      audio.addEventListener("play", () =>
        KICKS.forEach((ev) => document.removeEventListener(ev, kick, { capture: true }))
      );
    }

    const api = { audio, resume, togglePlay, save, turnOn, turnOff };
    audio._ccBgm = api;
    return api;
  }

  function persist(audio) {
    if (!audio) return;
    try {
      sessionStorage.setItem(KEY.t, String(audio.currentTime || 0));
      sessionStorage.setItem(KEY.playing, audio.paused ? "0" : "1");
      sessionStorage.setItem(KEY.wall, String(Date.now()));
      if (!audio.paused) localStorage.setItem(KEY.on, "on");
    } catch (_) {}
  }

  return { init, PLAYLIST, KEY, persist };
})();
