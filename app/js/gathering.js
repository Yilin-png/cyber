/* 纪要页：公开摘要 + 权限正文 + 评论 + 图库 */
function pageGatheringId() {
  /* SPA 只换 #cc-view 槽，不换 <html>。必须先读当前 URL，
     否则从 002 切到 001（或反过来）仍会沿用首屏的 data-gathering-id。 */
  const name = (location.pathname.replace(/\/+$/, "").split("/").pop() || "");
  const fromPath = name.match(/gathering-(\d+)/i);
  if (fromPath) return fromPath[1];
  const fromAttr = document.documentElement.dataset.gatheringId;
  if (fromAttr) return String(fromAttr);
  return "001";
}
const GATHERING_ID = pageGatheringId();
const GATHERING_PAGE = `gathering-${GATHERING_ID}.html`;
document.documentElement.dataset.gatheringId = GATHERING_ID;
const PHOTO_DIR = `assets/gatherings/${GATHERING_ID}/`;
const DEFAULT_PHOTOS = {
  "001": [
    "01.jpg","02.jpg","03.jpg","04.jpg","05.jpg",
    "06.jpg","07.jpg","08.jpg","09.jpg"
  ]
};
const PHOTOS = Array.isArray(window.CC_GATHERING_PHOTOS)
  ? window.CC_GATHERING_PHOTOS
  : (DEFAULT_PHOTOS[GATHERING_ID] || []);
const photoSrc = i => encodeURI(PHOTO_DIR + PHOTOS[i]);
const esc = CC.esc;

function pageRoot() {
  const slot = document.querySelector(`#cc-view > [data-cc-slot="${GATHERING_PAGE}"]`);
  if (slot) return slot;
  return document.getElementById("cc-view") || document;
}

/* 两期槽位都在 DOM 里时，id 会重复。查询必须限定当前期，不能走 document.querySelector。 */
function $(sel) {
  return pageRoot().querySelector(sel);
}

function fmtTime(iso) {
  return CC.fmtChinaTime(iso);
}

function renderUserChip(me) {
  const el = $("#userChip");
  if (!me || !me.auth) {
    el.innerHTML = `
      <span class="who">NOTES · ${GATHERING_ID}</span>
      <a href="login.html?next=${GATHERING_PAGE}">登录</a>
      <a href="apply.html">申请</a>`;
    return;
  }
  const label = me.admin
    ? `${esc(me.user?.name || me.admin.username)}（管理）`
    : esc(me.user.name);
  el.innerHTML = `
    <span class="who">${label}</span>
    <button type="button" id="logoutBtn">退出</button>`;
  $("#logoutBtn").addEventListener("click", async () => {
    await CC.logout();
    try { await CC.api("/api/admin/logout", { method: "POST", body: "{}" }); } catch (_) {}
    location.reload();
  });
}

function buildToc() {
  const docBody = $("#docBody");
  const tocList = $("#tocList");
  if (!docBody || !tocList) return;
  tocList.innerHTML = [...docBody.querySelectorAll(".sec")].map(s => {
    const h = s.querySelector("h2");
    if (!h) return "";
    const num = h.querySelector("i");
    const label = h.textContent.replace(/^\d+/, "");
    return `<a href="#${s.id}"><i>${num ? num.textContent : ""}</i>${esc(label)}</a>`;
  }).join("");

  const links = [...tocList.querySelectorAll("a")];
  const secs = [...docBody.querySelectorAll(".sec")];
  if (!secs.length) return;
  const io = new IntersectionObserver(es => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      const i = secs.indexOf(e.target);
      links.forEach((a, j) => a.classList.toggle("on", j === i));
    });
  }, { rootMargin: "-70px 0px -65% 0px" });
  secs.forEach(s => io.observe(s));
}

function wireLightbox() {
  const grid = $("#shotGrid");
  if (!grid) return;
  grid.innerHTML = PHOTOS.map((p, i) =>
    `<button class="shot" data-i="${i}" aria-label="放大第 ${i + 1} 张">
       <img src="${photoSrc(i)}" loading="lazy" alt="第 ${GATHERING_ID} 期现场 ${i + 1}">
     </button>`
  ).join("");

  let cur = 0;
  const lb = $("#lb"), lbImg = $("#lbImg"), lbIdx = $("#lbIdx");
  if (!lb || !lbImg || !lbIdx) return;
  function open(i) {
    cur = (i + PHOTOS.length) % PHOTOS.length;
    lbImg.src = photoSrc(cur);
    lbIdx.textContent =
      String(cur + 1).padStart(2, "0") + " / " + String(PHOTOS.length).padStart(2, "0");
    lb.classList.add("on");
  }
  grid.querySelectorAll(".shot").forEach(b =>
    b.addEventListener("click", () => open(+b.dataset.i))
  );
  $("#lbX").addEventListener("click", () => lb.classList.remove("on"));
  $("#lbP").addEventListener("click", e => { e.stopPropagation(); open(cur - 1); });
  $("#lbN").addEventListener("click", e => { e.stopPropagation(); open(cur + 1); });
  lb.addEventListener("click", e => { if (e.target === lb) lb.classList.remove("on"); });
  document.addEventListener("keydown", e => {
    if (!lb.classList.contains("on")) return;
    if (e.key === "Escape") lb.classList.remove("on");
    if (e.key === "ArrowLeft") open(cur - 1);
    if (e.key === "ArrowRight") open(cur + 1);
  });
}

