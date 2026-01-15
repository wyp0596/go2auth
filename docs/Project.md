# Go2Auth开发文档

## 1. 目标与范围

**目标**：一个 Account Center 复用所有 micro-SaaS 的登录与用户中心，使用 **DB Session + Cookie**（不做 JWT/Refresh Token）。

**包含**

* 登录：Email（Magic Link）/ Google / GitHub（国外）；手机号 OTP / 微信扫码（国内）
* 用户中心：基础资料、绑定/解绑、退出
* SSO：同一主域下的多个子域产品共享登录态（`.example.com` 或 `.example.cn`）

**不包含（明确不做）**

* 组织/团队、RBAC、审计后台、复杂风控、webhook、消息队列

---

## 2. 推荐技术栈（单人最省心）

* Web：Next.js（App Router）
* Auth：Auth.js（NextAuth v5）
* DB：Postgres
* ORM：Prisma
* 部署：1 个服务 + 1 个 Postgres（每个区域一套）

> Auth.js 支持 “Database sessions”，即 `Session` 表存 sessionToken，浏览器存 `sessionToken` cookie。

---

## 3. 域名与 SSO 约束（必须满足）

### 3.1 同区域同主域（推荐）

* 国外：`accounts.example.com`、`app1.example.com`、`app2.example.com`
* 国内：`accounts.example.cn`、`app1.example.cn`、`app2.example.cn`

这样可以把 session cookie 的 `Domain` 设为 `.example.com`（或 `.example.cn`），实现子域 SSO。

### 3.2 如果不同主域（不推荐）

`cookie` 无法跨主域共享，SSO 只能每次重定向到 accounts 再返回（能用但体验差）。本文档按 **同主域** 方案写。所以先不做。

---

## 4. 项目结构（单仓库可选）

```
go2auth/
  app/                    # Next.js pages: /login /account
  app/api/auth/[...nextauth]/route.ts
  app/api/session/route.ts
  prisma/schema.prisma
  lib/auth.ts
  lib/db.ts
```

---

## 5. 数据库模型（Prisma 最小可用）

`prisma/schema.prisma`（Auth.js 常用结构，够用）

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  name      String?
  email     String?  @unique
  phone     String?  @unique
  image     String?
  createdAt DateTime @default(now())
  accounts  Account[]
  sessions  Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  access_token      String?
  refresh_token     String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}
```

初始化：

```bash
pnpm i
npx prisma migrate dev
```

---

## 6. 环境变量（两套部署靠 env 切换）

`.env` 示例（国外）

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/account_center"
NEXTAUTH_URL="https://accounts.example.com"
NEXTAUTH_SECRET="a-very-long-random-secret"

# Email magic link
EMAIL_SERVER="smtp://user:pass@smtp.example.com:587"
EMAIL_FROM="noreply@example.com"

# OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."

# Cookie domain for SSO (关键)
COOKIE_DOMAIN=".example.com"

# Region toggle
REGION="GLOBAL"
```

国内同理，改成 `.example.cn`，加短信/微信相关 key：

```env
COOKIE_DOMAIN=".example.cn"
REGION="CN"

SMS_PROVIDER="tencent|aliyun"
SMS_ACCESS_KEY="..."
SMS_SECRET="..."
SMS_SIGN="..."
SMS_TEMPLATE_ID="..."

WECHAT_APPID="..."
WECHAT_SECRET="..."
WECHAT_REDIRECT_URI="https://accounts.example.cn/api/wechat/callback"
```

---

## 7. Auth.js 配置（DB Session + 共享子域 Cookie）

`lib/auth.ts`（示意，可直接改）

```ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Email from "next-auth/providers/email"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./db"

const cookieDomain = process.env.COOKIE_DOMAIN

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  // 强制使用 database session（默认有 adapter 即为 database session）
  session: { strategy: "database" },

  providers: [
    Email({
      server: process.env.EMAIL_SERVER!,
      from: process.env.EMAIL_FROM!,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: false,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: false,
    }),
  ],

  // 关键：让 cookie 对整个主域生效，实现 app1/app2 子域共享
  cookies: {
    sessionToken: {
      name: "__Secure-ac.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: cookieDomain, // ".example.com" / ".example.cn"
      },
    },
    // 其他 cookie（callbackUrl, csrfToken）可按需同样设置 domain
  },

  callbacks: {
    // 让 session 返回 userId（产品侧经常要用）
    session: async ({ session, user }) => {
      if (session.user) (session.user as any).id = user.id
      return session
    },
  },
})
```

路由：

`app/api/auth/[...nextauth]/route.ts`

```ts
export { handlers as GET, handlers as POST } from "@/lib/auth"
```

---

## 8. Account Center 对外接口（极简但可用）

