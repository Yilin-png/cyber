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

## 部署上线（推荐）

本站是 **Node + Express**，需要能跑 Node 的平台（申请 / 登录 / 评论都写本地数据库）。

> **不要**用 Cloudflare Workers / Pages「拖文件夹上传」整仓部署：  
> Workers 跑不了 Express，且 `node_modules` 里的 `.d.ts` 会被误判成 TypeScript 项目。

### 方式 A：Render（最简单）

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

### 方式 B：Docker（任意 VPS / Railway / Fly）

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

### 方式 C：已有 Linux 服务器

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
server/
  index.js              API + 静态托管
  gatherings.js         公开摘要元数据
  content/gatherings/   完整纪要 HTML（仅 API 对参会者返回）
  data/                 默认数据目录（可被 DATA_DIR 覆盖）
  seed.js               演示账号
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

见 `.env.example`。本地可放 `.env`（已接入 `dotenv`）；线上用平台面板注入。

## 注意

- 请用 `npm start` 跑服务，不要只用静态文件服务器——权限与评论依赖 `/api/*`。  
- 生产环境务必修改 `SESSION_SECRET` 与 `ADMIN_TOKEN`。  
- 数据文件含用户哈希，勿提交到公开仓库。
