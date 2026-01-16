import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Nodemailer from "next-auth/providers/nodemailer"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./db"
import { isAllowedRedirect } from "./redirect"

const cookieDomain = process.env.COOKIE_DOMAIN
const isProduction = process.env.NODE_ENV === "production"
const cookiePrefix = isProduction ? "__Secure-" : ""

const providers = []

// Email Magic Link (optional)
if (process.env.EMAIL_SERVER && process.env.EMAIL_FROM) {
  providers.push(
    Nodemailer({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    })
  )
}

// Google OAuth (optional)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  )
}

// GitHub OAuth (optional)
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    })
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers,

  cookies: {
    sessionToken: {
      name: `${cookiePrefix}ac.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
        domain: cookieDomain,
      },
    },
    csrfToken: {
      name: `${cookiePrefix}ac.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
        domain: cookieDomain,
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}ac.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
        domain: cookieDomain,
      },
    },
  },

  callbacks: {
    redirect: async ({ url, baseUrl }) => {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (isAllowedRedirect(url)) return url
      return baseUrl
    },
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
})
