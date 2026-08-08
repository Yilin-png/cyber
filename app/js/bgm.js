/* 背景音乐：跨页续播，首页手印 / 纪要页悬浮钮 / 报名登录页共用 */
window.CC = window.CC || {};

CC.BGM = (function(){
  const PLAYLIST = [
    "assets/audio/bgm.m4a"
  ];
  const KEY = { t:"cc-bgm-t", i:"cc-bgm-i", playing:"cc-bgm-playing", on:"cc-bgm" };

  /**
   * @param {object} opts
   * @param {"sigil"|"button"} [opts.mode="button"]  首页手印 / 悬浮钮
   * @param {string} [opts.audioId="bgm"]
   * @param {string} [opts.toggleId]  切换控件 id（coreJoin 或 bgmBtn）
   * @param {HTMLElement|null} [opts.sigilEl]  手印涟漪目标
   * @param {boolean} [opts.gestureKick=false]  移动端首次触摸续播
   */
  function init(opts = {}){
    const audio = document.getElementById(opts.audioId || "bgm");
    if (!audio) return null;

    const mode = opts.mode || "button";
    const toggle = opts.toggleId
      ? document.getElementById(opts.toggleId)
      : null;
    const sigilEl = opts.sigilEl || null;
    const hint = document.querySelector(".core-hint");

    audio.volume = 0.45;
    audio.loop = false;
    audio.preload = "auto";

    const trackSrc = i => new URL(PLAYLIST[i], location.href).href;
    const getI = () => {
      try{
        const i = parseInt(sessionStorage.getItem(KEY.i) || "0", 10);
        return (isFinite(i) && i >= 0 && i < PLAYLIST.length) ? i : 0;
      }catch(_){ return 0; }
    };

    let idx = getI();
    const setTrack = (i, t) => {
      idx = ((i % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
      if (audio.src !== trackSrc(idx)) audio.src = PLAYLIST[idx];
      if (t != null){
        const seek = () => { try{ audio.currentTime = t; }catch(_){} };
        if (audio.readyState >= 1) seek();
        else audio.addEventListener("loadedmetadata", seek, { once:true });
      }
    };
    setTrack(idx);

    audio.addEventListener("ended", () => {
      setTrack(idx + 1, 0);
      audio.play().catch(()=>{});
    });

    const getT = () => {
      try{
        const t = parseFloat(sessionStorage.getItem(KEY.t) || "0");
        return isFinite(t) ? t : 0;
      }catch(_){ return 0; }
    };

    const shouldPlay = () => {
      try{
        if (localStorage.getItem(KEY.on) === "off") return false;
        /* 显式关过才停；未设 on 时，若上一页在播也续上 */
        if (localStorage.getItem(KEY.on) === "on") return true;
        return sessionStorage.getItem(KEY.playing) === "1";
      }catch(_){
        return true;
      }
    };

    const save = () => {
      try{
        sessionStorage.setItem(KEY.t, String(audio.currentTime || 0));
        sessionStorage.setItem(KEY.i, String(idx));
        sessionStorage.setItem(KEY.playing, audio.paused ? "0" : "1");
      }catch(_){}
    };

    const syncUi = () => {
      if (mode === "sigil" && hint){
        hint.style.display = audio.paused ? "" : "none";
      }
      if (toggle){
        toggle.classList.toggle("on", !audio.paused);
        toggle.setAttribute("aria-pressed", String(!audio.paused));
      }
    };

    const resume = () => {
      const t = getT();
      const seek = () => { try{ if (t > 0 && Math.abs((audio.currentTime || 0) - t) > 0.35) audio.currentTime = t; }catch(_){} };
      if (audio.readyState >= 1) seek();
      else audio.addEventListener("loadedmetadata", seek, { once:true });
      return audio.play().then(() => {
        try{ localStorage.setItem(KEY.on, "on"); }catch(_){}
        syncUi();
      }).catch(syncUi);
    };

    const turnOn = () => {
      try{ localStorage.setItem(KEY.on, "on"); }catch(_){}
      return resume();
    };
    const turnOff = () => {
      try{ localStorage.setItem(KEY.on, "off"); }catch(_){}
      audio.pause();
      save();
      syncUi();
    };
    const togglePlay = () => audio.paused ? turnOn() : turnOff();

    audio.addEventListener("play", () => { syncUi(); save(); });
    audio.addEventListener("pause", syncUi);
    syncUi();

    if (shouldPlay()) resume();

    if (mode === "sigil" && toggle){
      let lastUserAction = 0;
      toggle.addEventListener("click", () => { lastUserAction = performance.now(); });
      audio.addEventListener("pause", () => {
        if (localStorage.getItem(KEY.on) === "off") return;
        if (performance.now() - lastUserAction < 1200) return;
        setTimeout(() => {
          if (audio.paused && shouldPlay()) resume();
        }, 300);
      });
      toggle.addEventListener("click", () => {
        if (sigilEl){
          sigilEl.classList.remove("casting");
          void sigilEl.offsetWidth;
          sigilEl.classList.add("casting");
          setTimeout(() => sigilEl.classList.remove("casting"), 1050);
        }
        togglePlay();
      });
    }

    if (mode === "button" && toggle){
      toggle.addEventListener("click", e => {
        e.stopPropagation();
        togglePlay();
      });
    }

    /* 跨页跳转前尽量写入进度；软拦同站 html 链接以同步落盘 */
    const bindSaveOnNav = () => {
      document.querySelectorAll("a[href]").forEach(a => {
        if (a.dataset.bgmBound) return;
        const href = a.getAttribute("href") || "";
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
        if (/^https?:\/\//i.test(href) && !href.startsWith(location.origin)) return;
        a.dataset.bgmBound = "1";
        a.addEventListener("click", save, { capture:true });
        a.addEventListener("touchend", save, { capture:true, passive:true });
      });
    };
    bindSaveOnNav();
    const mo = new MutationObserver(bindSaveOnNav);
    mo.observe(document.documentElement, { childList:true, subtree:true });

    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);
    window.addEventListener("pageshow", () => {
      if (shouldPlay() && audio.paused) resume();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") save();
      else if (shouldPlay() && audio.paused) resume();
    });
    setInterval(() => { if (!audio.paused) save(); }, 800);

    if (opts.gestureKick || shouldPlay()){
      const kick = () => {
        if (!shouldPlay()) return;
        if (audio.paused) resume();
      };
      const KICKS = ["pointerdown","touchstart","touchend","click","keydown"];
      KICKS.forEach(ev => document.addEventListener(ev, kick, { passive:true, capture:true }));
      audio.addEventListener("play", () =>
        KICKS.forEach(ev => document.removeEventListener(ev, kick, { capture:true })));
    }

    return { audio, resume, togglePlay, save };
  }

  return { init, PLAYLIST };
})();
