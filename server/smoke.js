/* 烟雾联调脚本：node server/smoke.js [baseUrl] */
const BASE = process.argv[2] || "http://localhost:3100";
const ADMIN_USER = process.env.ADMIN1_USER || "yilin";
const ADMIN_PASS = process.env.ADMIN1_PASS || "vo04HMlq1DhP2v";

async function call(method, path, body, headers = {}, jar) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual"
  });
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  if (jar && setCookie.length) {
    for (const c of setCookie) {
      const [pair] = c.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text.slice(0, 200); }
  return { status: res.status, data };
}

function cookieHeader(jar) {
  if (!jar || !jar.size) return {};
  return { Cookie: [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ") };
}

function check(label, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`);
  if (!ok) process.exitCode = 1;
}

(async () => {
  const stamp = Date.now().toString().slice(-5);
  const jar = new Map();

  const cnName = await call("POST", "/api/apply", {
    name: "张三" + stamp, intentDates: "8月20日晚上", contact: "zs@example.com"
  });
  check("中文称呼生成 ASCII 登录名", /^caster-[a-z0-9]{5}$/.test(cnName.data.handle || ""), cnName.data.handle);

  const enName = await call("POST", "/api/apply", {
    name: "Alice " + stamp, intentDates: "线上都行"
  });
  check("拉丁称呼走 slug", /^alice-?\d*$/.test(enName.data.handle || ""), enName.data.handle);

  const dup = await call("POST", "/api/apply", { name: "张三" + stamp, intentDates: "再来一次" });
  check("同名待审去重 409", dup.status === 409, String(dup.status));

  const bot = await call("POST", "/api/apply", {
    name: "Bot", intentDates: "x", website: "http://spam.example"
  });
  check("蜜罐字段拦截", bot.status === 400, String(bot.status));

  const noAuth = await call("GET", "/api/admin/applications");
  check("管理接口需登录", noAuth.status === 403, String(noAuth.status));

  const adminLogin = await call("POST", "/api/admin/login",
    { username: ADMIN_USER, password: ADMIN_PASS }, {}, jar);
  check("管理员可登录", adminLogin.status === 200 && adminLogin.data.ok,
    adminLogin.data.admin && adminLogin.data.admin.username);

  const list = await call("GET", "/api/admin/applications?status=pending", undefined, cookieHeader(jar), jar);
  check("待审列表可读", list.status === 200 && Array.isArray(list.data.applications),
    `pending=${list.data.counts && list.data.counts.pending}`);

  const search = await call("GET", `/api/admin/applications?q=${encodeURIComponent(cnName.data.handle)}`,
    undefined, cookieHeader(jar), jar);
  check("按登录名搜索", search.data.applications && search.data.applications.length === 1);

  const approve = await call("POST", `/api/admin/applications/${cnName.data.id}/approve`,
    { gatherings: ["001"] }, cookieHeader(jar), jar);
  check("审批生成通行码", /^[A-Z2-9]{8}$/.test(approve.data.passcode || ""),
    `${approve.data.handle} / ${approve.data.passcode}`);

  const reApprove = await call("POST", `/api/admin/applications/${cnName.data.id}/approve`,
    { gatherings: ["001"] }, cookieHeader(jar), jar);
  check("重复审批被拒", reApprove.status === 400);

  const badLogin = await call("POST", "/api/auth/login",
    { handle: approve.data.handle, passcode: "WRONGGGG" });
  check("错误通行码登录失败", badLogin.status === 401);

  const login = await call("POST", "/api/auth/login",
    { handle: approve.data.handle, passcode: approve.data.passcode });
  check("新账号可登录", login.status === 200 && login.data.ok, JSON.stringify(login.data.user || {}));

  const caseLogin = await call("POST", "/api/auth/login",
    { handle: (approve.data.handle || "").toUpperCase(), passcode: approve.data.passcode });
  check("登录名大小写不敏感", caseLogin.status === 200);

  const reissue = await call("POST", `/api/admin/applications/${cnName.data.id}/reissue`,
    {}, cookieHeader(jar), jar);
  check("重发通行码", reissue.status === 200 && reissue.data.passcode !== approve.data.passcode,
    reissue.data.passcode);

  const oldCode = await call("POST", "/api/auth/login",
    { handle: approve.data.handle, passcode: approve.data.passcode });
  check("旧通行码失效", oldCode.status === 401);

  const newCode = await call("POST", "/api/auth/login",
    { handle: reissue.data.handle, passcode: reissue.data.passcode });
  check("新通行码可用", newCode.status === 200);

  const reject = await call("POST", `/api/admin/applications/${enName.data.id}/reject`,
    { reason: "本期名额已满" }, cookieHeader(jar), jar);
  check("驳回申请", reject.status === 200 && reject.data.application.status === "rejected");

  const inject = await call("POST", "/api/apply", {
    name: "Formula" + stamp, intentDates: "=1+1", message: "@SUM(A1)"
  });
  check("公式注入样本已录入", inject.status === 200);

  const csv = await fetch(BASE + "/api/admin/applications.csv", {
    headers: cookieHeader(jar)
  });
  const bytes = new Uint8Array(await csv.arrayBuffer());
  const csvText = Buffer.from(bytes).toString("utf8");
  const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  check("CSV 带 UTF-8 BOM 与中文表头",
    csv.ok && hasBom && csvText.includes("登录名"),
    `${csvText.split("\r\n").length} 行`);
  check("CSV 转义公式注入",
    csvText.includes(`"'=1+1"`) && csvText.includes(`"'@SUM(A1)"`));

  const demo = await call("POST", "/api/auth/login", { handle: "demo_caster", passcode: "CAST-DEMO" });
  check("演示账号仍可登录", demo.status === 200);

  let limited = 0;
  for (let i = 0; i < 8; i++) {
    const r = await call("POST", "/api/apply", { name: "刷屏" + i + stamp, intentDates: "x" });
    if (r.status === 429) limited++;
  }
  check("报名限流生效", limited > 0, `被拦 ${limited} 次`);
})();
