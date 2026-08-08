/**
 * Cloudflare Worker：赛博法师 API
 * 静态页由 Workers Assets 托管（app/）；本 Worker 处理 /api/*
 */
import { Hono } from "hono";
import { randomBytes } from "node:crypto";
import { CyberStore, getStore } from "./store.js";
import {
  uid,
  hashPass,
  verifyPass,
  genPasscode,
  genHandle,
  handleOf
} from "./crypto-util.js";
import { limiter, hit, reset } from "./ratelimit.js";
import {
  readSession,
  sessionCookie,
  clearSessionCookie,
  cookieSecure
} from "./session.js";
import { GATHERINGS, gatheringBodyHtml } from "./gatherings.js";
import { formatChinaTime } from "./time.js";
import { parseIntent } from "./intent.js";

export { CyberStore };

const DEMO_HANDLE = "demo_caster";
const DEMO_PASS = "CAST-DEMO";

function safeText(s, max = 500) {
  return String(s || "").trim().slice(0, max);
}

function publicGathering(g) {
  return {
    id: g.id,
    date: g.date,
    title: g.title,
    mode: g.mode,
    place: g.place,
    summary: g.summary,
    topics: g.topics || [],
    link: g.link
  };
}

function adminApplication(row) {
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
    issuedGatherings: row.issuedGatherings || []
  };
}

function canAccessGathering(user, gatheringId) {
  return !!(user && Array.isArray(user.gatherings) && user.gatherings.includes(gatheringId));
}

function secrets(env) {
  return {
    adminToken: env.ADMIN_TOKEN || "cc-admin-change-me",
    sessionSecret: env.SESSION_SECRET || "cyber-casters-dev-secret",
    wechatAppId: env.WECHAT_APP_ID || "",
    wechatAppSecret: env.WECHAT_APP_SECRET || "",
    publicBase: (env.PUBLIC_BASE || "").replace(/\/$/, ""),
    disableDemo: ["1", "true", "yes"].includes(String(env.DISABLE_DEMO || "").toLowerCase())
  };
}

/** DO RPC 不能传函数：在 Worker 侧 load → 修改 → save */
async function mutate(store, fn) {
  const db = await store.load();
  const out = await fn(db);
  await store.save(db);
  return out;
}

async function ensureDemoUser(store, env) {
  const { disableDemo } = secrets(env);
  if (disableDemo) return;

  const existing = await store.load();
  const user = existing.users.find((u) => handleOf(u).toLowerCase() === DEMO_HANDLE);
  /* 持久化 DO：已有演示号就跳过，避免每次请求重跑 scrypt */
  if (user && existing._seedInfo?.handle === DEMO_HANDLE) return;

  await mutate(store, (db) => {
    let u = db.users.find((x) => handleOf(x).toLowerCase() === DEMO_HANDLE);
    if (!u) {
      u = {
        id: uid("u_"),
        name: "演示参会者",
        handle: DEMO_HANDLE,
        passcodeHash: hashPass(DEMO_PASS),
        gatherings: ["001"],
        wechatOpenId: "",
        createdAt: new Date().toISOString(),
        note: "seed demo account"
      };
      db.users.push(u);
    } else {
      u.passcodeHash = hashPass(DEMO_PASS);
      const set = new Set([...(u.gatherings || []), "001"]);
      u.gatherings = [...set];
      u.name = u.name || "演示参会者";
    }
    db._seedInfo = {
      handle: DEMO_HANDLE,
      passcode: DEMO_PASS,
      tip: "登录页可用 登录名 demo_caster + 通行码 CAST-DEMO 试用"
    };
  });
}