### 8.1 获取当前登录用户（给产品调用）

`GET /api/session`

* **输入**：浏览器自动带 cookie（同主域下）
* **输出**（未登录返回 401）：

```json
{
  "user": { "id": "xxx", "email": "a@b.com", "name": "Miku", "image": null }
}
```

实现：`app/api/session/route.ts`

```ts
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 })
  return NextResponse.json({ user: session.user })
}
```

### 8.2 登录入口

`GET /login?returnTo=<urlencoded>`

* 登录成功后跳回 `returnTo`
* 建议只允许回跳到白名单域名（防止 open redirect）

### 8.3 退出登录

`POST /api/auth/signout`（Auth.js 自带），或你包一层 `/logout`

---

## 9. 页面最小集

* `/login`

  * 展示可用 provider（按 REGION 控制）
  * 支持 `returnTo`
* `/account`

  * 昵称/头像（存 `User` 表）
  * 已绑定 providers（读 `Account` 表）
  * 解绑/绑定按钮
  * 退出登录

---

## 10. micro-SaaS 接入规范（核心复用点）

### 10.1 产品侧必须有 3 个配置

* `ACCOUNTS_URL`：例如 `https://accounts.example.com`
* `APP_BASE_URL`：例如 `https://app1.example.com`
* `LOGIN_URL`：`{ACCOUNTS_URL}/login?returnTo={encodeURIComponent(currentUrl)}`

### 10.2 产品侧鉴权策略（推荐：服务端中间件校验 session）

**思路**：产品后端收到请求 → 调用 `accounts/api/session`（带 cookie）→ 得到 user → 放入 request context。

#### Node/Next.js 产品（middleware 示例）

```ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ACCOUNTS_URL = process.env.ACCOUNTS_URL!

export async function middleware(req: NextRequest) {
  const url = req.nextUrl
  const isPublic = url.pathname.startsWith("/public") || url.pathname === "/health"
  if (isPublic) return NextResponse.next()

  // 把用户 cookie 原样转发给 accounts
  const cookie = req.headers.get("cookie") || ""
  const r = await fetch(`${ACCOUNTS_URL}/api/session`, {
    headers: { cookie },
    cache: "no-store",
  })

  if (r.status === 401) {
    const login = `${ACCOUNTS_URL}/login?returnTo=${encodeURIComponent(url.toString())}`
    return NextResponse.redirect(login)
  }

  // 已登录：继续请求
  return NextResponse.next()
}
```

> 这要求：accounts 和 app 在同一主域，并且 cookie domain 覆盖主域。

#### 后端服务（Spring Boot 伪代码）

* 取 `Cookie` header
* `GET {accounts}/api/session`，把 Cookie 透传过去
* 401 则返回 302 到 login
* 200 则把 userId 存到 `request attribute`

---

## 11. 本地开发方案（避免真域名）

### 11.1 使用 `localtest.me`（通配 127.0.0.1）

* `accounts.localtest.me:3000`
* `app1.localtest.me:3001`

然后 `COOKIE_DOMAIN=.localtest.me`，即可本地模拟子域 SSO。

### 11.2 Cookie secure 问题

本地若用 http，`secure: true` 会导致 cookie 不写入。

* 本地开发可在 `NODE_ENV=development` 时把 `secure` 设为 `false`
* 线上必须 `true`

---

## 12. 安全最小清单（必须做，且不复杂）

1. **returnTo 白名单**：只允许跳回 `*.example.com`（或 `*.example.cn`）
2. Cookie：`httpOnly + sameSite=lax + secure + domain=.example.com`
3. OTP（国内手机号）：5 分钟过期，错误 5 次锁定 10 分钟；IP/手机号限流
4. OAuth：回调 URL 严格白名单（在 provider 控制台配置）
5. 数据删除：至少提供“注销账号”入口（软删也行）

---

## 13. 交付验收（你开发完成的判断标准）

* 在 `accounts` 登录后：

  * 访问 `app1` 不需要再次登录
  * 访问 `app2` 不需要再次登录
* `GET accounts/api/session` 在三个子域都能返回同一 user
* 退出登录后，`app1/app2` 都立即要求重新登录

---

## 14. 下一步（可选但仍极简）

* 国内短信 + 微信 provider：在 Auth.js 上追加 provider（短信用 Credentials/自定义 OTP；微信用 OAuth provider）
* “绑定/解绑”逻辑：通过 `Account` 表完成
* 上传头像：直接存对象存储 URL（不把文件塞 DB）


## 技术栈

- **Next.js（App Router）**
- **Auth.js（NextAuth v5）**：用 **Database Session**（session 存 Postgres）
- **Prisma**：最省心的 schema/migrate
- **Postgres**：唯一数据库（不要 Redis）


