const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const cookieSession = require("cookie-session");

/* 本地可选：有 .env 就加载；线上用平台环境变量 */
try { require("dotenv").config(); } catch (_) {}

const { formatChinaTime } = require("./time");
const { parseIntent } = require("./intent");
const {
  load, save, uid, hashPass, verifyPass, genPasscode, genHandle, handleOf, DATA_DIR
} = require("./db");
const { limiter, hit, reset } = require("./ratelimit");
const { ensureDemoUser } = require("./seed");
const GATHERINGS = require("./gatherings");

ensureDemoUser();

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || "cyber-casters-dev-secret";
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || "";
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || "";
const PUBLIC_BASE = (process.env.PUBLIC_BASE || `http://localhost:${PORT}`).replace(/\/$/, "");
const ADMIN_ACCOUNTS = [
  {
    username: String(process.env.ADMIN1_USER || "yilin").trim().toLowerCase(),
    password: String(process.env.ADMIN1_PASS || "vo04HMlq1DhP2v")
  },
  {
    username: String(process.env.ADMIN2_USER || "jiawen").trim().toLowerCase(),
    password: String(process.env.ADMIN2_PASS || "ZeYF2Bu9PN7emm")
  },
  {
    username: String(process.env.ADMIN3_USER || "qiren").trim().toLowerCase(),
    password: String(process.env.ADMIN3_PASS || "nPFrJS7G3nbH6t")
  }
].filter((a) => a.username && a.password);
/* 仅在明确要求或生产环境启用 Secure Cookie。
   不要用 PUBLIC_BASE 是否 https 来判断——本地预览时常把 PUBLIC_BASE 写成线上地址，
   会导致 http://localhost 登录成功但浏览器拒收 Cookie，表现为「无法登录」。 */
const COOKIE_SECURE = process.env.COOKIE_SECURE != null
  ? ["1", "true", "yes"].includes(String(process.env.COOKIE_SECURE).toLowerCase())
  : process.env.NODE_ENV === "production";

/* 反代（Render / Railway / Nginx）后面要信任 X-Forwarded-* */
app.set("trust proxy", 1);

app.use(express.json({ limit: "256kb" }));
app.use(
  cookieSession({
    name: "cc_sess",
    keys: [SESSION_SECRET],
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
    httpOnly: true,
    secure: COOKIE_SECURE
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "cybercasters", time: new Date().toISOString() });
});

function publicGathering(g) {
  return {
    id: g.id,
    date: g.date,
    time: g.time || "",
    title: g.title,
    mode: g.mode,
    place: g.place,
    status: g.status || "past",
    summary: g.summary,
    topics: g.topics || [],
    link: g.link || ""
  };
}

function currentUser(req) {
  const id = req.session && req.session.userId;
  if (!id) return null;
  const db = load();
  return db.users.find(u => u.id === id) || null;
}

function requireUser(req, res) {
  const u = currentUser(req);
  if (!u) {
    res.status(401).json({ error: "需要登录", code: "AUTH_REQUIRED" });
    return null;
  }
  return u;
}

function canAccessGathering(user, gatheringId, session) {
  if (session && session.adminUser) return true;
  if (!user || !Array.isArray(user.gatherings) || !user.gatherings.length) return false;
  if (user.gatherings.includes(gatheringId)) return true;
  const g = GATHERINGS.find(x => x.id === gatheringId);
  /* 已发布的往期纪要对现有成员开放，避免账号仍绑着旧期次时正文被锁住。 */
  return !!(g && g.status === "past");
}

