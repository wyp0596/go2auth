const WECHAT_AUTH_URL = "https://open.weixin.qq.com/connect/qrconnect"
const WECHAT_TOKEN_URL = "https://api.weixin.qq.com/sns/oauth2/access_token"
const WECHAT_USERINFO_URL = "https://api.weixin.qq.com/sns/userinfo"

interface WechatTokenResponse {
  access_token?: string
  expires_in?: number
  refresh_token?: string
  openid?: string
  scope?: string
  unionid?: string
  errcode?: number
  errmsg?: string
}

interface WechatUserInfo {
  openid: string
  nickname: string
  sex: number
  province: string
  city: string
  country: string
  headimgurl: string
  privilege: string[]
  unionid?: string
}

export function getWechatAuthUrl(redirectUri: string, state: string): string {
  const appid = process.env.NEXT_PUBLIC_WECHAT_APPID || process.env.WECHAT_APPID
  if (!appid) throw new Error("WECHAT_APPID not configured")

  const params = new URLSearchParams({
    appid,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "snsapi_login",
    state,
  })
  return `${WECHAT_AUTH_URL}?${params.toString()}#wechat_redirect`
}

export async function getWechatAccessToken(code: string): Promise<WechatTokenResponse> {
  const appid = process.env.WECHAT_APPID
  const secret = process.env.WECHAT_SECRET

  if (!appid || !secret) {
    throw new Error("WeChat credentials not configured")
  }

  const params = new URLSearchParams({
    appid,
    secret,
    code,
    grant_type: "authorization_code",
  })

  const res = await fetch(`${WECHAT_TOKEN_URL}?${params.toString()}`)
  const data: WechatTokenResponse = await res.json()

  if (data.errcode) {
    console.error("[WeChat] Token error:", data.errcode, data.errmsg)
    throw new Error(data.errmsg || "WeChat token error")
  }

  return data
}

export async function getWechatUserInfo(accessToken: string, openid: string): Promise<WechatUserInfo> {
  const params = new URLSearchParams({
    access_token: accessToken,
    openid,
  })

  const res = await fetch(`${WECHAT_USERINFO_URL}?${params.toString()}`)
  const data = await res.json()

  if (data.errcode) {
    console.error("[WeChat] UserInfo error:", data.errcode, data.errmsg)
    throw new Error(data.errmsg || "WeChat userinfo error")
  }

  return data as WechatUserInfo
}

export function encodeWechatState(returnTo: string): string {
  // Use base64url encoding for state to include returnTo
  const payload = JSON.stringify({ returnTo, ts: Date.now() })
  return Buffer.from(payload).toString("base64url")
}

export function decodeWechatState(state: string): { returnTo: string; ts: number } | null {
  try {
    // Handle base64url encoding (browser's btoa variant)
    const base64 = state.replace(/-/g, "+").replace(/_/g, "/")
    const payload = Buffer.from(base64, "base64").toString("utf-8")
    return JSON.parse(payload)
  } catch {
    return null
  }
}