function issueAccess(db, appRow, gatherings) {
  const passcode = genPasscode();
  const handle = handleOf(appRow);
  let user = db.users.find((u) => handleOf(u).toLowerCase() === handle.toLowerCase());
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

const app = new Hono();

app.use("*", async (c, next) => {
  const store = getStore(c.env);
  await ensureDemoUser(store, c.env);
  c.set("store", store);
  c.set("secrets", secrets(c.env));
  const sess = readSession(c.req.header("cookie"), secrets(c.env).sessionSecret);
  c.set("session", sess);
  c.set("sessionDirty", false);
  await next();
  if (c.get("sessionDirty")) {
    const secure = cookieSecure(c.env, new URL(c.req.url));
    const body = c.get("session");
    if (!body || Object.keys(body).length === 0) {
      c.header("Set-Cookie", clearSessionCookie({ secure }), { append: true });
    } else {
      c.header(
        "Set-Cookie",
        sessionCookie(body, secrets(c.env).sessionSecret, { secure }),
        { append: true }
      );
    }
  }
});

function setSession(c, next) {
  c.set("session", next || {});
  c.set("sessionDirty", true);
}

function clientIp(c) {
  return c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown";
}

async function currentUser(c) {
  const id = c.get("session")?.userId;
  if (!id) return null;
  const db = await c.get("store").load();
  return db.users.find((u) => u.id === id) || null;
}

function requireAdmin(c) {
  const token = c.req.header("x-admin-token") || "";
  if (token !== c.get("secrets").adminToken) {
    return false;
  }
  return true;
}

app.get("/api/health", (c) =>
  c.json({ ok: true, service: "cybercasters", runtime: "cloudflare-workers", time: new Date().toISOString() })
);

app.get("/api/gatherings", (c) => c.json({ gatherings: GATHERINGS.map(publicGathering) }));

app.get("/api/gatherings/:id", async (c) => {
  const g = GATHERINGS.find((x) => x.id === c.req.param("id"));
  if (!g) return c.json({ error: "未找到该期集会" }, 404);

  const user = await currentUser(c);
  const unlocked = canAccessGathering(user, g.id);
  const payload = {
    ...publicGathering(g),
    unlocked,
    auth: !!user,
    user: user ? { name: user.name, gatherings: user.gatherings } : null
  };

  if (unlocked) {
    payload.bodyHtml = gatheringBodyHtml(g.id) || "<p>正文暂缺</p>";
  } else {
    payload.bodyHtml = null;
    payload.lockReason = user
      ? "你的账号未绑定本期参会资格，如有疑问请联系组织者。"
      : "完整纪要仅对当期参会成员开放，请先登录。";
  }
  return c.json(payload);
});

const applyLimiter = limiter({
  scope: "apply",
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "提交太频繁了，请稍后再试。若是误操作，可直接联系组织者。"
});

app.post("/api/apply", applyLimiter, async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "无效请求" }, 400);
  }

  if (safeText(body.website, 100)) {
    return c.json({ error: "提交未通过校验" }, 400);
  }

  const name = safeText(body.name, 40);
  const contact = safeText(body.contact, 80);
  const intentDates = safeText(body.intentDates, 200);
  const message = safeText(body.message, 800);

  if (!name || !intentDates) {
    return c.json({ error: "请填写称呼与意向参与时间" }, 400);
  }
  if (name.length < 2) {
    return c.json({ error: "称呼太短了，写两个字以上吧" }, 400);
  }

  let handle;
  let rowId;
  try {
    await mutate(c.get("store"), (db) => {
      const sameName = (a) => a.name === name && a.status === "pending";
      if (db.applications.some(sameName)) {
        const err = new Error("DUP");
        err.code = "DUP";
        throw err;
      }
      handle = genHandle(db, name);
      const row = {
        id: uid("app_"),
        name,
        handle,
        contact,
        intentDates,
        message,
        status: "pending",
        createdAt: new Date().toISOString(),
        meta: {
          ip: clientIp(c),
          ua: safeText(c.req.header("user-agent"), 200)
        }
      };
      rowId = row.id;
      db.applications.push(row);
    });
  } catch (e) {
    if (e && e.code === "DUP") {
      return c.json({ error: "你已有待审核的申请，请耐心等待" }, 409);
    }
    throw e;
  }

  return c.json({
    ok: true,
    id: rowId,
    handle,
    message: `报名已提交。你的登录名是「${handle}」，请先记下；审核通过后组织者会私下发通行码，两者搭配即可查阅纪要。`
  });
});

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILS = 8;

