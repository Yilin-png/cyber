const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/* 生产可挂卷：DATA_DIR=/var/data 等；默认仍用 server/data */
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function emptyDb() {
  return {
    applications: [],
    users: [],
    comments: [],
    sessions: {}
  };
}

/* 早期版本把登录名存在 wechat 字段里，读盘时统一迁移到 handle */
function migrate(db) {
  let dirty = false;
  for (const list of [db.applications, db.users]) {
    if (!Array.isArray(list)) continue;
    for (const row of list) {
      if (!row.handle && row.wechat) {
        row.handle = row.wechat;
        dirty = true;
      }
    }
  }
  return dirty;
}

function load() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const db = emptyDb();
    save(db);
    return db;
  }
  const db = { ...emptyDb(), ...JSON.parse(fs.readFileSync(DB_PATH, "utf8")) };
  if (migrate(db)) save(db);
  return db;
}

function save(db) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, DB_PATH);
}

function uid(prefix = "") {
  return prefix + crypto.randomBytes(8).toString("hex");
}

function hashPass(pass) {
  const salt = crypto.randomBytes(8).toString("hex");
  const hash = crypto.scryptSync(String(pass), salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPass(pass, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const next = crypto.scryptSync(String(pass), salt, 32).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(next, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/* 去掉易混淆的 0/O/1/I，避免口头或转发时读错 */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function genPasscode() {
  let s = "";
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return s;
}

const HANDLE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** 登录名必须能用键盘直接敲出来：拉丁名走 slug，中文等非拉丁名走随机短码 */
function slugifyName(name) {
  const slug = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16);
  return /^[a-z]/.test(slug) && slug.length >= 3 ? slug : "";
}

function randomHandle() {
  let s = "";
  for (let i = 0; i < 5; i++) s += HANDLE_ALPHABET[crypto.randomInt(HANDLE_ALPHABET.length)];
  return `caster-${s}`;
}

/**
 * 生成不与现有申请/用户冲突的登录名。
 * @param {object} db
 * @param {string} name 申请人填写的称呼
 */
function genHandle(db, name) {
  const taken = h => {
    const key = String(h).toLowerCase();
    const hit = row => String(row.handle || row.wechat || "").toLowerCase() === key;
    return (db.applications || []).some(hit) || (db.users || []).some(hit);
  };

  const base = slugifyName(name);
  if (base && !taken(base)) return base;
  if (base) {
    for (let n = 2; n <= 20; n++) {
      const candidate = `${base}${n}`;
      if (!taken(candidate)) return candidate;
    }
  }
  for (let i = 0; i < 50; i++) {
    const candidate = randomHandle();
    if (!taken(candidate)) return candidate;
  }
  return `caster-${crypto.randomBytes(4).toString("hex")}`;
}

/** 统一读取登录名，兼容尚未迁移的旧记录 */
function handleOf(row) {
  return String((row && (row.handle || row.wechat)) || "");
}

module.exports = {
  load,
  save,
  uid,
  hashPass,
  verifyPass,
  genPasscode,
  genHandle,
  handleOf,
  DB_PATH,
  DATA_DIR
};
