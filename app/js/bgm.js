/* 背景音乐：跨页续播（时间补偿 + 淡入淡出） */
window.CC = window.CC || {};

CC.BGM = (function () {
  const PLAYLIST = ["assets/audio/bgm.m4a"];
  const KEY = {
    t: "cc-bgm-t",
    i: "cc-bgm-i",
    playing: "cc-bgm-playing",
    on: "cc-bgm",
    wall: "cc-bgm-wall"
  };
  const VOL = 0.42;
  const FADE_MS = 320;

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
        return audio.src && new URL(audio.src).pathname === new URL(abs).pathname;
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
      /* 已指向同一文件时不要重设 src，避免整轨重载造成卡顿 */
      if (!sameTrack(abs)) {
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

    /** 读取进度；若上次在播，用墙上时钟把跳转加载耗时补进 currentTime */
    const getResumeTime = () => {
      try {
        const t = parseFloat(sessionStorage.getItem(KEY.t) || "0");
        if (!isFinite(t) || t < 0) return 0;
        const playing = sessionStorage.getItem(KEY.playing) === "1"
          || localStorage.getItem(KEY.on) === "on";
        if (!playing) return t;
        const wall = parseInt(sessionStorage.getItem(KEY.wall) || "0", 10);
        if (!wall) return t;
        const drift = Math.max(0, (Date.now() - wall) / 1000);
        /* 跳转通常 0.2–2s；上限避免异常挂起后乱跳 */
        return t + Math.min(drift, 8);
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
          /* ease-out */
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
          try {
            const dur = audio.duration;
            let x = t;
            if (isFinite(dur) && dur > 0) x = ((x % dur) + dur) % dur;
            if (Math.abs((audio.currentTime || 0) - x) > 0.12) {
              audio.currentTime = Math.max(0, x);
            }
          } catch (_) {}
          resolve();
        };
        if (audio.readyState >= 1) apply();
        else {
          audio.addEventListener("loadedmetadata", apply, { once: true });
          audio.addEventListener("canplay", apply, { once: true });
          setTimeout(apply, 800);
        }
      });

    const waitCanPlay = () =>
      new Promise((resolve) => {
        if (audio.readyState >= 2) return resolve();
        const done = () => resolve();
        audio.addEventListener("canplay", done, { once: true });
        setTimeout(done, 450);
      });

    /** 部分浏览器在 play() 后会把未完成的 seek 弹回开头，播后再校正一次 */
    const confirmSeek = (t) => {
      try {
        const dur = audio.duration;
        let x = t;
        if (isFinite(dur) && dur > 0) x = ((x % dur) + dur) % dur;
        if (x < 1.2) return;
        const cur = audio.currentTime || 0;
        if (Math.abs(cur - x) > 1.25) audio.currentTime = Math.max(0, x);
      } catch (_) {}
    };

    const resume = (opts = {}) => {
      if (resumeLock) return resumeLock;
      const soft = !!opts.soft; /* 跨页续播：短淡入，少静音感 */
      /* 已在播且音量接近目标时勿再压低，避免可见页切换时「抽一下」 */
      if (soft && !audio.paused && audio.volume >= VOL * 0.85) {
        save();
        syncUi();
        return Promise.resolve();
      }
      resumeLock = (async () => {
        const t = getResumeTime();
        const near = Math.abs((audio.currentTime || 0) - t) <= 0.4;
        await seekWhenReady(t);
        if (soft) await waitCanPlay();
        let fadeMs = FADE_MS;
        let startVol = 0;
        if (soft) {
          const warm = audio.readyState >= 2;
          /* 有缓冲时从较高起点短淡入；冷启动才从很低音量爬 */
          startVol = warm ? Math.min(VOL * 0.62, VOL) : Math.min(VOL * 0.18, 0.08);
          fadeMs = warm ? 90 : 150;
          if (near && warm) {
            startVol = Math.min(VOL * 0.78, VOL);
            fadeMs = 70;
          }
        }
        try {
          audio.volume = startVol;
        } catch (_) {}
        try {
          await audio.play();
          confirmSeek(t);
          audio.addEventListener("playing", () => confirmSeek(t), { once: true });
          try {
            localStorage.setItem(KEY.on, "on");
          } catch (_) {}
          syncUi();
          save();
          await fadeTo(VOL, fadeMs);
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
      return resume();
    };

    const turnOff = async () => {
      try {
        localStorage.setItem(KEY.on, "off");
      } catch (_) {}
      await fadeTo(0, Math.min(220, FADE_MS));
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

    /* 仅在尚未就绪时预热；跨页勿 audio.load()，否则会丢掉缓冲与进度 */
    if (audio.readyState < 1) {
      try {
        audio.load();
      } catch (_) {}
    }

    if (shouldPlay()) resume({ soft: true });

    if (mode === "sigil" && toggle) {
      let lastUserAction = 0;
      let castTimer = 0;
      const playCast = () => {
        if (!sigilEl) return;
        sigilEl.classList.remove("casting");
        /* 双 rAF 重启动画，避免 offsetWidth 强制同步布局造成卡顿 */
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            sigilEl.classList.add("casting");
            if (castTimer) clearTimeout(castTimer);
            /* 覆盖最长涟漪（980ms + 160ms delay） */
            castTimer = setTimeout(() => sigilEl.classList.remove("casting"), 1200);
          });
        });
      };
      toggle.addEventListener("click", () => {
        lastUserAction = performance.now();
        playCast();
        togglePlay();
      });
      audio.addEventListener("pause", () => {
        if (localStorage.getItem(KEY.on) === "off") return;
        if (performance.now() - lastUserAction < 1200) return;
        setTimeout(() => {
          if (audio.paused && shouldPlay()) resume({ soft: true });
        }, 280);
      });
    }

    if (mode === "button" && toggle) {
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        togglePlay();
      });
    }

    const bindSaveOnNav = () => {
      document.querySelectorAll("a[href]").forEach((a) => {
        if (a.dataset.bgmBound) return;
        const href = a.getAttribute("href") || "";
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
          return;
        }
        if (/^https?:\/\//i.test(href) && !href.startsWith(location.origin)) return;
        a.dataset.bgmBound = "1";
        const mark = () => {
          try {
            localStorage.setItem(KEY.on, audio.paused ? (localStorage.getItem(KEY.on) || "") : "on");
          } catch (_) {}
          save();
        };
        a.addEventListener("click", mark, { capture: true });
        a.addEventListener("pointerdown", mark, { capture: true, passive: true });
        a.addEventListener("touchstart", mark, { capture: true, passive: true });
      });
    };
    bindSaveOnNav();
    const mo = new MutationObserver(bindSaveOnNav);
    mo.observe(document.documentElement, { childList: true, subtree: true });

    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);
    window.addEventListener("pageshow", (e) => {
      /* bfcache 回来时直接续；硬跳转也再试一次 */
      if (shouldPlay() && (e.persisted || audio.paused)) resume({ soft: true });
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") save();
      else if (shouldPlay() && audio.paused) resume({ soft: true });
    });
    setInterval(() => {
      if (!audio.paused) save();
    }, 500);

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

    return { audio, resume, togglePlay, save, turnOn, turnOff };
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
