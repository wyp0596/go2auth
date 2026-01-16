import { NextRequest, NextResponse } from "next/server"
import { verifyOtp } from "@/lib/otp"
import { createAndSetSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { getSafeReturnTo } from "@/lib/redirect"

const PHONE_REGEX = /^1[3-9]\d{9}$/
const OTP_REGEX = /^\d{6}$/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, code, returnTo } = body

    if (!phone || !PHONE_REGEX.test(phone)) {
      return NextResponse.json({ error: "请输入有效的手机号" }, { status: 400 })
    }

    if (!code || !OTP_REGEX.test(code)) {
      return NextResponse.json({ error: "请输入6位验证码" }, { status: 400 })
    }

    // Verify OTP
    const result = await verifyOtp(phone, code)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { phone },
    })

    if (!user) {
      user = await prisma.user.create({
        data: { phone },
      })
    }

    // Create session
    await createAndSetSession(user.id)

    // Return redirect URL
    const redirect = getSafeReturnTo(returnTo ?? null, "/account")
    return NextResponse.json({ ok: true, redirect })
  } catch (err) {
    console.error("[Phone Verify] Error:", err)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
