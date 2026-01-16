import { NextRequest, NextResponse } from "next/server"
import { getWechatAccessToken, getWechatUserInfo, decodeWechatState } from "@/lib/wechat"
import { createAndSetSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { isAllowedRedirect } from "@/lib/redirect"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  const baseUrl = process.env.NEXT_PUBLIC_ACCOUNTS_URL || process.env.AUTH_URL || ""

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=wechat_no_code`)
  }

  // Decode and validate state
  const stateData = state ? decodeWechatState(state) : null
  let returnTo = "/account"

  if (stateData?.returnTo && isAllowedRedirect(stateData.returnTo)) {
    returnTo = stateData.returnTo
  }

  // Check state timestamp (10 min expiry)
  if (stateData && Date.now() - stateData.ts > 10 * 60 * 1000) {
    return NextResponse.redirect(`${baseUrl}/login?error=wechat_state_expired`)
  }

  try {
    // Exchange code for token
    const tokenData = await getWechatAccessToken(code)

    if (!tokenData.access_token || !tokenData.openid) {
      console.error("[WeChat] Invalid token response:", tokenData)
      return NextResponse.redirect(`${baseUrl}/login?error=wechat_token_error`)
    }

    // Get user info
    const userInfo = await getWechatUserInfo(tokenData.access_token, tokenData.openid)

    // Use unionid if available, otherwise openid
    const providerAccountId = userInfo.unionid || tokenData.unionid || tokenData.openid

    // Find existing account
    let account = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "wechat",
          providerAccountId,
        },
      },
      include: { user: true },
    })

    let userId: string

    if (account) {
      // Existing user - update info if needed
      userId = account.userId
      if (userInfo.nickname || userInfo.headimgurl) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            name: userInfo.nickname || undefined,
            image: userInfo.headimgurl || undefined,
          },
        })
      }
    } else {
      // New user - create user and account
      const user = await prisma.user.create({
        data: {
          name: userInfo.nickname || undefined,
          image: userInfo.headimgurl || undefined,
        },
      })
      userId = user.id

      await prisma.account.create({
        data: {
          userId,
          type: "oauth",
          provider: "wechat",
          providerAccountId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_in
            ? Math.floor(Date.now() / 1000) + tokenData.expires_in
            : undefined,
        },
      })
    }

    // Create session
    await createAndSetSession(userId)

    // Redirect to returnTo
    return NextResponse.redirect(returnTo.startsWith("/") ? `${baseUrl}${returnTo}` : returnTo)
  } catch (err) {
    console.error("[WeChat Callback] Error:", err)
    return NextResponse.redirect(`${baseUrl}/login?error=wechat_error`)
  }
}