function safeEqualStr(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

function findAdmin(username, password) {
  const u = String(username || "").trim().toLowerCase();
  const p = String(password || "");
  if (!u || !p) return null;
  return ADMIN_ACCOUNTS.find((a) => a.username === u && safeEqualStr(a.password, p)) || null;
}

function requireAdmin(req, res) {
  if (!req.session || !req.session.adminUser) {
    res.status(403).json({ error: "请先登录管理账号" });
    return false;
  }
  return true;
}

function safeText(s, max = 500) {
  return String(s || "").trim().slice(0, max);
}

const APPLY_STATUSES = ["pending", "approved", "rejected"];

function applyStatusLabel(s) {
  if (s === "approved") return "已通过";
  if (s === "rejected") return "已驳回";
  return "";
}

/** 管理端展示用：统一字段名，不外泄哈希等敏感信息 */
function adminApplication(row, user) {
  const issued = row.issuedGatherings || [];
  const live = user && Array.isArray(user.gatherings) ? user.gatherings : issued;
  return {
    id: row.id,
    name: row.name,
    handle: handleOf(row),
    contact: row.contact || "",
    intentDates: row.intentDates || "",
    message: row.message || "",
    status: row.status,
    createdAt: row.createdAt,
    approvedAt: row.approvedAt || null,
    rejectedAt: row.rejectedAt || null,
    rejectReason: row.rejectReason || "",
    issuedGatherings: issued,
    userId: user ? user.id : null,
    gatherings: live
  };
}

function findUserByApp(db, appRow) {
  const handle = handleOf(appRow).toLowerCase();
  return db.users.find(u => handleOf(u).toLowerCase() === handle) || null;
}

/* ── 公开：集会列表（仅摘要） ── */
app.get("/api/gatherings", (_req, res) => {
  res.json({ gatherings: GATHERINGS.map(publicGathering) });
});

app.get("/api/gatherings/:id", (req, res) => {
  const g = GATHERINGS.find(x => x.id === req.params.id);
  if (!g) return res.status(404).json({ error: "未找到该期集会" });

  const session = req.session || {};
  const user = currentUser(req);
  const unlocked = canAccessGathering(user, g.id, session);
  const payload = {
    ...publicGathering(g),
    unlocked,
    auth: !!(user || session.adminUser),
    admin: !!session.adminUser,
    user: user
      ? { name: user.name, gatherings: user.gatherings }
      : (session.adminUser
        ? { name: `管理·${session.adminUser}`, gatherings: GATHERINGS.map(x => x.id), isAdmin: true }
        : null)
  };

  if (unlocked) {
    const file = path.join(__dirname, "content", "gatherings", `${g.id}.html`);
    payload.bodyHtml = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "<p>正文暂缺</p>";
  } else {
    payload.bodyHtml = null;
    payload.lockReason = user
      ? "你的账号未绑定本期参会资格，如有疑问请联系组织者。"
      : "完整纪要仅对当期参会成员开放，请先登录。";
  }
  res.json(payload);
});

/* ── 申请入会 / 报意向（不强制微信等身份信息） ── */
const applyLimiter = limiter({
  scope: "apply",
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "提交太频繁了，请稍后再试。若是误操作，可直接联系组织者。"
});

app.post("/api/apply", applyLimiter, (req, res) => {
  /* 蜜罐字段：真人看不到这个输入框，填了基本可判定为机器人 */
  if (safeText(req.body.website, 100)) {
    return res.status(400).json({ error: "提交未通过校验" });
  }

  const name = safeText(req.body.name, 40);
  const contact = safeText(req.body.contact, 80);
  const intentDates = safeText(req.body.intentDates, 200);
  const message = safeText(req.body.message, 800);

  if (!name) {
    return res.status(400).json({ error: "请填写称呼" });
  }
  if (name.length < 2) {
    return res.status(400).json({ error: "称呼太短了，写两个字以上吧" });
  }

  const db = load();
  const sameName = a => a.name === name && a.status === "pending";
  if (db.applications.some(sameName)) {
    return res.status(409).json({ error: "你已有待审核的申请，请耐心等待" });
  }

  const handle = genHandle(db, name);
  const row = {
    id: uid("app_"),
    name,
    handle,
    contact,
    intentDates,
    message,
    status: "pending",
    createdAt: new Date().toISOString(),
    /* 仅用于滥用溯源，不对外返回 */
    meta: {
      ip: req.ip,
      ua: safeText(req.get("user-agent"), 200)
    }
  };
  db.applications.push(row);
  save(db);

  console.log(`[apply] ${name} → ${handle}（待审核，共 ${db.applications.length} 条）`);

  res.json({
    ok: true,
    id: row.id,
    handle,
    message: `报名已提交。你的登录名是「${handle}」，请先记下；审核通过后组织者会私下发通行码，两者搭配即可查阅纪要。`
  });
});

/* ── 登录：登录名 + 通行码 ── */
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILS = 8;

app.post("/api/auth/login", (req, res) => {
  const handle = safeText(req.body.handle || req.body.wechat, 40);
  const passcode = safeText(req.body.passcode, 32);
  if (!handle || !passcode) {
    return res.status(400).json({ error: "请填写登录名与通行码" });
  }

  /* 通行码只有 8 位，必须限制爆破速率 */
  const failKey = `login-fail:${req.ip}`;
  const probe = hit(failKey, { windowMs: LOGIN_WINDOW_MS, max: LOGIN_MAX_FAILS });
  if (!probe.allowed) {
    res.set("Retry-After", String(probe.retryAfterSec));
    return res.status(429).json({
      error: `尝试次数过多，请 ${Math.ceil(probe.retryAfterSec / 60)} 分钟后再试`,
      retryAfterSec: probe.retryAfterSec
    });
  }

  const db = load();
  const user = db.users.find(u => handleOf(u).toLowerCase() === handle.toLowerCase());
  if (!user || !verifyPass(passcode, user.passcodeHash)) {
    return res.status(401).json({ error: "登录名或通行码不正确" });
  }

  reset(failKey);
  req.session.userId = user.id;
  res.json({
    ok: true,
    user: { name: user.name, handle: handleOf(user), gatherings: user.gatherings }
  });
});

app.post("/api/auth/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

app.get("/api/auth/me", (req, res) => {
  const wechatOAuth = !!(WECHAT_APP_ID && WECHAT_APP_SECRET);
  const session = req.session || {};
  const user = currentUser(req);
  if (user) {
    return res.json({
      auth: true,
      admin: session.adminUser ? { username: session.adminUser } : null,
      user: { name: user.name, handle: handleOf(user), gatherings: user.gatherings },
      wechatOAuth
    });
  }
  if (session.adminUser) {
    return res.json({
      auth: true,
      admin: { username: session.adminUser },
      user: {
        name: `管理·${session.adminUser}`,
        handle: session.adminUser,
        gatherings: GATHERINGS.map(g => g.id),
        isAdmin: true
      },
      wechatOAuth
    });
  }
  return res.json({ auth: false, admin: null, user: null, wechatOAuth });
});

/* 微信网页授权（可选增强；未配置时前端不展示入口） */
app.get("/api/auth/wechat", (req, res) => {
  if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
    return res.status(501).json({
      error: "尚未配置微信开放平台",
      tip: "当前请使用「登录名 + 通行码」登录。"
    });
  }
  const redirect = encodeURIComponent(`${PUBLIC_BASE}/api/auth/wechat/callback`);
  const state = crypto.randomBytes(8).toString("hex");
  req.session.wxState = state;
  const url =
    `https://open.weixin.qq.com/connect/qrconnect?appid=${WECHAT_APP_ID}` +
    `&redirect_uri=${redirect}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
  res.redirect(url);
});

app.get("/api/auth/wechat/callback", async (req, res) => {
  try {
    if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
      return res.redirect("/login.html?err=wechat_unconfigured");
    }
    if (!req.query.code || req.query.state !== req.session.wxState) {
      return res.redirect("/login.html?err=wechat_state");
    }
    const tokenUrl =
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APP_ID}` +
      `&secret=${WECHAT_APP_SECRET}&code=${req.query.code}&grant_type=authorization_code`;
    const tokenRes = await fetch(tokenUrl);
    const token = await tokenRes.json();
    if (!token.openid) {
      return res.redirect("/login.html?err=wechat_token");
    }

    const db = load();
    let user = db.users.find(u => u.wechatOpenId === token.openid);
    if (!user) {
      // 未绑定 openid：引导用通行码登录后再绑定
      req.session.pendingOpenId = token.openid;
      return res.redirect("/login.html?bind=1");
    }
    req.session.userId = user.id;
    res.redirect("/gathering-002.html");
  } catch (e) {
    console.error(e);
    res.redirect("/login.html?err=wechat_fail");
  }
});

