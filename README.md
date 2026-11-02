# 赛博法师 · CYBER CASTERS

B03 V08「探险手账」官网候选版。包含首页、活动申请、成员登录、组织者审核、双语活动纪要与留言功能。公众号二维码已接入“关注我们”弹窗。

## 部署前请维护者确认

原仓库提供 Node / Render 部署配置；本候选也包含 Cloudflare Workers 入口。两种运行方式的成员存储位置不同。**这次代码推送和合并本身不代表可以直接切换托管平台。** 请先确认当前网站实际运行的平台、持久化数据位置、绑定和自动部署设置，并完成数据备份。平台切换需要单独的数据迁移，本项目没有自动搬迁现有成员记录。

发布域名为 `cyber-casters.com` 和 `www.cyber-casters.com`。部署者应保留现有域名配置，决定 www 的转址方式，并确认 DNS 最终指向实际运行的网站。

## Node / Render

- 启动命令：`npm start`；健康检查：`/api/health`。
- `DATA_DIR` 必须指向已有的持久化数据卷，不能使用本机演示数据或空库替代线上数据。
- `SESSION_SECRET` 至少 32 个字符；需在运行平台安全设置中填写 `ADMIN1_USER`、`ADMIN1_PASS`。可选管理员使用 `ADMIN2_USER/PASS` 与 `ADMIN3_USER/PASS`。
- 如果使用微信登录，保留原有微信 App ID 与 App Secret，并核对回调域名。

## Cloudflare Workers

- Worker 配置位于 `wrangler.jsonc`，Worker 名称为 `cybercasters`。
- 站点域名路由、Durable Object `STORE` 绑定、`CyberStore` 类及既有迁移状态须先与 Cloudflare 后台核对并保留。不要重建存储或重置迁移来解决部署问题。
- 使用 `npm run check:deploy` 只做部署预演；正式部署命令为 `npm run deploy:cf`。正式部署应由维护者在确认数据与线上配置后执行。
- 在 Worker 的机密设置中配置 `SESSION_SECRET`、`ADMIN1_USER`、`ADMIN1_PASS`。其它可选管理员和微信 OAuth 密钥按现有功能需要配置。

## 私有纪要

公开仓库只含“纪要未配置”的占位文件，不含实际纪要正文。正式部署前，维护者必须在私有部署副本中，从内部归档恢复对应期次的中文和英文纪要，再构建或部署。Node 版本使用 `server/content/gatherings/`；Workers 版本还需将中文正文放入 `worker/content-001.html`、`worker/content-002.html`。不要把实际纪要提交至公开 Git、构建日志或公开制品。

本次审核分支会从当前版本移除原先被跟踪的成员纪要和本地账号数据库，并新增忽略规则；这不会改写或删除既有公开提交历史。维护者应另行检查历史中曾公开的敏感内容，并按需轮换凭据或处理数据。

## 本地运行

Node 测试服务需要设置正式格式的本地密钥和隔离的 `DATA_DIR`。Cloudflare 本机预览可使用 `npm run dev:cf`。生产密钥不要提交至 Git。
