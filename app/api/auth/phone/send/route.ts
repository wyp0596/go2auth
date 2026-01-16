import { NextRequest, NextResponse } from "next/server"
import { createOtpToken } from "@/lib/otp"
import { sendSms } from "@/lib/sms"

const PHONE_REGEX = /^1[3-9]\d{9}$/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone } = body

    if (!phone || !PHONE_REGEX.test(phone)) {
      return NextResponse.json({ error: "请输入有效的手机号" }, { status: 400 })
    }

    // Create OTP token (handles rate limiting)
    // PNVS mode: code is undefined (Aliyun generates it)
    // Legacy mode: code is the generated OTP
    const result = await createOtpToken(phone)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 429 })
    }

    // Send SMS
    const smsResult = await sendSms(phone, result.code)
    if (!smsResult.ok) {
      return NextResponse.json({ error: smsResult.error || "短信发送失败" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[Phone Send] Error:", err)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