app.post("/api/auth/bind-wechat", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const openId = req.session.pendingOpenId;
  if (!openId) return res.status(400).json({ error: "没有待绑定的微信会话" });
  const db = load();
  const u = db.users.find(x => x.id === user.id);
  u.wechatOpenId = openId;
  delete req.session.pendingOpenId;
  save(db);
  res.json({ ok: true });
});

/* ── 评论：当期参会者或管理员可读可写 ── */
app.get("/api/gatherings/:id/comments", (req, res) => {
  const session = req.session || {};
  const user = currentUser(req);
  if (!user && !session.adminUser) {
    return res.status(401).json({ error: "需要登录", code: "AUTH_REQUIRED" });
  }
  if (!canAccessGathering(user, req.params.id, session)) {
    return res.status(403).json({ error: "仅当期参会成员可查看留言" });
  }
  const db = load();
  const list = db.comments
    .filter(c => c.gatheringId === req.params.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(c => ({
      id: c.id,
      authorName: c.authorName,
      body: c.body,
      createdAt: c.createdAt
    }));
  res.json({ comments: list });
});

app.post("/api/gatherings/:id/comments", (req, res) => {
  const session = req.session || {};
  const user = currentUser(req);
  if (!user && !session.adminUser) {
    return res.status(401).json({ error: "需要登录", code: "AUTH_REQUIRED" });
  }
  if (!canAccessGathering(user, req.params.id, session)) {
    return res.status(403).json({ error: "仅当期参会成员可留言" });
  }
  const body = safeText(req.body.body, 1000);
  if (!body) return res.status(400).json({ error: "留言不能为空" });

  const db = load();
  const row = {
    id: uid("c_"),
    gatheringId: req.params.id,
    userId: user ? user.id : `admin:${session.adminUser}`,
    authorName: user ? user.name : `管理·${session.adminUser}`,
    body,
    createdAt: new Date().toISOString()
  };
  db.comments.push(row);
  save(db);
  res.json({
    ok: true,
    comment: {
      id: row.id,
      authorName: row.authorName,
      body: row.body,
      createdAt: row.createdAt
    }
  });
});

/* ── 管理员：账号密码登录 + 审批申请 ── */
const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_LOGIN_MAX_FAILS = 8;

app.post("/api/admin/login", (req, res) => {
  const username = safeText(req.body?.username || req.body?.user || req.body?.handle, 40);
  const password = safeText(req.body?.password || req.body?.pass, 64);
  if (!username || !password) {
    return res.status(400).json({ error: "请填写账号与密码" });
  }

  const failKey = `admin-login-fail:${req.ip}`;
  const probe = hit(failKey, { windowMs: ADMIN_LOGIN_WINDOW_MS, max: ADMIN_LOGIN_MAX_FAILS });
  if (!probe.allowed) {
    res.set("Retry-After", String(probe.retryAfterSec));
    return res.status(429).json({
      error: `尝试次数过多，请 ${Math.ceil(probe.retryAfterSec / 60)} 分钟后再试`,
      retryAfterSec: probe.retryAfterSec
    });
  }

  const admin = findAdmin(username, password);
  if (!admin) {
    return res.status(401).json({ error: "账号或密码不正确" });
  }

  reset(failKey);
  req.session.adminUser = admin.username;
  res.json({ ok: true, admin: { username: admin.username } });
});

app.post("/api/admin/logout", (req, res) => {
  if (req.session) delete req.session.adminUser;
  res.json({ ok: true });
});

app.get("/api/admin/me", (req, res) => {
  const username = req.session && req.session.adminUser;
  res.json({ auth: !!username, admin: username ? { username } : null });
});

const adminLimiter = limiter({
  scope: "admin",
  windowMs: 10 * 60 * 1000,
  max: 200
});
app.use("/api/admin", adminLimiter);

app.get("/api/admin/applications", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const db = load();
  const status = safeText(req.query.status, 20);
  const q = safeText(req.query.q, 40).toLowerCase();

  let rows = db.applications.slice().reverse();
  if (APPLY_STATUSES.includes(status)) rows = rows.filter(a => a.status === status);
  if (q) {
    rows = rows.filter(a =>
      `${a.name} ${handleOf(a)} ${a.contact || ""} ${a.intentDates || ""} ${a.message || ""}`
        .toLowerCase().includes(q)
    );
  }

  const counts = { all: db.applications.length };
  for (const s of APPLY_STATUSES) {
    counts[s] = db.applications.filter(a => a.status === s).length;
  }

  res.json({
    applications: rows.map(a => adminApplication(a, findUserByApp(db, a))),
    counts
  });
});