app.post("/api/auth/login", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "无效请求" }, 400);
  }
  const handle = safeText(body.handle || body.wechat, 40);
  const passcode = safeText(body.passcode, 32);
  if (!handle || !passcode) {
    return c.json({ error: "请填写登录名与通行码" }, 400);
  }

  const failKey = `login-fail:${clientIp(c)}`;
  const probe = hit(failKey, { windowMs: LOGIN_WINDOW_MS, max: LOGIN_MAX_FAILS });
  if (!probe.allowed) {
    c.header("Retry-After", String(probe.retryAfterSec));
    return c.json(
      {
        error: `尝试次数过多，请 ${Math.ceil(probe.retryAfterSec / 60)} 分钟后再试`,
        retryAfterSec: probe.retryAfterSec
      },
      429
    );
  }

  const db = await c.get("store").load();
  const user = db.users.find((u) => handleOf(u).toLowerCase() === handle.toLowerCase());
  if (!user || !verifyPass(passcode, user.passcodeHash)) {
    return c.json({ error: "登录名或通行码不正确" }, 401);
  }

  reset(failKey);
  setSession(c, { ...c.get("session"), userId: user.id });
  return c.json({
    ok: true,
    user: { name: user.name, handle: handleOf(user), gatherings: user.gatherings }
  });
});

app.post("/api/auth/logout", (c) => {
  setSession(c, {});
  return c.json({ ok: true });
});

app.get("/api/auth/me", async (c) => {
  const { wechatAppId, wechatAppSecret } = c.get("secrets");
  const user = await currentUser(c);
  if (!user) {
    return c.json({ auth: false, user: null, wechatOAuth: !!(wechatAppId && wechatAppSecret) });
  }
  return c.json({
    auth: true,
    user: { name: user.name, handle: handleOf(user), gatherings: user.gatherings },
    wechatOAuth: !!(wechatAppId && wechatAppSecret)
  });
});

app.get("/api/auth/wechat", (c) => {
  const { wechatAppId, wechatAppSecret, publicBase } = c.get("secrets");
  if (!wechatAppId || !wechatAppSecret) {
    return c.json(
      {
        error: "尚未配置微信开放平台",
        tip: "当前请使用「登录名 + 通行码」登录。"
      },
      501
    );
  }
  const base = publicBase || new URL(c.req.url).origin;
  const redirect = encodeURIComponent(`${base}/api/auth/wechat/callback`);
  const state = randomBytes(8).toString("hex");
  setSession(c, { ...c.get("session"), wxState: state });
  const url =
    `https://open.weixin.qq.com/connect/qrconnect?appid=${wechatAppId}` +
    `&redirect_uri=${redirect}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
  return c.redirect(url);
});

app.get("/api/auth/wechat/callback", async (c) => {
  try {
    const { wechatAppId, wechatAppSecret } = c.get("secrets");
    if (!wechatAppId || !wechatAppSecret) {
      return c.redirect("/login.html?err=wechat_unconfigured");
    }
    const code = c.req.query("code");
    const state = c.req.query("state");
    if (!code || state !== c.get("session")?.wxState) {
      return c.redirect("/login.html?err=wechat_state");
    }
    const tokenUrl =
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${wechatAppId}` +
      `&secret=${wechatAppSecret}&code=${code}&grant_type=authorization_code`;
    const tokenRes = await fetch(tokenUrl);
    const token = await tokenRes.json();
    if (!token.openid) {
      return c.redirect("/login.html?err=wechat_token");
    }

    const db = await c.get("store").load();
    const user = db.users.find((u) => u.wechatOpenId === token.openid);
    if (!user) {
      setSession(c, { ...c.get("session"), pendingOpenId: token.openid, wxState: undefined });
      return c.redirect("/login.html?bind=1");
    }
    setSession(c, { userId: user.id });
    return c.redirect("/gathering-001.html");
  } catch (e) {
    console.error(e);
    return c.redirect("/login.html?err=wechat_fail");
  }
});

app.post("/api/auth/bind-wechat", async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: "需要登录", code: "AUTH_REQUIRED" }, 401);
  const openId = c.get("session")?.pendingOpenId;
  if (!openId) return c.json({ error: "没有待绑定的微信会话" }, 400);

  await mutate(c.get("store"), (db) => {
    const u = db.users.find((x) => x.id === user.id);
    if (u) u.wechatOpenId = openId;
  });
  const sess = { ...c.get("session") };
  delete sess.pendingOpenId;
  setSession(c, sess);
  return c.json({ ok: true });
});