async function loadComments() {
  const data = await CC.api(`/api/gatherings/${GATHERING_ID}/comments`);
  const list = $("#commentList");
  if (!data.comments.length) {
    list.innerHTML = `<div class="comment"><div class="body" style="color:var(--ash)">还没有留言，来写第一条吧。</div></div>`;
    return;
  }
  list.innerHTML = data.comments.map(c => `
    <article class="comment">
      <div class="meta">${esc(c.authorName)} · ${esc(fmtTime(c.createdAt))}</div>
      <div class="body">${esc(c.body)}</div>
    </article>`).join("");
}

function wireComments() {
  $("#commentForm").addEventListener("submit", async e => {
    e.preventDefault();
    const msg = $("#commentMsg");
    msg.className = "form-msg";
    msg.textContent = "发送中…";
    const body = new FormData(e.target).get("body");
    try {
      await CC.api(`/api/gatherings/${GATHERING_ID}/comments`, {
        method: "POST",
        body: JSON.stringify({ body })
      });
      e.target.reset();
      msg.className = "form-msg ok";
      msg.textContent = "已发布";
      await loadComments();
    } catch (err) {
      msg.className = "form-msg err";
      msg.textContent = err.message;
    }
  });
}

/* 没有后端时（file:// 或第三方静态服务器）退回本地公开数据 */
function offlineGathering() {
  const fb = (window.CC_GATHERINGS || []).find(g => g.id === GATHERING_ID);
  if (!fb) return null;
  return {
    ...fb,
    unlocked: false,
    auth: false,
    bodyHtml: null,
    lockReason: "当前为静态预览，未连上站点服务。完整纪要请通过站点（npm start 后访问 localhost:3000）登录查看。"
  };
}

async function main() {
  const me = await CC.authMe().catch(() => ({ auth: false }));
  renderUserChip(me);

  let data;
  try {
    data = await CC.api(`/api/gatherings/${GATHERING_ID}`);
  } catch (err) {
    data = offlineGathering();
    if (!data) throw err;
  }
  $("#gTitle").textContent = data.title;
  $("#gMeta").textContent = `${data.date} · ${data.place} · ${data.mode}`;
  $("#gSummary").textContent = data.summary;

  /* 公开纪要：要点卡片网格，桌面端多列 */ /* digest-cards-v2 */
  const digest = $("#publicDigest");
  const topics = data.topics || [];
  if (topics.length) {
    digest.hidden = false;
    $("#digestCount").textContent = String(topics.length).padStart(2, "0");
    $("#topicList").innerHTML = topics.map(t => `
      <li class="topic-card">
        <div class="card-top">
          <h3 class="t-title">${esc(t.title)}</h3>
          <span class="t-no">${esc(t.no)}</span>
        </div>
        <p class="t-blurb">${esc(t.blurb || "")}</p>
      </li>`).join("");
  }

  if (!data.unlocked) {
    $("#lockPanel").hidden = false;
    $("#fullPanel").hidden = true;
    $("#lockReason").textContent = data.lockReason || "完整纪要仅对当期参会成员开放。";
  } else {
    $("#lockPanel").hidden = true;
    $("#fullPanel").hidden = false;
    $("#docBody").innerHTML = data.bodyHtml || "";
    buildToc();
    wireLightbox();
    wireComments();
    const hash = (location.hash || "").replace(/^#/, "");
    if (hash) {
      const anchor = pageRoot().querySelector("#" + (window.CSS && CSS.escape ? CSS.escape(hash) : hash));
      if (anchor) requestAnimationFrame(() => anchor.scrollIntoView({ block: "start" }));
    }
    await loadComments().catch(err => {
      $("#commentList").innerHTML =
        `<div class="comment"><div class="body" style="color:#ff8e8e">${esc(err.message)}</div></div>`;
    });
  }
}

CC.BGM.init({
  mode: "button",
  toggleId: "bgmBtn",
  gestureKick: true
});

main().catch(err => {
  $("#gSummary").textContent = "加载失败：" + err.message;
});