/* 报名表导出：给组织者拉到表格里排期用 */
app.get("/api/admin/applications.csv", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const db = load();
  /* 报名内容是用户输入，导进 Excel 前要挡住 =/+/-/@ 开头的公式注入 */
  const cell = v => {
    let s = String(v == null ? "" : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header = [
    "提交时间", "称呼", "登录名", "联系方式",
    "最近一期", "是否参加", "日期", "时段", "地点", "补充说明", "交流方向",
    "状态", "审批时间", "可见期次"
  ];
  const lines = [header.map(cell).join(",")];
  for (const a of db.applications) {
    const p = parseIntent(a.intentDates);
    lines.push([
      formatChinaTime(a.createdAt),
      a.name,
      handleOf(a),
      a.contact || "",
      p.nextLabel || "",
      p.joinNext || "",
      p.period || "",
      p.slot || "",
      p.area || "",
      p.note || p.legacy || "",
      a.message || "",
      applyStatusLabel(a.status),
      formatChinaTime(a.approvedAt),
      (a.issuedGatherings || []).join(" ")
    ].map(cell).join(","));
  }
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", `attachment; filename="applications-${Date.now()}.csv"`);
  /* BOM：让 Excel 正确识别 UTF-8 中文 */
  res.send("\uFEFF" + lines.join("\r\n"));
});

/** 审批通过 / 重发通行码共用：建号或改码，并合并可见期次 */
function issueAccess(db, appRow, gatherings) {
  const passcode = genPasscode();
  const handle = handleOf(appRow);
  let user = db.users.find(u => handleOf(u).toLowerCase() === handle.toLowerCase());
  if (!user) {
    user = {
      id: uid("u_"),
      name: appRow.name,
      handle,
      passcodeHash: hashPass(passcode),
      gatherings: [],
      wechatOpenId: "",
      createdAt: new Date().toISOString(),
      note: `from application ${appRow.id}`
    };
    db.users.push(user);
  } else {
    user.passcodeHash = hashPass(passcode);
  }
  user.gatherings = [...new Set([...(user.gatherings || []), ...gatherings])];
  user.passcodeIssuedAt = new Date().toISOString();
  return { user, passcode };
}

app.post("/api/admin/applications/:id/approve", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const gatherings = Array.isArray(req.body.gatherings) ? req.body.gatherings.map(String) : [];
  const db = load();
  const appRow = db.applications.find(a => a.id === req.params.id);
  if (!appRow) return res.status(404).json({ error: "申请不存在" });
  if (appRow.status === "approved") {
    return res.status(400).json({ error: "已审批过，如需换码请用「重发通行码」" });
  }

  const { user, passcode } = issueAccess(db, appRow, gatherings);
  appRow.status = "approved";
  appRow.approvedAt = new Date().toISOString();
  appRow.issuedGatherings = user.gatherings;
  save(db);

  // 通行码只在审批响应里返回一次，请组织者私下发给申请人
  res.json({
    ok: true,
    name: user.name,
    handle: handleOf(user),
    passcode,
    gatherings: user.gatherings
  });
});

