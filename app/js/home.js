/* Nature edition: original data, sessions and business routes, presented as a scroll narrative. */
(() => {
  "use strict";
  const root = document.getElementById("nature-root");
  if (!root || root.dataset.hydrated) return;
  root.dataset.hydrated = "true";
  const $ = (selector) => root.querySelector(selector);
  const all = (selector) => [...root.querySelectorAll(selector)];
  const esc = CC.esc;
  const data = window.DATA || {};
  const brief = data.home || {};
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isActive = () =>
    root.isConnected &&
    (!root.closest("[data-cc-slot]") ||
      root.closest("[data-cc-slot]").classList.contains("is-on"));

  // Every fresh homepage visit starts with the galaxy, including chapter links.
  // Remember that destination until the visitor explicitly opens the site.
  const entry = $("#cosmic-entry");
  const enterButton = $("#enter-site");
  const siteContent = $("#site-content");
  const html = document.documentElement;
  let entryDestination = location.hash;
  let entryState = "waiting";
  root.dataset.entryState = entryState;
  root.dataset.entryVersion = "nav-2";
  let entryFallback;
  const followCta = $(".follow-cta");
  const followButton = $("#join");
  let meteorTimer = 0;
  function canAnimateFollow() {
    if (!followCta || entryState !== "complete" || !isActive() ||
        document.hidden || reduced.matches || $("dialog[open]")) return false;
    const r = followButton.getBoundingClientRect();
    return r.bottom > 110 && r.top < innerHeight - 30;
  }
  function stopFollowMeteor() {
    clearTimeout(meteorTimer);
    meteorTimer = 0;
    followCta?.classList.remove("meteor-playing");
  }
  function queueFollowMeteor(delay = 850) {
    if (!canAnimateFollow() || meteorTimer || followCta.classList.contains("meteor-playing")) return;
    meteorTimer = setTimeout(() => {
      meteorTimer = 0;
      playFollowMeteor();
    }, delay);
  }
  function playFollowMeteor() {
    if (!canAnimateFollow() || followCta.classList.contains("meteor-playing")) return;
    clearTimeout(meteorTimer);
    meteorTimer = 0;
    followCta.classList.add("meteor-playing");
  }
  followCta?.addEventListener("pointerenter", playFollowMeteor);
  followButton?.addEventListener("focus", playFollowMeteor);
  followButton?.addEventListener("click", stopFollowMeteor);
  followCta?.addEventListener("animationend", (event) => {
    if (event.animationName !== "follow-meteor-flight") return;
    followCta.classList.remove("meteor-playing");
    queueFollowMeteor(12000);
  });
  function finishEntry() {
    if (entryState === "complete") return;
    entryState = "complete";
    root.dataset.entryState = entryState;
    clearTimeout(entryFallback);
    entry.hidden = true;
    entry.removeAttribute("aria-busy");
    siteContent.inert = false;
    html.classList.remove("intro-pending");
    root.classList.remove("entry-opening");
    root.classList.add("entry-complete");
    const destination = entryDestination && entryDestination !== "#top"
      ? document.getElementById(entryDestination.slice(1)) : null;
    const target = destination && root.contains(destination) ? destination : $("#top-title");
    if (destination && root.contains(destination)) destination.scrollIntoView({ block: "start", behavior: "instant" });
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    schedulePaint();
  }
  function showEntry(destination = "#top") {
    // Navigation can report the same visit more than once. Never restart a split.
    if (entryState === "opening") return;
    stopFollowMeteor();
    clearTimeout(entryFallback);
    entryDestination = destination;
    entryState = "waiting";
    root.dataset.entryState = entryState;
    root.classList.remove("entry-opening", "entry-complete");
    entry.hidden = false;
    entry.removeAttribute("aria-busy");
    enterButton.disabled = false;
    siteContent.inert = true;
    html.classList.add("intro-pending");
  }
  showEntry(entryDestination);
  // Every link whose destination is the homepage replays the same overture.
  // Other chapters and ordinary scrolling do not reopen it.
  document.addEventListener("click", (event) => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const dialogLink = event.target.closest?.("dialog[open] a[href]");
    if (dialogLink && root.contains(dialogLink)) dialogLink.closest("dialog").close();
    const link = event.target.closest?.("a[href]");
    if (!link || !root.contains(link) || !isActive() || link.target === "_blank" || link.hasAttribute("download")) return;
    const destination = new URL(link.href, location.href);
    const isHome = /\/(?:index\.html)?$/.test(destination.pathname);
    if (destination.origin === location.origin && isHome && (!destination.hash || destination.hash === "#top")) showEntry("#top");
  }, true);
  enterButton.addEventListener("click", () => {
    if (entryState !== "waiting") return;
    entryState = "opening";
    root.dataset.entryState = entryState;
    enterButton.disabled = true;
    entry.setAttribute("aria-busy", "true");
    // Reveal the same snow scene even if history restored an older scroll.
    const behavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    html.style.scrollBehavior = behavior;
    if (reduced.matches) {
      finishEntry();
      return;
    }
    root.classList.add("entry-opening");
    // Native animation completion plus a fallback for a backgrounded tab.
    entryFallback = setTimeout(finishEntry, 1650);
  });
  entry.addEventListener("animationend", (e) => {
    if (e.animationName === "entry-curtain-right") finishEntry();
  });
  reduced.addEventListener("change", () => {
    if (reduced.matches && entryState === "opening") finishEntry();
  });

  // Render the maintained source dataset before binding search/filter controls.
  const categoryNames = Object.fromEntries(
    (data.toolCats || []).map((c) => [c.k, c.name]),
  );
  const tools = [...(data.tools || [])].sort((a, b) =>
    String(a.sortKey || a.name)
      .toLowerCase()
      .localeCompare(String(b.sortKey || b.name).toLowerCase(), "en"),
  );
  if (tools.length) {
    $("#tool-grid").innerHTML = tools
      .map(
        (t) =>
          `<article class="tool-card" data-category="${esc(categoryNames[t.cat] || t.label || "")}" data-search="${esc([t.name, t.role, t.desc, ...(t.tags || [])].join(" "))}"><div class="tool-tags"><span>${esc(t.label || "")}</span></div><h3>${esc(t.name)}</h3><p>${esc(brief.tools?.[t.name] || t.desc || "")}</p><a href="${esc(t.link)}" target="_blank" rel="noopener noreferrer">${esc(t.linkText || "访问官网")} ↗</a></article>`,
      )
      .join("");
  }
  const cards = all(".tool-card");
  let category = "全部";
  const search = $("#tool-search");
  const filterTools = () => {
    const query = search.value.trim().toLocaleLowerCase();
    let count = 0;
    cards.forEach((card) => {
      const show =
        (category === "全部" || card.dataset.category === category) &&
        (card.dataset.search + " " + card.textContent)
          .toLocaleLowerCase()
          .includes(query);
      card.hidden = !show;
      if (show) count++;
    });
    $("#tool-count").textContent =
      `${count} 个工具 / ${category}${query ? " / 搜索：" + search.value.trim() : ""}`;
    $("#tool-empty").hidden = count !== 0;
  };
  const selectCategory = (button) => {
    category = button.dataset.filter;
    all("#tool-filters button").forEach((b) =>
      b.setAttribute("aria-pressed", String(b === button)),
    );
    filterTools();
  };
  search.addEventListener("input", filterTools);
  all("#tool-filters button").forEach((b) =>
    b.addEventListener("click", () => selectCategory(b)),
  );
  $("#reset-tools").addEventListener("click", () => {
    search.value = "";
    selectCategory($('[data-filter="全部"]'));
    search.focus();
  });
  filterTools();

  const kindName = {
    home: "个人主页",
    wechat: "公众号",
    github: "GitHub",
    tool: "小工具",
  };
  if (data.artifacts?.length) {
    $(".gallery-list").innerHTML = data.artifacts
      .map((work, index) => {
        const pending = work.status !== "live";
        const kind = kindName[work.kind] || "个人主页";
        const action = work.img
          ? '<button type="button" class="work-link" data-dialog="wechat-dialog">查看公众号二维码 ↗</button>'
          : work.link
            ? `<a href="${esc(work.link)}" target="_blank" rel="noopener noreferrer" class="work-link">${esc(work.linkText || "打开主页")} ↗</a>`
            : '<a class="work-link" href="mailto:info@cyber-casters.com?subject=%E8%B5%9B%E5%8D%9A%E6%B3%95%E5%B8%88%E4%BD%9C%E5%93%81%E6%8A%95%E7%A8%BF">提交作品链接 ↗</a>';
        return `<article class="member-work${pending ? " pending" : ""}" data-gallery="${esc(kind)}"><span class="work-no">${String(index + 1).padStart(2, "0")} / ${esc(kind)}</span><div class="work-title"><h3${work.kind === "home" ? " data-no-i18n" : ""}>${esc(work.name)}${pending ? "<small>待补充</small>" : ""}</h3><p>${esc(brief.works?.[work.name] || work.desc)}</p></div>${action}</article>`;
      })
      .join("");
  }
  const filterGallery = (selected) => {
    all("[data-gallery-filter]").forEach((b) =>
      b.setAttribute(
        "aria-pressed",
        String(b.dataset.galleryFilter === selected),
      ),
    );
    const works = all("[data-gallery]");
    works.forEach((w) => {
      w.hidden = selected !== "全部" && w.dataset.gallery !== selected;
    });
    const shown = works.filter((w) => !w.hidden);
    const pending = shown.filter((w) => w.classList.contains("pending")).length;
    $("#gallery-count").textContent =
      `${shown.length - pending} 项公开展示${pending ? ` · ${pending} 项待补充` : ""}`;
  };
  all("[data-gallery-filter]").forEach((b) =>
    b.addEventListener("click", () => filterGallery(b.dataset.galleryFilter)),
  );
  filterGallery("全部");

  const prep = {
    share: [
      "带一个你亲自用过的方法。",
      "准备：应用场景 → 具体做法 → 实际效果 → 适用边界。可以带截图、示例，或用电脑现场演示。",
    ],
    question: [
      "带一个还没解开的 AI 使用难题。",
      "说清你想完成什么、已经尝试过什么，以及卡在了哪一步。准备一个具体例子，方便大家一起拆解。",
    ],
  };
  all("[data-prep]").forEach((b) =>
    b.addEventListener("click", () => {
      all("[data-prep]").forEach((item) =>
        item.setAttribute("aria-pressed", String(item === b)),
      );
      const [title, text] = prep[b.dataset.prep];
      $("#prep-content h4").textContent = title;
      $("#prep-content p").textContent = text;
    }),
  );

  all("[data-dialog]").forEach((b) =>
    b.addEventListener("click", () => {
      const dialog = $("#" + b.dataset.dialog);
      stopFollowMeteor();
      dialog.showModal();
      document.body.style.overflow = "hidden";
    }),
  );
  all("dialog").forEach((dialog) => {
    dialog
      .querySelector(".dialog-close")
      .addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      const r = dialog.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        dialog.close();
    });
    dialog.addEventListener("close", () => {
      document.body.style.overflow = "";
      schedulePaint();
    });
  });

  // The invitation remains available, without dominating the next meetup.
  const openInvitation = () => {
    if (location.hash === "#invitation-003") $("#invitation-003").open = true;
  };
  all("[data-invitation]").forEach((link) =>
    link.addEventListener("click", () => {
      $("#" + link.dataset.invitation).open = true;
    }),
  );
  window.addEventListener("hashchange", openInvitation);
  openInvitation();

  const menuButton = $("#menu-toggle");
  const menu = $("#mobile-nav");
  const closeMenu = (focus = false) => {
    menu.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "打开导航菜单");
    document.body.style.overflow = "";
    if (focus) menuButton.focus();
  };
  menuButton.addEventListener("click", () => {
    const open = menu.hidden;
    menu.hidden = !open;
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute(
      "aria-label",
      open ? "关闭导航菜单" : "打开导航菜单",
    );
    document.body.style.overflow = open ? "hidden" : "";
  });
  // The existing SPA handles anchors at document capture, before menu bubbling.
  document.addEventListener(
    "click",
    (e) => {
      if (isActive() && menu.contains(e.target) && e.target.closest("a"))
        closeMenu();
    },
    true,
  );
  document.addEventListener("keydown", (e) => {
    if (isActive() && e.key === "Escape" && !menu.hidden) closeMenu(true);
  });
  window.matchMedia("(min-width:1001px)").addEventListener("change", (e) => {
    if (e.matches) closeMenu();
  });

  // Keep metadata and entry points connected to the original API.
  let archiveGeneration = 0;
  function refreshArchive() {
    const generation = ++archiveGeneration;
    return CC.api("/api/gatherings")
      .then((payload) => {
        if (generation !== archiveGeneration) return;
        for (const gathering of payload.gatherings || []) {
          const entry = all(".archive-item").find((a) =>
            new URL(a.href, location.href).pathname.endsWith(
              "/" + gathering.link,
            ),
          );
          if (entry) {
            entry.querySelector("p").textContent =
              brief.activity?.[gathering.id] || gathering.summary;
            continue;
          }
          if (!/^gathering-\d+\.html$/.test(gathering.link || "")) continue;
          const entryLink = document.createElement("a");
          entryLink.href = gathering.link;
          entryLink.className = "archive-item";
          entryLink.innerHTML = `<time>${esc(gathering.date)}</time><span class="archive-issue">${esc(gathering.id)}</span><div><h3>${esc(gathering.title)}</h3><p>${esc(gathering.summary)}</p></div><span class="access-label">纪要 · 成员权限</span><span class="arrow" aria-hidden="true">↗</span>`;
          $(".archive-list").prepend(entryLink);
        }
      })
      .catch(() => {});
  }
  refreshArchive();

  let authGeneration = 0;
  async function refreshAuth() {
    const generation = ++authGeneration;
    try {
      const me = await CC.authMe();
      if (generation !== authGeneration) return;
      const member =
        me.auth &&
        (me.admin || me.user?.isAdmin || me.user?.gatherings?.length);
      $("#header-login").textContent = me.auth ? "我的纪要 ↗" : "成员登录 ↗";
      $("#header-login").href = me.auth ? "gathering-002.html" : "login.html";
      $("#member-spells").replaceChildren();
      root.querySelector("#homeLogout")?.remove();
      const login = $("#member-login-link");
      login.textContent = me.auth ? "查看完整纪要 ↗" : "登录查看使用心得 ↗";
      login.href = me.auth
        ? "gathering-002.html"
        : "login.html?next=index.html%23toolkit";
      if (!member) {
        $("#member-status").textContent = me.auth
          ? "当前账号尚未开通参会权限，可联系组织者。"
          : "参会成员登录后，可查阅集会摘录与完整纪要。";
        return;
      }
      $("#member-status").textContent =
        `${me.user?.name || "成员"}，欢迎回来。以下为已开放纪要中的使用心得。`;
      const logout = document.createElement("button");
      logout.type = "button";
      logout.id = "homeLogout";
      logout.className = "text-link";
      logout.textContent = "退出登录";
      logout.style.cssText =
        "border:0;border-bottom:1px solid var(--line);background:none;color:inherit";
      logout.addEventListener("click", async () => {
        await CC.logout();
        await CC.api("/api/admin/logout", { method: "POST", body: "{}" }).catch(
          () => {},
        );
        location.reload();
      });
      $(".member-links").appendChild(logout);
      const result = await CC.api("/api/member/spells");
      if (generation !== authGeneration) return;
      $("#member-spells").innerHTML =
        '<div class="member-spell-grid">' +
        (result.groups || [])
          .flatMap((group) =>
            group.items.map(
              (item) =>
                `<article class="member-spell"><small>${esc(group.group)}</small><h4>${esc(item.t)}</h4><p>${esc(item.d)}</p><a href="${esc(item.u || group.src)}">出自纪要 ↗</a></article>`,
            ),
          )
          .join("") +
        "</div>";
    } catch (_) {
      $("#member-status").textContent =
        "使用心得暂时无法载入，可进入纪要目录查阅。";
    }
  }
  refreshAuth();
  document.addEventListener("cc:language", () => {
    refreshArchive();
    refreshAuth();
    schedulePaint();
  });
  document.addEventListener("cc:page", (e) => {
    if (e.detail.key === "index.html" && isActive()) {
      if (!location.hash || location.hash === "#top") showEntry("#top");
      closeMenu();
      refreshAuth();
      schedulePaint();
    }
  });
  window.addEventListener("pageshow", (event) => {
    if (isActive()) {
      if (event.persisted) showEntry(location.hash);
      refreshAuth();
    }
  });

  // Native hash changes and same-page history returns bypass SPA activation.
  const replayOnHomeLocation = () => {
    if (isActive() && (!location.hash || location.hash === "#top")) showEntry("#top");
  };
  window.addEventListener("hashchange", replayOnHomeLocation);
  window.addEventListener("popstate", replayOnHomeLocation);

  const scenes = all(".scene");
  const sections = all("main > section[id]");
  const indexLinks = all(".chapter-index a");
  const chapterCursor = $(".chapter-cursor");
  let currentChapter = "";
  let requestedChapter = null;
  const bounceChapter = (link) => {
    if (reduced.matches) return;
    const label = link.querySelector(".chapter-label");
    label.getAnimations().forEach((animation) => animation.cancel());
    label.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(15px)", offset: 0.38 },
        { transform: "translateX(-5px)", offset: 0.66 },
        { transform: "translateX(3px)", offset: 0.84 },
        { transform: "translateX(0)" },
      ],
      { duration: 650, easing: "cubic-bezier(.22,.7,.32,1)" },
    );
  };
  document.addEventListener(
    "click",
    (e) => {
      const link = e.target.closest(".chapter-index a");
      if (
        !isActive() ||
        !link ||
        !root.contains(link) ||
        e.button > 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      requestedChapter = {
        key: link.hash.slice(1),
        until: performance.now() + 1800,
      };
      if (currentChapter === requestedChapter.key) bounceChapter(link);
      schedulePaint();
    },
    true,
  );
  const header = $("#site-header");
  const chapterKeys = [
    "top",
    "about",
    "gathering",
    "toolkit",
    "gallery",
    "cosmos",
  ];
  let scheduled = false;
  function paint() {
    scheduled = false;
    if (!isActive() || document.hidden) {
      stopFollowMeteor();
      return;
    }
    if (canAnimateFollow()) queueFollowMeteor();
    else stopFollowMeteor();
    const viewport = innerHeight;
    let surface = "paper";
    let imageChapter = "";
    for (const scene of scenes) {
      const r = scene.getBoundingClientRect();
      if (r.top <= 1 && r.bottom > header.offsetHeight)
        surface = scene.dataset.scene;
      if (r.top <= viewport * 0.45 && r.bottom > viewport * 0.45) {
        imageChapter = {
          snow: "top",
          ocean: "about",
          coast: "gathering",
          cosmos: "cosmos",
        }[scene.dataset.scene];
      }
      if (r.bottom > 0 && r.top < viewport) {
        const progress = Math.max(
          0,
          Math.min(1, -r.top / Math.max(1, r.height - viewport)),
        );
        const image = scene.querySelector("img");
        const copy = scene.querySelector(".scene-copy");
        image.style.transform = reduced.matches
          ? "none"
          : `translateY(${-progress * 10}px) scale(${1.045 - progress * 0.045})`;
        copy.style.transform = reduced.matches
          ? "none"
          : `translateY(${-progress * 55}px)`;
        copy.style.opacity = reduced.matches
          ? "1"
          : String(1 - Math.max(0, progress - 0.45) * 0.75);
      }
    }
    root.dataset.surface = surface;
    header.dataset.surface = surface;
    let chapter = imageChapter;
    if (!chapter) {
      chapter = "top";
      for (const section of sections) {
        if (
          chapterKeys.includes(section.id) &&
          section.getBoundingClientRect().top < viewport * 0.45
        )
          chapter = section.id;
      }
    }
    if (requestedChapter) {
      const target = $("#" + requestedChapter.key);
      if (
        performance.now() > requestedChapter.until ||
        Math.abs(target.getBoundingClientRect().top) < 100
      ) {
        chapter = requestedChapter.key;
        requestedChapter = null;
      } else chapter = requestedChapter.key;
    }
    indexLinks.forEach((link) => {
      if (link.hash === "#" + chapter) {
        link.setAttribute("aria-current", "location");
        chapterCursor.style.transform = `translateY(${link.offsetTop + link.offsetHeight / 2 - 13}px)`;
        if (currentChapter !== chapter) bounceChapter(link);
      } else link.removeAttribute("aria-current");
    });
    currentChapter = chapter;
    const maximum = Math.max(
      1,
      document.documentElement.scrollHeight - viewport,
    );
    $(".reading-progress i").style.transform =
      `scaleX(${Math.max(0, Math.min(1, scrollY / maximum))})`;
  }
  function schedulePaint() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(paint);
    }
  }
  window.addEventListener("scroll", schedulePaint, { passive: true });
  window.addEventListener("resize", schedulePaint, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopFollowMeteor();
    else schedulePaint();
  });
  reduced.addEventListener("change", () => {
    stopFollowMeteor();
    schedulePaint();
  });
  const reveals = all(
    ".belief-intro,.values>li,.practice-notes>article,.archive-heading,.gallery-heading,.library-heading,.member-work,.join-layout",
  );
  if ("IntersectionObserver" in window && !reduced.matches) {
    root.classList.add("is-enhanced");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.08 },
    );
    reveals.forEach((el) => {
      el.classList.add("reveal");
      observer.observe(el);
    });
  }
  schedulePaint();
  CC.BGM.init({ mode: "button", toggleId: "bgmBtn", gestureKick: true });
})();