app.get("/api/gatherings/:id/comments", async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: "需要登录", code: "AUTH_REQUIRED" }, 401);
  if (!canAccessGathering(user, c.req.param("id"))) {
    return c.json({ error: "仅当期参会成员可查看留言" }, 403);
  }
  const db = await c.get("store").load();
  const list = db.comments
    .filter((x) => x.gatheringId === c.req.param("id"))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((x) => ({
      id: x.id,
      authorName: x.authorName,
      body: x.body,
      createdAt: x.createdAt
    }));
  return c.json({ comments: list });
});

app.post("/api/gatherings/:id/comments", async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: "需要登录", code: "AUTH_REQUIRED" }, 401);
  if (!canAccessGathering(user, c.req.param("id"))) {
    return c.json({ error: "仅当期参会成员可留言" }, 403);
  }
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "无效请求" }, 400);
  }
  const text = safeText(body.body, 1000);
  if (!text) return c.json({ error: "留言不能为空" }, 400);

  let comment;
  await mutate(c.get("store"), (db) => {
    const row = {
      id: uid("c_"),
      gatheringId: c.req.param("id"),
      userId: user.id,
      authorName: user.name,
      body: text,
      createdAt: new Date().toISOString()
    };
    db.comments.push(row);
    comment = {
      id: row.id,
      authorName: row.authorName,
      body: row.body,
      createdAt: row.createdAt
    };
  });
  return c.json({ ok: true, comment });
});

const APPLY_STATUSES = ["pending", "approved", "rejected"];
const adminLimiter = limiter({ scope: "admin", windowMs: 10 * 60 * 1000, max: 200 });
app.use("/api/admin/*", adminLimiter);

app.get("/api/admin/applications", async (c) => {
  if (!requireAdmin(c)) return c.json({ error: "管理员令牌无效" }, 403);
  const db = await c.get("store").load();
  const status = safeText(c.req.query("status"), 20);
  const q = safeText(c.req.query("q"), 40).toLowerCase();

  let rows = db.applications.slice().reverse();
  if (APPLY_STATUSES.includes(status)) rows = rows.filter((a) => a.status === status);
  if (q) {
    rows = rows.filter((a) =>
      `${a.name} ${handleOf(a)} ${a.contact || ""} ${a.intentDates || ""} ${a.message || ""}`
        .toLowerCase()
        .includes(q)
    );
  }

  const counts = { all: db.applications.length };
  for (const s of APPLY_STATUSES) {
    counts[s] = db.applications.filter((a) => a.status === s).length;
  }

  return c.json({ applications: rows.map(adminApplication), counts });
});

app.get("/api/admin/applications.csv", async (c) => {
  if (!requireAdmin(c)) return c.json({ error: "管理员令牌无效" }, 403);
  const db = await c.get("store").load();
  const cell = (v) => {
    let s = String(v == null ? "" : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header = [
    "提交时间", "称呼", "登录名", "联系方式",
    "最近一期", "是否参加", "日期区间", "时段", "片区", "补充说明", "交流方向",
    "状态", "审批时间", "可见期次"
  ];
  const lines = [header.map(cell).join(",")];
  for (const a of db.applications) {
    const p = parseIntent(a.intentDates);
    lines.push(
      [
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
        a.status,
        formatChinaTime(a.approvedAt),
        (a.issuedGatherings || []).join(" ")
      ]
        .map(cell)
        .join(",")
    );
  }
  return new Response("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="applications-${Date.now()}.csv"`
    }
  });
});

app.post("/api/admin/applications/:id/approve", async (c) => {
  if (!requireAdmin(c)) return c.json({ error: "管理员令牌无效" }, 403);
  let body = {};
  try {
    body = await c.req.json();
  } catch {
    /* empty body ok */
  }
  const gatherings = Array.isArray(body.gatherings) ? body.gatherings.map(String) : [];

  let result;
  try {
    await mutate(c.get("store"), (db) => {
      const appRow = db.applications.find((a) => a.id === c.req.param("id"));
      if (!appRow) {
        const err = new Error("NF");
        err.code = "NF";
        throw err;
      }
      if (appRow.status === "approved") {
        const err = new Error("DONE");
        err.code = "DONE";
        throw err;
      }
      const { user, passcode } = issueAccess(db, appRow, gatherings);
      appRow.status = "approved";
      appRow.approvedAt = new Date().toISOString();
      appRow.issuedGatherings = user.gatherings;
      result = {
        ok: true,
        name: user.name,
        handle: handleOf(user),
        passcode,
        gatherings: user.gatherings
      };
    });
  } catch (e) {
    if (e.code === "NF") return c.json({ error: "申请不存在" }, 404);
    if (e.code === "DONE") return c.json({ error: "已审批过，如需换码请用「重发通行码」" }, 400);
    throw e;
  }
  return c.json(result);
});

