# 赛博法师 · CYBER CASTERS

AI 技巧交流会站点：**公开摘要 + 成员权限纪要 + 留言板**。

## 权限模型

| 访客 | 可见内容 |
|------|----------|
| 未登录 | 活动 1–2 句安全摘要、法器长廊、申请入口 |
| 已申请待审 | 同上（等待组织者发通行码） |
| 参会成员（登录） | 自己参加过的期次**完整纪要**、现场照片、留言板、咒语手册 |

敏感操作细节（含完整纪要正文）只存在服务端，不放进公开 HTML。

## 快速开始（本地）

```bash
npm install
cp .env.example .env   # 按需修改密钥
npm start
```

打开 http://localhost:3000

**演示账号**（启动日志也会打印）：

- 登录名：`demo_caster`
- 通行码：`CAST-DEMO`

### 本地模拟 Cloudflare（可选）

```bash
npm run dev:cf
```

会启动 Workers + Assets + Durable Object（数据持久在本地 `.wrangler`）。

## 部署上线

### 方式 A：Cloudflare Workers（推荐）

静态页走 **Workers Assets**，API 走 **Worker（Hono）**，申请/用户/评论存在 **Durable Object**（重启不丢）。

> 不要再把整仓拖进 Cloudflare Pages 当纯静态站：权限与评论依赖 `/api/*`。

1. 安装依赖并登录 Cloudflare：

```bash
npm install
npx wrangler login
```

2. 部署：

```bash
npm run deploy
```

首次会打印 `*.workers.dev` 地址。

3. 配置密钥（生产务必改掉默认值）：

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put ADMIN_TOKEN
# 可选微信登录
# npx wrangler secret put WECHAT_APP_ID
# npx wrangler secret put WECHAT_APP_SECRET
```

4. 在 `wrangler.jsonc` 的 `vars.PUBLIC_BASE` 填上线地址（或部署后用自定义域），例如：

```jsonc
"vars": {
  "PUBLIC_BASE": "https://cybercasters.<你的子域>.workers.dev",
  "DISABLE_DEMO": "1"
}
```

再执行一次 `npm run deploy`。健康检查：`/api/health`。

5. （可选）绑定自定义域名：Cloudflare Dashboard → Workers → cybercasters → Domains & Routes。

### 方式 B：Render

1. 代码推到 GitHub  
2. 打开 [Render](https://render.com) → **New** → **Blueprint**，选本仓库（读 `render.yaml`）  
   或 **Web Service**，Build：`npm ci`，Start：`npm start`  
3. 环境变量至少设置：

| 变量 | 说明 |
|------|------|
| `SESSION_SECRET` | 随机长字符串 |
| `ADMIN_TOKEN` | 管理后台令牌 |
| `PUBLIC_BASE` | 上线后的 https 地址，如 `https://cybercasters.onrender.com` |
| `NODE_ENV` | `production` |

4. 部署完成后打开 `PUBLIC_BASE`，健康检查：`/api/health`

免费实例无持久盘时，**重新部署会清空**申请/用户/评论。要留数据：加 Disk，并把 `DATA_DIR` 指到挂载路径。

### 方式 C：Docker（任意 VPS / Railway / Fly）

```bash
docker build -t cybercasters .
docker run -d -p 3000:3000 \
  -e SESSION_SECRET=换成长随机串 \
  -e ADMIN_TOKEN=换成管理令牌 \
  -e PUBLIC_BASE=https://你的域名 \
  -e NODE_ENV=production \
  -v cybercasters-data:/data \
  cybercasters
```

数据写在容器内 `/data`（`DATA_DIR`），务必挂卷。

### 方式 D：已有 Linux 服务器

```bash
git clone <你的仓库>
cd cybercasters_0726
npm ci
# 配置 .env 或 export 环境变量
NODE_ENV=production npm start
```

前面建议再挂 Nginx / Caddy 做 HTTPS 反代。

## 目录

```
app/                    前端静态页
server/                 Node + Express（本地 / Render / Docker）
worker/                 Cloudflare Worker API（Hono + Durable Object）
wrangler.jsonc          Cloudflare 部署配置
Dockerfile              容器镜像
render.yaml             Render 蓝图
```

## 常用流程

1. 访客在 **我想参加** 填写称呼与意向时间（联系方式选填）  
2. 组织者打开 `/admin.html`，用 `ADMIN_TOKEN` 审批  
3. 把返回的**登录名 + 一次性通行码**私下发给对方  
4. 对方在 **成员登录** 用「登录名 + 通行码」进入当期纪要并留言  

## 微信扫码（可选）

```bash
WECHAT_APP_ID=...
WECHAT_APP_SECRET=...
PUBLIC_BASE=https://your-domain.com
```

未配置时，登录页「微信扫码」会提示改用通行码。

## 环境变量

见 `.env.example`。本地可放 `.env`（已接入 `dotenv`）；Cloudflare 用 `wrangler secret` / `vars`；其他平台用面板注入。

## 注意

- 请用 `npm start`（Node）或 `npm run deploy`（Cloudflare）跑完整服务，不要只用静态文件服务器——权限与评论依赖 `/api/*`。  
- 生产环境务必修改 `SESSION_SECRET` 与 `ADMIN_TOKEN`；Cloudflare 上建议 `DISABLE_DEMO=1`。  
- 数据文件含用户哈希，勿提交到公开仓库。
