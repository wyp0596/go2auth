# Go2Auth

micro-SaaS 统一 Account Center，DB Session + Cookie 实现同主域子域 SSO。

## 功能

- 登录：Email Magic Link / Google / GitHub（国外）；手机号 OTP / 微信扫码（国内）
- 用户中心：基础资料、绑定/解绑、退出
- SSO：`.example.com` 或 `.example.cn` 下多子域共享登录态

## 技术栈

- Next.js (App Router)
- Auth.js (NextAuth v5) - Database Sessions
- Prisma + PostgreSQL

## 快速开始

```bash
pnpm i
cp .env.example .env.local  # 配置环境变量
npx prisma migrate dev
pnpm dev
```

## 本地开发

用 `localtest.me`（解析到 127.0.0.1）模拟子域 SSO：

- `accounts.localtest.me:3000` - Account Center
- `app1.localtest.me:3001` - 产品 1
- `COOKIE_DOMAIN=.localtest.me`

## 产品接入

产品通过 `GET {ACCOUNTS_URL}/api/session` 校验登录态，转发用户 cookie，返回 user 或 401。

详见 [docs/Project.md](docs/Project.md)。

## License

MIT