app.post("/api/admin/applications/:id/reissue", async (c) => {
  if (!requireAdmin(c)) return c.json({ error: "管理员令牌无效" }, 403);
  let result;
  try {
    await mutate(c.get("store"), (db) => {
      const appRow = db.applications.find((a) => a.id === c.req.param("id"));
      if (!appRow) {
        const err = new Error("NF");
        err.code = "NF";
        throw err;
      }
      if (appRow.status !== "approved") {
        const err = new Error("BAD");
        err.code = "BAD";
        throw err;
      }
      const { user, passcode } = issueAccess(db, appRow, appRow.issuedGatherings || []);
      appRow.issuedGatherings = user.gatherings;
      result = {
        ok: true,
        name: user.name,
        handle: handleOf(user),
        passcode,
        gatherings: user.gatherings
      };
    });
  } catch (e) {
    if (e.code === "NF") return c.json({ error: "申请不存在" }, 404);
    if (e.code === "BAD") return c.json({ error: "只有已通过的申请才能重发通行码" }, 400);
    throw e;
  }
  return c.json(result);
});

app.post("/api/admin/applications/:id/reject", async (c) => {
  if (!requireAdmin(c)) return c.json({ error: "管理员令牌无效" }, 403);
  let body = {};
  try {
    body = await c.req.json();
  } catch {
    /* ok */
  }
  let application;
  try {
    await mutate(c.get("store"), (db) => {
      const appRow = db.applications.find((a) => a.id === c.req.param("id"));
      if (!appRow) {
        const err = new Error("NF");
        err.code = "NF";
        throw err;
      }
      if (appRow.status === "approved") {
        const err = new Error("BAD");
        err.code = "BAD";
        throw err;
      }
      appRow.status = "rejected";
      appRow.rejectedAt = new Date().toISOString();
      appRow.rejectReason = safeText(body.reason, 200);
      application = adminApplication(appRow);
    });
  } catch (e) {
    if (e.code === "NF") return c.json({ error: "申请不存在" }, 404);
    if (e.code === "BAD") return c.json({ error: "已通过的申请不能直接驳回" }, 400);
    throw e;
  }
  return c.json({ ok: true, application });
});

app.get("/api/admin/users", async (c) => {
  if (!requireAdmin(c)) return c.json({ error: "管理员令牌无效" }, 403);
  const db = await c.get("store").load();
  return c.json({
    users: db.users.map((u) => ({
      id: u.id,
      name: u.name,
      handle: handleOf(u),
      gatherings: u.gatherings || [],
      createdAt: u.createdAt,
      passcodeIssuedAt: u.passcodeIssuedAt || null
    }))
  });
});

app.post("/api/admin/users/:id/gatherings", async (c) => {
  if (!requireAdmin(c)) return c.json({ error: "管理员令牌无效" }, 403);
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "无效请求" }, 400);
  }
  const gatherings = Array.isArray(body.gatherings) ? body.gatherings.map(String) : null;
  if (!gatherings) return c.json({ error: "需要 gatherings 数组" }, 400);

  let userOut;
  try {
    await mutate(c.get("store"), (db) => {
      const user = db.users.find((u) => u.id === c.req.param("id"));
      if (!user) {
        const err = new Error("NF");
        err.code = "NF";
        throw err;
      }
      user.gatherings = gatherings;
      userOut = { id: user.id, handle: handleOf(user), gatherings: user.gatherings };
    });
  } catch (e) {
    if (e.code === "NF") return c.json({ error: "用户不存在" }, 404);
    throw e;
  }
  return c.json({ ok: true, user: userOut });
});

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "未找到接口" }, 404);
  }
  /* 非 API：交给 Assets（若绑定存在） */
  if (c.env.ASSETS) return c.env.ASSETS.fetch(c.req.raw);
  return c.text("Not Found", 404);
});

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "服务器错误" }, 500);
});

export default {
  fetch: app.fetch
};
