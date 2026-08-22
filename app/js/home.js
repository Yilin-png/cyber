/* 首页渲染与交互 */
/* ---------- 渲染 ---------- */
const $ = CC.$;
const esc = CC.esc;

$("#footNote").textContent = DATA.contact;

/* 左侧滚动名词表：列表复制两份，位移 -50% 即无缝循环 */
const TR = DATA.trending, trN = TR.length;
/* 左侧词表：每条一行，JS 按纵向位置实时插值颜色（两端暗紫、中间亮青） */
$("#credits").innerHTML =
  `<ul style="animation-duration:${Math.round(trN * 1.5)}s">` +
  TR.concat(TR).map((t,i) => `<li>${esc(t)}</li>`).join("") + `</ul>`;
/* 首屏可见性总闸：滚出视口 / 切到后台就停掉首屏的逐帧活儿，
   把帧预算整个让给滚动。注册者会立刻收到一次当前状态。 */
const heroEl = $(".hero");
const heroWatchers = [];
let heroLive = true;
const onHeroLive = fn => { heroWatchers.push(fn); fn(heroLive); };
const pushHeroLive = v => {
  if (v === heroLive) return;
  heroLive = v;
  heroWatchers.forEach(fn => fn(v));
};
if (heroEl && "IntersectionObserver" in window){
  new IntersectionObserver(es => {
    const vis = es[0].isIntersecting;
    heroEl.classList.toggle("is-idle", !vis);
    pushHeroLive(vis && !document.hidden);
  }, { rootMargin:"100px 0px" }).observe(heroEl);
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pushHeroLive(false);
  else if (heroEl && !heroEl.classList.contains("is-idle")) pushHeroLive(true);
});

