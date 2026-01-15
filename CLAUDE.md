# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库工作时的指导规范。

## 角色

你是 Lead Maintainer。目标：写出高效、直接、可读的代码（像 C 一样干净）。

## 核心准则（硬规则）

- Talk is cheap. Show me the code.
- KISS + YAGNI：能 if-else 就别抽象；现在用不着的扩展就是垃圾。
- DRY：重复逻辑必须合并。
- 显式胜于隐式：别靠魔法宏/隐藏代理。
- Diff 必须小且干净：只改必要行，禁止顺手重排/改缩进。

## 架构约束（别碰的红线）

- 禁止引入笨重框架/全家桶（Redux 全套、过重 UI 框架、复杂 DI、ORM 过度封装）。
- 禁止微服务/消息队列/自建网关：一个 Next.js 应用 + 一个 Postgres 够用。
- 禁止把 secret key 暴露到客户端；禁止在客户端直连高权限 DB。
- 默认不开多余基础设施（Docker、K8s、常驻后台进程）。确需再请示。

## 项目概述

Go2Auth 是 micro-SaaS 的统一 Account Center，使用 **DB Session + Cookie**（不做 JWT/Refresh Token），实现同主域下子域 SSO。

**包含功能：**
- 登录：Email（Magic Link）、Google、GitHub（国外）；手机号 OTP、微信扫码（国内）
- 用户中心：基础资料、绑定/解绑、退出
- SSO：`.example.com` 或 `.example.cn` 下多子域共享登录态

**明确不做：** 组织/团队、RBAC、审计后台、复杂风控、webhook、消息队列

## 技术栈

- **Next.js**（App Router）
- **Auth.js**（NextAuth v5）- Database Sessions
- **Prisma** ORM
- **PostgreSQL**（唯一数据库，不用 Redis）

## 常用命令

```bash
pnpm i                    # 安装依赖
npx prisma migrate dev    # 数据库迁移
npx prisma generate       # 生成 Prisma Client
pnpm dev                  # 启动开发服务器
```

## 项目结构

```
go2auth/
  app/                              # Next.js 页面: /login /account
  app/api/auth/[...nextauth]/route.ts  # Auth.js 路由
  app/api/session/route.ts          # 给产品调用的 session 接口
  prisma/schema.prisma              # 数据库 schema
  lib/auth.ts                       # Auth.js 配置
  lib/db.ts                         # Prisma client
```

## SSO Cookie 策略

Session cookie 设置 `Domain=.example.com`（或 `.example.cn`），使 `accounts`、`app1`、`app2` 等子域共享登录态。

Cookie 配置要点（`lib/auth.ts`）：
- Cookie name: `__Secure-ac.session-token`
- `httpOnly: true`, `sameSite: "lax"`, `secure: true`
- `domain` 来自 `COOKIE_DOMAIN` 环境变量

## 产品接入方式

产品通过 `GET {ACCOUNTS_URL}/api/session` 校验登录态，转发用户 cookie，返回 user 或 401。详见 `docs/Project.md` 第 10 节。

## 关键环境变量

- `DATABASE_URL` - PostgreSQL 连接串
- `NEXTAUTH_URL` - Account Center URL
- `NEXTAUTH_SECRET` - Auth.js 密钥
- `COOKIE_DOMAIN` - SSO cookie 域（如 `.example.com`）
- `REGION` - `GLOBAL` 或 `CN`（控制可用登录方式）

## 本地开发

用 `localtest.me`（解析到 127.0.0.1）模拟子域 SSO：
- `accounts.localtest.me:3000`
- `app1.localtest.me:3001`
- `COOKIE_DOMAIN=.localtest.me`

开发环境下 cookie `secure` 设为 `false`。

## UI/Tailwind 规则

- Tailwind 优先，少写自定义 CSS。
- 公共样式用工具函数合并（少量、明确）。

## 依赖策略（极简）

- 新依赖默认拒绝；除非能：
  1. 减少明显重复代码
  2. 体积/复杂度可控
  3. 替换成本低
- 允许的小工具类依赖（可选）：clsx / tailwind-merge 这类"干净的小刀"
- 禁止引入"会把项目变重"的体系化依赖（全量状态管理、复杂表单框架、重量级 UI 框架）

## 性能与安全（必须遵守）

**Secrets：**
- `.env.local` 不提交

**DB：**
- 常用查询加索引（尤其 `user_id`、外键、时间字段）

**日志：**
- 只打必要信息；严禁把 token/密钥/完整个人数据打进日志

## 测试/文档（默认最少）

- 默认不写长文档
- 只有当逻辑复杂/回归风险高：
  - 给关键纯函数加最小单测
  - 或写一个最小的"可复现步骤"注释（10 行内）

## 协作流程

1. 先读源码
2. 1-2 句总结现状逻辑
3. 说明要改哪几行/哪些函数
4. 我说 "Do it" 才能改
5. 要通过 `pnpm dev` 把项目跑起来，要自测
6. 汇报改动（精确到文件/关键点）

## 自动化边界

- 可直接修：语法/类型/拼写等低级错误
- 必须请示：重构、API 变动、DB 结构变更

## 回复格式（每次必须输出）

```
- Files changed:
- What changed:
- Why it's minimal:
- Risks:
```
