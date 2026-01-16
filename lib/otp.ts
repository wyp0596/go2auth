import * as crypto from "crypto"
import { prisma } from "./db"
import { isPnvsMode, checkSmsPnvs } from "./sms"

const OTP_EXPIRY_MINUTES = 5
const RATE_LIMIT_SECONDS = 60
const MAX_ATTEMPTS_PER_HOUR = 5
const LOCKOUT_MINUTES = 10
const MAX_VERIFY_ATTEMPTS = 5

// In-memory rate limiting (consider Redis for production multi-instance)
const rateLimits = new Map<string, { lastSent: number; attempts: number; hourStart: number }>()
const verifyAttempts = new Map<string, { count: number; lockedUntil: number }>()

export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString()
}

export async function createOtpToken(phone: string): Promise<{ ok: boolean; code?: string; error?: string }> {
  const now = Date.now()
  const limit = rateLimits.get(phone)

  // Check rate limit: 1 per minute
  if (limit && now - limit.lastSent < RATE_LIMIT_SECONDS * 1000) {
    const wait = Math.ceil((RATE_LIMIT_SECONDS * 1000 - (now - limit.lastSent)) / 1000)
    return { ok: false, error: `请等待 ${wait} 秒后重试` }
  }

  // Check hourly limit
  const hourAgo = now - 3600 * 1000
  if (limit && limit.hourStart > hourAgo && limit.attempts >= MAX_ATTEMPTS_PER_HOUR) {
    return { ok: false, error: "发送次数过多，请稍后再试" }
  }

  // Update rate limit
  rateLimits.set(phone, {
    lastSent: now,
    attempts: limit && limit.hourStart > hourAgo ? limit.attempts + 1 : 1,
    hourStart: limit && limit.hourStart > hourAgo ? limit.hourStart : now,
  })

  // PNVS mode: 阿里云生成验证码，不存本地
  if (isPnvsMode()) {
    return { ok: true }
  }

  // Legacy mode: 本地生成验证码并存 DB
  const code = generateOtp()
  const expires = new Date(now + OTP_EXPIRY_MINUTES * 60 * 1000)

  // Delete any existing token for this phone
  await prisma.verificationToken.deleteMany({
    where: { identifier: phone },
  })

  // Create new token
  await prisma.verificationToken.create({
    data: {
      identifier: phone,
      token: code,
      expires,
    },
  })

  return { ok: true, code }
}

export async function getOtpCode(phone: string): Promise<string | null> {
  const token = await prisma.verificationToken.findFirst({
    where: { identifier: phone },
  })
  return token?.token ?? null
}

export async function verifyOtp(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const now = Date.now()
  const attempt = verifyAttempts.get(phone)

  // Check lockout
  if (attempt && attempt.lockedUntil > now) {
    const wait = Math.ceil((attempt.lockedUntil - now) / 60000)
    return { ok: false, error: `验证次数过多，请 ${wait} 分钟后重试` }
  }

  // PNVS mode: 阿里云验证
  if (isPnvsMode()) {
    const result = await checkSmsPnvs(phone, code)
    if (!result.ok) {
      incrementVerifyAttempt(phone)
      return result
    }
    verifyAttempts.delete(phone)
    return { ok: true }
  }

  // Legacy mode: 本地 DB 验证
  const token = await prisma.verificationToken.findFirst({
    where: { identifier: phone },
  })

  if (!token) {
    incrementVerifyAttempt(phone)
    return { ok: false, error: "验证码不存在或已过期" }
  }

  if (token.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { identifier_token: { identifier: phone, token: token.token } } })
    return { ok: false, error: "验证码已过期" }
  }

  if (token.token !== code) {
    incrementVerifyAttempt(phone)
    return { ok: false, error: "验证码错误" }
  }

  // Success - delete token and clear attempts
  await prisma.verificationToken.delete({ where: { identifier_token: { identifier: phone, token: token.token } } })
  verifyAttempts.delete(phone)

  return { ok: true }
}

function incrementVerifyAttempt(phone: string) {
  const now = Date.now()
  const attempt = verifyAttempts.get(phone)
  const count = (attempt?.count ?? 0) + 1

  if (count >= MAX_VERIFY_ATTEMPTS) {
    verifyAttempts.set(phone, {
      count: 0,
      lockedUntil: now + LOCKOUT_MINUTES * 60 * 1000,
    })
  } else {
    verifyAttempts.set(phone, {
      count,
      lockedUntil: 0,
    })
  }
}
