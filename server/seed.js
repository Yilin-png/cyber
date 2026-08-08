const { load, save, uid, hashPass, handleOf } = require("./db");

const DEMO_HANDLE = "demo_caster";
const DEMO_PASS = "CAST-DEMO";

/** 确保本地演示账号可用（幂等）：登录名 demo_caster / 通行码 CAST-DEMO */
function ensureDemoUser() {
  if (["1", "true", "yes"].includes(String(process.env.DISABLE_DEMO || "").toLowerCase())) {
    return load();
  }

  const db = load();
  let user = db.users.find(u => handleOf(u).toLowerCase() === DEMO_HANDLE);
  if (!user) {
    user = {
      id: uid("u_"),
      name: "演示参会者",
      handle: DEMO_HANDLE,
      passcodeHash: hashPass(DEMO_PASS),
      gatherings: ["001"],
      wechatOpenId: "",
      createdAt: new Date().toISOString(),
      note: "seed demo account"
    };
    db.users.push(user);
  } else {
    /* 每次启动重置演示通行码，避免本地库被改坏后无法登录 */
    user.passcodeHash = hashPass(DEMO_PASS);
    const set = new Set([...(user.gatherings || []), "001"]);
    user.gatherings = [...set];
    user.name = user.name || "演示参会者";
  }

  db._seedInfo = {
    handle: DEMO_HANDLE,
    passcode: DEMO_PASS,
    tip: "登录页可用 登录名 demo_caster + 通行码 CAST-DEMO 试用"
  };
  save(db);
  return db;
}

/** @deprecated 兼容旧调用名 */
function seedIfEmpty() {
  return ensureDemoUser();
}

if (require.main === module) {
  const db = load();
  db.users = [];
  db.applications = [];
  db.comments = [];
  db.sessions = {};
  save(db);
  ensureDemoUser();
  console.log("[seed] reset + demo:", DEMO_HANDLE, DEMO_PASS);
}

module.exports = { seedIfEmpty, ensureDemoUser };