app.post("/api/admin/applications/:id/reissue", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const db = load();
  const appRow = db.applications.find(a => a.id === req.params.id);
  if (!appRow) return res.status(404).json({ error: "申请不存在" });
  if (appRow.status !== "approved") {
    return res.status(400).json({ error: "只有已通过的申请才能重发通行码" });
  }

  const { user, passcode } = issueAccess(db, appRow, appRow.issuedGatherings || []);
  appRow.issuedGatherings = user.gatherings;
  save(db);
  res.json({ ok: true, name: user.name, handle: handleOf(user), passcode, gatherings: user.gatherings });
});

app.post("/api/admin/applications/:id/permissions", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const gatherings = Array.isArray(req.body.gatherings) ? req.body.gatherings.map(String) : null;
  if (!gatherings) return res.status(400).json({ error: "需要 gatherings 数组" });

  const db = load();
  const appRow = db.applications.find(a => a.id === req.params.id);
  if (!appRow) return res.status(404).json({ error: "申请不存在" });

  let passcode = null;
  let user = findUserByApp(db, appRow);

  if (appRow.status !== "approved") {
    const issued = issueAccess(db, appRow, []);
    user = issued.user;
    passcode = issued.passcode;
    appRow.status = "approved";
    appRow.approvedAt = new Date().toISOString();
    appRow.rejectedAt = null;
    appRow.rejectReason = "";
  } else if (!user) {
    const issued = issueAccess(db, appRow, []);
    user = issued.user;
    passcode = issued.passcode;
  }

  user.gatherings = [...new Set(gatherings)];
  appRow.issuedGatherings = user.gatherings;
  save(db);

  res.json({
    ok: true,
    name: user.name,
    handle: handleOf(user),
    passcode,
    gatherings: user.gatherings
  });
});

