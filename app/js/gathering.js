/* 纪要页：公开摘要 + 权限正文 + 评论 + 图库 */
const GATHERING_ID = "001";
const PHOTO_DIR = "assets/gatherings/001/";
const PHOTOS = [
  "01.jpg","02.jpg","03.jpg","04.jpg","05.jpg",
  "06.jpg","07.jpg","08.jpg","09.jpg"
];
const photoSrc = i => encodeURI(PHOTO_DIR + PHOTOS[i]);
const $ = CC.$;
const esc = CC.esc;
const t = (k, vars) => (CC.I18N && CC.I18N.t(k, vars)) || k;

function fmtTime(iso) {
  return CC.fmtChinaTime(iso);
}

function renderUserChip(me) {
  const el = $("#userChip");
  if (!me || !me.auth) {
    el.innerHTML = `
      <span class="who">NOTES · ${GATHERING_ID}</span>
      <a href="login.html?next=gathering-001.html">${t("login")}</a>
      <a href="apply.html">${t("apply")}</a>`;
    return;
  }
  const label = me.admin
    ? `${esc(me.user?.name || me.admin.username)}（${t("admin")}）`
    : esc(me.user.name);
  el.innerHTML = `
    <span class="who">${label}</span>
    <button type="button" id="logoutBtn">${t("logout")}</button>`;
  $("#logoutBtn").addEventListener("click", async () => {
    await CC.logout();
    try { await CC.api("/api/admin/logout", { method: "POST", body: "{}" }); } catch (_) {}
    location.reload();
  });
}

function buildToc() {
  $("#tocList").innerHTML = [...document.querySelectorAll("#docBody .sec")].map(s => {
    const h = s.querySelector("h2");
    if (!h) return "";
    const num = h.querySelector("i");
    const label = h.textContent.replace(/^\d+/, "");
    return `<a href="#${s.id}"><i>${num ? num.textContent : ""}</i>${esc(label)}</a>`;
  }).join("");

  const links = [...document.querySelectorAll("#tocList a")];
  const secs = [...document.querySelectorAll("#docBody .sec")];
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
  const grid = document.getElementById("shotGrid");
  if (!grid) return;
  grid.innerHTML = PHOTOS.map((p, i) =>
    `<button class="shot" data-i="${i}" aria-label="${esc(t("g.shot", { n: String(i + 1) }))}">
       <img src="${photoSrc(i)}" loading="lazy" alt="${esc(t("g.shotAlt", { n: String(i + 1) }))}">
     </button>`
  ).join("");

  let cur = 0;
  const lb = $("#lb"), lbImg = $("#lbImg"), lbIdx = $("#lbIdx");
  function open(i) {
    cur = (i + PHOTOS.length) % PHOTOS.length;
    lbImg.src = photoSrc(cur);
    lbIdx.textContent =
      String(cur + 1).padStart(2, "0") + " / " + String(PHOTOS.length).padStart(2, "0");
    lb.classList.add("on");
  }
  document.querySelectorAll(".shot").forEach(b =>
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
    list.innerHTML = `<div class="comment"><div class="body" style="color:var(--ash)">${t("g.commentEmpty")}</div></div>`;
    return;
  }
  list.innerHTML = data.comments.map(c => `
    <article class="comment">
      <div class="meta">${esc(c.authorName)} · ${esc(fmtTime(c.createdAt))}</div>
      <div class="body">${esc(c.body)}</div>
    </article>`).join("");
}

function wireComments() {
  const form = $("#commentForm");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "1";
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const msg = $("#commentMsg");
    msg.className = "form-msg";
    msg.textContent = t("g.sending");
    const body = new FormData(e.target).get("body");
    try {
      await CC.api(`/api/gatherings/${GATHERING_ID}/comments`, {
        method: "POST",
        body: JSON.stringify({ body })
      });
      e.target.reset();
      msg.className = "form-msg ok";
      msg.textContent = t("g.posted");
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
    lockReason: t("g.offline")
  };
}

let cachedGathering = null;
let cachedMe = null;
let gatheringWired = false;

function paintGathering(data, me) {
  renderUserChip(me);
  const view = (CC.I18N && CC.I18N.localizeItem) ? CC.I18N.localizeItem(data) : data;
  $("#gTitle").textContent = view.title;
  $("#gMeta").textContent = `${view.date} · ${view.place} · ${view.mode}`;
  $("#gSummary").textContent = view.summary;

  const digest = $("#publicDigest");
  const topics = view.topics || [];
  if (topics.length) {
    digest.hidden = false;
    $("#digestCount").textContent = String(topics.length).padStart(2, "0");
    $("#topicList").innerHTML = topics.map((tp) => `
      <li class="topic-card">
        <div class="card-top">
          <h3 class="t-title">${esc(tp.title)}</h3>
          <span class="t-no">${esc(tp.no)}</span>
        </div>
        <p class="t-blurb">${esc(tp.blurb || "")}</p>
      </li>`).join("");
  }

  if (!data.unlocked) {
    $("#lockPanel").hidden = false;
    $("#fullPanel").hidden = true;
    $("#lockReason").textContent = (CC.I18N && CC.I18N.isEn())
      ? t("g.lockTitle")
      : (data.lockReason || t("g.lockTitle"));
    return Promise.resolve();
  }
  $("#lockPanel").hidden = true;
  $("#fullPanel").hidden = false;
  if (!gatheringWired) {
    $("#docBody").innerHTML = data.bodyHtml || "";
    buildToc();
    wireLightbox();
    wireComments();
    gatheringWired = true;
  }
  return loadComments().catch((err) => {
    $("#commentList").innerHTML =
      `<div class="comment"><div class="body" style="color:#ff8e8e">${esc(err.message)}</div></div>`;
  });
}

async function main() {
  const me = await CC.authMe().catch(() => ({ auth: false }));
  let data;
  try {
    data = await CC.api(`/api/gatherings/${GATHERING_ID}`);
  } catch (err) {
    data = offlineGathering();
    if (!data) throw err;
  }
  cachedGathering = data;
  cachedMe = me;
  await paintGathering(data, me);
}

CC.BGM.init({
  mode: "button",
  toggleId: "bgmBtn",
  gestureKick: true
});

main().catch(err => {
  $("#gSummary").textContent = t("g.fail") + err.message;
});

window.__ccGatheringPaint = main;
if (!document.documentElement.dataset.ccGatheringLang) {
  document.documentElement.dataset.ccGatheringLang = "1";
  document.addEventListener("cc:lang", () => {
    if (CC.I18N && CC.I18N.applyDom) CC.I18N.applyDom(document);
    if (cachedGathering) paintGathering(cachedGathering, cachedMe);
  });
}
