import * as crypto from "crypto"
import { cookies } from "next/headers"
import { prisma } from "./db"

const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000 // 30 days

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

export async function createSession(userId: string): Promise<string> {
  const sessionToken = generateSessionToken()
  const expires = new Date(Date.now() + SESSION_MAX_AGE)

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  })

  return sessionToken
}

export async function setSessionCookie(sessionToken: string): Promise<void> {
  const cookieStore = await cookies()
  const isProduction = process.env.NODE_ENV === "production"
  const cookiePrefix = isProduction ? "__Secure-" : ""
  const cookieDomain = process.env.COOKIE_DOMAIN

  cookieStore.set(`${cookiePrefix}ac.session-token`, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction,
    domain: cookieDomain,
    maxAge: SESSION_MAX_AGE / 1000,
  })
}

export async function createAndSetSession(userId: string): Promise<string> {
  const sessionToken = await createSession(userId)
  await setSessionCookie(sessionToken)
  return sessionToken
}