(function(){
  const box = $("#credits");
  const items = [...box.querySelectorAll("li")];
  /* 颜色插值：两端暗紫灰 → 中间主题青；随主题切换重读 */
  let edge = [110,103,144], mid = [63,224,208];
  const readThemeColors = () => {
    const cs = getComputedStyle(document.documentElement);
    const parse = (v, fb) => {
      const s = (cs.getPropertyValue(v) || "").trim();
      const m = s.match(/^#([0-9a-f]{6})$/i);
      if (!m) return fb;
      const n = parseInt(m[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    edge = parse("--ash", edge);
    mid = parse("--cyan", mid);
  };
  readThemeColors();
  document.addEventListener("cc:theme", readThemeColors);
  const lerp = (a,b,t) => Math.round(a + (b-a)*t);
  const ul = box.querySelector("ul");
  const rowH = items[0] ? (items[0].offsetHeight || 22) : 22;
  const H = box.clientHeight || 198;
  let raf = 0, lastPaint = 0;
  const paint = () => {
    let shift = 0;
    if (ul){
      const tr = getComputedStyle(ul).transform;
      if (tr && tr !== "none"){
        const m = tr.match(/matrix\(([^)]+)\)/);
        if (m) shift = parseFloat(m[1].split(",")[5]) || 0;
      }
    }
    for (let i = 0; i < items.length; i++){
      const cy = i * rowH + rowH / 2 + shift;
      const d = Math.min(1, Math.abs(cy - H / 2) / (H / 2));
      const t = 1 - d;
      items[i].style.color =
        `rgb(${lerp(edge[0],mid[0],t)},${lerp(edge[1],mid[1],t)},${lerp(edge[2],mid[2],t)})`;
    }
  };
  const loop = ts => {
    /* ~20fps 足够跟滚动色带，不必跟 SVG 抢 60 帧 */
    if (ts - lastPaint >= 50){ paint(); lastPaint = ts; }
    raf = requestAnimationFrame(loop);
  };
  onHeroLive(live => {
    if (live && !raf) raf = requestAnimationFrame(loop);
    else if (!live && raf){ cancelAnimationFrame(raf); raf = 0; }
  });
})();

/* 右侧终端读数：mana / 人数带轻微活态起伏（非布局抖动） */
const manaBase = Math.max(0, Math.min(100, DATA.mana|0));
const membersBase = DATA.pulse.members|0;
const BAR_N = 10;
const barCells = () => Array.from({length:BAR_N}, (_,i) =>
  `<i class="cell" data-i="${i}"></i>`).join("");

$("#term").innerHTML = `
  <span class="q">&gt; casters --status</span>
  <span class="v v-online">ONLINE</span>
  <span class="q">&gt; members</span>
  <span class="v v-members" id="termMembers">${membersBase}</span>
  <span class="q">&gt; mana</span>
  <span class="v v-mana"><span class="bar" id="termBar" style="--fill:0">${barCells()}</span> <span class="pct" id="termPct">0%</span></span>
  <span class="q">&gt; next.gathering</span>
  <span class="v v-next">${esc(DATA.nextGathering)}</span>
  <span class="q">&gt; <span class="cursor"></span></span>
`;

const termBar = $("#termBar");
const termPct = $("#termPct");
const termMembers = $("#termMembers");
const setManaUI = v => {
  const n = Math.max(0, Math.min(100, v));
  const fill = n / 100;
  if (termBar) termBar.style.setProperty("--fill", fill.toFixed(3));
  if (termPct) termPct.textContent = Math.round(n) + "%";
  if (termBar){
    [...termBar.children].forEach((c,i) => {
      c.classList.toggle("on", (i + .5) / BAR_N <= fill);
      c.classList.toggle("edge", Math.abs((i + .5) / BAR_N - fill) < .08 && fill > 0 && fill < 1);
    });
  }
};
setManaUI(0);

/* 标语下：下一期活动时间 */
const nextEl = $("#nextMeet");
if (nextEl && DATA.nextGathering){
  nextEl.innerHTML =
    `<span class="nm-label">下一期</span>` +
    `<span class="nm-dot" aria-hidden="true"></span>` +
    `<span class="nm-date">${esc(DATA.nextGathering)}</span>`;
}

/* 终端活态：mana 快呼吸 + 人数高频跳变；首屏不可见时停 */
(function(){
  let raf = 0, t0 = 0;
  let mem = membersBase;
  let nextMemAt = 0;
  const easeOut = x => 1 - Math.pow(1 - x, 3);

  const tick = ts => {
    if (!t0) t0 = ts;
    const t = (ts - t0) / 1000;

    /* 入场 0.45s 填到基准，之后大幅快呼吸（约 ±22～28） */
    let mana;
    if (t < .45) mana = manaBase * easeOut(t / .45);
    else mana = manaBase
      + Math.sin((t - .45) * 4.2) * 18
      + Math.sin((t - .45) * 7.8) * 8
      + Math.sin((t - .45) * 13.5) * 4;
    setManaUI(mana);

    /* 人数：每 0.18–0.45s 跳 ±8～28 */
    if (ts >= nextMemAt){
      const span = 8 + Math.floor(Math.random() * 21);
      const delta = (Math.random() < .5 ? 1 : -1) * span;
      mem = Math.max(1, membersBase + delta);
      if (termMembers){
        termMembers.textContent = mem;
        termMembers.classList.remove("flash");
        void termMembers.offsetWidth;
        termMembers.classList.add("flash");
      }
      nextMemAt = ts + 180 + Math.random() * 270;
    }

    raf = requestAnimationFrame(tick);
  };

  onHeroLive(live => {
    if (live && !raf){
      t0 = 0;
      nextMemAt = 0;
      raf = requestAnimationFrame(tick);
    } else if (!live && raf){
      cancelAnimationFrame(raf);
      raf = 0;
      setManaUI(manaBase);
      if (termMembers) termMembers.textContent = membersBase;
    }
  });
})();

function localPage(href) {
  /* 统一成相对路径，避免 /xxx 在 file:// 下失效 */
  if (!href) return "";
  if (/^https?:\/\//i.test(href)) return href;
  return String(href).replace(/^\//, "");
}

function renderCards(list) {
  return (list || []).map(p => {
    const href = localPage(p.link && p.link !== "#" ? p.link : "");
    const external = /^https?:\/\//i.test(href);
    const linkAttrs = external ? ` target="_blank" rel="noopener noreferrer"` : "";
    return `
    <article class="card">
      <div class="card-top">
        <h3>${esc(p.name)}</h3>
        <span class="status ${esc(p.status || "")}">${esc(p.label || "")}</span>
      </div>
      ${p.role ? `<div class="role">${esc(p.role)}</div>` : ""}
      <p>${esc(p.desc || "")}</p>
      ${p.tags && p.tags.length
        ? `<div class="tags">${p.tags.map(t => `<span>${esc(t)}</span>`).join("")}</div>`
        : ""}
      ${href
        ? `<a class="card-link" href="${esc(href)}"${linkAttrs}>${esc(p.linkText || "打开")}<span class="arrow" aria-hidden="true">→</span></a>`
        : ""}
    </article>`;
  }).join("");
}

function renderActivity(items) {
  const sorted = [...(items || [])].sort((a, b) =>
    String(b.date || "").localeCompare(String(a.date || ""))
  );
  $("#logList").innerHTML = sorted.map((a, i) => {
    const upcoming = a.status === "upcoming" || a.label === "待举办";
    const href = upcoming ? "" : localPage(a.link || "");
    const statusLabel = a.label || (upcoming ? "待举办" : "");
    const statusHtml = statusLabel
      ? `<span class="status ${esc(a.status || (upcoming ? "upcoming" : ""))}">${esc(statusLabel)}</span>`
      : "";
    const titleInner = href
      ? `<a class="log-title" href="${esc(href)}">${esc(a.title)}</a>`
      : esc(a.title);
    const metaBits = [a.mode, a.place].filter(Boolean);
    const cta = href
      ? `<a class="log-link" href="${esc(href)}">${esc(a.linkText || "阅读公开纪要")}<span class="arrow" aria-hidden="true">→</span></a>`
      : (upcoming
        ? `<a class="log-link" href="apply.html">申请参加<span class="arrow" aria-hidden="true">→</span></a>`
        : "");
    return `
    <article class="log-item${upcoming ? " is-upcoming" : " is-past"}" ${i === 0 ? "data-latest" : ""} ${href ? `data-href="${esc(href)}"` : ""}>
      <div class="log-date">${esc(a.date)}</div>
      <h3 class="log-heading">${titleInner}${statusHtml}</h3>
      <div class="log-meta">${esc(metaBits.join(" · "))}</div>
      <p>${esc(a.desc)}</p>
      ${cta}
    </article>`;
  }).join("");
}

/* 活动记录跳转：显式 assign，避免 <a> 被环境吞掉不跳转 */
const logListEl = $("#logList");
if (logListEl && !logListEl.dataset.navBound) {
  logListEl.dataset.navBound = "1";
  logListEl.addEventListener("click", e => {
    const a = e.target.closest("a.log-link, a.log-title");
    const item = e.target.closest(".log-item[data-href]");
    const href = (a && a.getAttribute("href")) || (item && item.getAttribute("data-href"));
    if (!href || /^https?:\/\//i.test(href)) return;
    e.preventDefault();
    CC.BGM.persist?.(document.getElementById("bgm"));
    if (CC.BGM.go) CC.BGM.go(href);
    else window.location.assign(href);
  });
}

renderActivity(DATA.activity);
$("#artList").innerHTML = renderCards(DATA.artifacts);

(async function syncActivity() {
  try {
    const data = await CC.api("/api/gatherings");
    const list = (data.gatherings || []).map(g => {
      const upcoming = g.status === "upcoming";
      return {
        date: g.date,
        time: g.time || "",
        title: g.title,
        mode: g.mode,
        place: g.place,
        status: g.status || (g.link ? "past" : "upcoming"),
        label: upcoming ? "待举办" : "",
        desc: g.summary,
        link: upcoming ? "" : localPage(g.link || ""),
        linkText: upcoming ? "" : "阅读公开纪要"
      };
    });
    if (list.length) renderActivity(list);
  } catch (_) {}
})();

const SPELL_CATS = [
  { k: "prod",   name: "产品",   en: "PRODUCTS" },
  { k: "tool",   name: "工具",   en: "TOOLS" },
  { k: "method", name: "方法论", en: "METHODOLOGY" },
  { k: "exp",    name: "经验",   en: "EXPERIENCE" },
  { k: "pit",    name: "踩坑",   en: "PITFALLS" }
];

let toolCat = "all";

function sortedTools() {
  const key = t => String(t.sortKey || t.name).toLowerCase();
  return [...(DATA.tools || [])].sort((a, b) => key(a).localeCompare(key(b), "en"));
}

function renderToolsPublic() {
  const all = sortedTools();
  if (!all.length) {
    return `<p class="toolkit-intro">集会上讨论过的工具将陆续以卡片形式收录于此。</p>`;
  }

  const cats = (DATA.toolCats || [{ k: "all", name: "全部" }]).filter(c =>
    c.k === "all" || all.some(t => t.cat === c.k)
  );
  if (!cats.some(c => c.k === toolCat)) toolCat = "all";

  const chips = cats.map(c => {
    const n = c.k === "all" ? all.length : all.filter(t => t.cat === c.k).length;
    return `<button type="button" class="filter-chip" data-cat="${esc(c.k)}"
      aria-pressed="${c.k === toolCat}">${esc(c.name)}<span class="n">${n}</span></button>`;
  }).join("");

  const list = toolCat === "all" ? all : all.filter(t => t.cat === toolCat);
  const grid = list.length
    ? `<div class="grid">${renderCards(list)}</div>`
    : `<p class="toolkit-intro">该分类下暂无工具。</p>`;

  return `<div class="filter-bar" role="group" aria-label="工具分类筛选">${chips}</div>${grid}`;
}

function renderSpellsMember() {
  const FLAT = (DATA.spells || []).flatMap(g =>
    g.items.map(s => ({
      name: s.t,
      status: s.k,
      label: (SPELL_CATS.find(c => c.k === s.k) || {}).name || s.k,
      role: g.group,
      desc: s.d,
      tags: [g.group],
      link: localPage(s.u || g.src || ""),
      linkText: g.src ? "出自纪要" : (s.u ? "前往" : "")
    }))
  );
  if (!FLAT.length) return "";
  return `
    <h3 class="spell-cat">使用心得</h3>
    <div class="grid">${renderCards(FLAT)}</div>`;
}

function renderSpellsMemberLocked() {
  return `
    <h3 class="spell-cat">使用心得</h3>
    <div class="lock-box">
      <h2>使用心得需成员权限</h2>
      <p>上面的工具卡片可自由查阅。具体使用心得请参会登录后查看。</p>
      <div class="lock-actions">
        <a class="btn btn-primary" href="login.html">成员登录</a>
        <a class="btn btn-ghost" href="apply.html">申请加入</a>
      </div>
    </div>`;
}

let spellbookMember = false;

function renderSpellbook(member) {
  spellbookMember = !!member;
  const publicPart = renderToolsPublic();
  const memberPart = spellbookMember ? renderSpellsMember() : renderSpellsMemberLocked();
  $("#spellList").innerHTML = publicPart + memberPart;
}

/* 筛选交给容器代理，重渲染后无需重新绑定 */
const spellListEl = $("#spellList");
if (spellListEl && !spellListEl.dataset.filterBound) {
  spellListEl.dataset.filterBound = "1";
  spellListEl.addEventListener("click", e => {
    const chip = e.target.closest(".filter-chip");
    if (!chip) return;
    const cat = chip.dataset.cat;
    if (!cat || cat === toolCat) return;
    toolCat = cat;
    renderSpellbook(spellbookMember);
  });
}

(function renderAbout() {
  const about = DATA.about;
  const el = $("#aboutBlock");
  if (!el || !about) return;
  const items = (about.principles || []).map((p, i) => `
    <li class="about-item">
      <span class="about-no">${String(i + 1).padStart(2, "0")}</span>
      <div>
        <h4>${esc(p.title)}</h4>
        <p>${esc(p.body)}</p>
      </div>
    </li>`).join("");
  el.innerHTML = `
    <div class="about-lead">
      <h3>${esc(about.title)}</h3>
      <p>${esc(about.lead)}</p>
    </div>
    <ol class="about-list">${items}</ol>`;
})();

$("#chanList").innerHTML = DATA.channels.map(c => {
  const variant = c.variant === "ghost" ? "ghost" : "primary";
  const body = c.type === "qr"
    ? `<div class="qr-slot">${c.img ? `<img src="${esc(c.img)}" alt="${esc(c.name)}二维码">` : esc(c.alt||"").replace(/\n/g,"<br>")}</div>`
    : `<a class="go go-${variant}" href="${esc(c.url)}">${esc(c.cta||"前往")}<span class="arrow" aria-hidden="true">→</span></a>`;
  return `<div class="channel channel-${variant}">
    ${c.kicker ? `<div class="channel-kicker">${esc(c.kicker)}</div>` : ""}
    <h3>${esc(c.name)}</h3>
    <div class="note">${esc(c.note||"")}</div>
    ${body}
  </div>`;
}).join("") + (() => {
  const w = DATA.wechatCommunity;
  if (!w) return "";
  return `<div class="wechat-card">
    <div class="wechat-kicker">${esc(w.kicker || "COMMUNITY")}</div>
    <div class="wechat-top">
      <h3>${esc(w.title || "微信社群")}</h3>
      ${w.status === "pending" ? `<span class="wechat-badge">待维护</span>` : ""}
    </div>
    <p>${esc(w.note || "")}</p>
    <div class="wechat-slot" aria-hidden="true">二维码待维护</div>
  </div>`;
})();

/* 登录态：公开工具目录始终展示；使用心得按成员解锁 */
renderSpellbook(false);
(async function syncAuth(){
  const foot = $("#footNote");
  try {
    const me = await CC.authMe();
    const member = !!(me.auth && (
      me.admin ||
      me.user?.isAdmin ||
      (me.user && me.user.gatherings && me.user.gatherings.length)
    ));
    renderSpellbook(DATA.spellsMemberOnly ? member : true);

    if (me.auth) {
      const who = me.admin
        ? `${esc(me.user?.name || me.admin.username)}（管理）`
        : esc(me.user.name);
      const ids = [...(me.admin ? ["001", "002"] : (me.user?.gatherings || []))].filter(Boolean).sort();
      const notesHref = `gathering-${me.admin || ids.length ? "002" : "001"}.html`;
      foot.innerHTML = `${who} · <a href="${notesHref}" style="color:var(--cyan)">我的纪要</a> · <a href="#" id="homeLogout" style="color:var(--cyan)">退出</a>`;
      const btn = document.getElementById("homeLogout");
      if (btn) btn.addEventListener("click", async e => {
        e.preventDefault();
        await CC.logout();
        try { await CC.api("/api/admin/logout", { method: "POST", body: "{}" }); } catch (_) {}
        location.reload();
      });
    } else {
      foot.innerHTML = `${esc(DATA.contact)} · <a href="login.html" style="color:var(--cyan)">登录</a> · <a href="apply.html" style="color:var(--cyan)">申请</a>`;
    }
  } catch (_) {
    renderSpellbook(false);
  }
})();


/* ---------- 标签切换 ---------- */
/* 标签栏「归位点」＝它在文档流里的自然位置。
   不能用 getBoundingClientRect：吸顶后它的 top 恒为 0，算出来的坐标是错的。
   main 的 offsetTop 不受 sticky 影响，减掉标签栏自身高度就是正确锚点。 */
const tbOuter = $(".tabbar-outer");
const mainEl  = $("main.wrap");
const anchorY = () => Math.max(0, mainEl.offsetTop - tbOuter.offsetHeight);

/* 下滑进入：点击箭头平滑滚到内容区顶格（标签栏吸顶、首屏恰好滚出） */
document.getElementById("scrollHint").addEventListener("click", () => {
  window.scrollTo({ top: anchorY(), behavior: "smooth" });
});

const tabs = [...document.querySelectorAll(".tab")];
function show(name){
  tabs.forEach(t => t.setAttribute("aria-selected", String(t.dataset.panel === name)));
  document.querySelectorAll(".panel").forEach(p => p.classList.toggle("is-on", p.id === "p-"+name));
  /* 各面板高度悬殊（咒语手册约 5000px，活动记录约 500px）。
     若停在旧面板深处切页，新面板撑不到那个滚动位置，浏览器会把
     scrollY 硬夹回去——那一下的突跳就是「翻页发顿」的来源。
     这里主动收回标签栏，且必须用 auto：平滑滚动和同一帧的重排打架，
     反而更卡。只在已经滚过标签栏时才动，还在首屏就别打扰用户。 */
  const y = anchorY();
  if (window.scrollY > y){
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, y);
    root.style.scrollBehavior = prev;
  }
}
tabs.forEach((t,i) => {
  t.addEventListener("click", () => show(t.dataset.panel));
  t.addEventListener("keydown", e => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    n.focus(); show(n.dataset.panel);
  });
});
/* 背景音乐：手印开关 */
CC.BGM.init({
  mode: "sigil",
  toggleId: "coreJoin",
  sigilEl: $(".sigil"),
  gestureKick: true
});