app.post("/api/admin/applications/:id/reject", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const db = load();
  const appRow = db.applications.find(a => a.id === req.params.id);
  if (!appRow) return res.status(404).json({ error: "申请不存在" });
  if (appRow.status === "approved") {
    return res.status(400).json({ error: "已通过的申请不能直接驳回" });
  }
  appRow.status = "rejected";
  appRow.rejectedAt = new Date().toISOString();
  appRow.rejectReason = safeText(req.body.reason, 200);
  save(db);
  res.json({ ok: true, application: adminApplication(appRow) });
});

app.get("/api/admin/users", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const db = load();
  res.json({
    users: db.users.map(u => ({
      id: u.id,
      name: u.name,
      handle: handleOf(u),
      gatherings: u.gatherings || [],
      createdAt: u.createdAt,
      passcodeIssuedAt: u.passcodeIssuedAt || null
    }))
  });
});

app.post("/api/admin/users/:id/gatherings", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const gatherings = Array.isArray(req.body.gatherings) ? req.body.gatherings.map(String) : null;
  if (!gatherings) return res.status(400).json({ error: "需要 gatherings 数组" });
  const db = load();
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "用户不存在" });
  user.gatherings = gatherings;
  save(db);
  res.json({ ok: true, user: { id: user.id, handle: handleOf(user), gatherings: user.gatherings } });
});

/* 静态前端 */
const appDir = path.join(__dirname, "..", "app");
app.use(express.static(appDir));

app.get("/", (_req, res) => res.sendFile(path.join(appDir, "index.html")));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "服务器错误" });
});

app.listen(PORT, "0.0.0.0", () => {
  const host = PUBLIC_BASE || `http://localhost:${PORT}`;
  console.log(`CYBER CASTERS  →  ${host}`);
  console.log(`数据目录       →  ${DATA_DIR}`);
  if (SESSION_SECRET === "cyber-casters-dev-secret") {
    console.warn("⚠ 仍在使用默认 SESSION_SECRET，上线前请务必修改。");
  }
  console.log("管理账号       →  " + ADMIN_ACCOUNTS.map((a) => a.username).join(" / "));
  const db = load();
  if (db._seedInfo) {
    console.log(`演示登录       →  登录名 ${db._seedInfo.handle} / 通行码 ${db._seedInfo.passcode}`);
  }
});
