/** Durable Object：整库 JSON 持久化（申请 / 用户 / 评论） */
import { DurableObject } from "cloudflare:workers";

function emptyDb() {
  return {
    applications: [],
    users: [],
    comments: [],
    sessions: {}
  };
}

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

function normalize(stored) {
  const db = { ...emptyDb(), ...(stored || {}) };
  if (!Array.isArray(db.applications)) db.applications = [];
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.comments)) db.comments = [];
  return db;
}

export class CyberStore extends DurableObject {
  async #read() {
    const stored = await this.ctx.storage.get("db");
    const db = normalize(stored);
    if (migrate(db)) await this.ctx.storage.put("db", db);
    return db;
  }

  /** RPC：读取整库 */
  async load() {
    return this.#read();
  }

  /** RPC：覆盖写入整库 */
  async save(db) {
    await this.ctx.storage.put("db", normalize(db));
    return { ok: true };
  }
}

export function getStore(env) {
  return env.STORE.get(env.STORE.idFromName("main"));
}
