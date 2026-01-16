import * as crypto from "crypto"

const ALIYUN_SMS_ENDPOINT = "https://dysmsapi.aliyuncs.com"

interface AliyunResponse {
  Code: string
  Message: string
  RequestId: string
}

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/\+/g, "%20")
    .replace(/\*/g, "%2A")
    .replace(/%7E/g, "~")
}

function sign(params: Record<string, string>, secret: string): string {
  const sortedKeys = Object.keys(params).sort()
  const canonicalized = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join("&")
  const stringToSign = `POST&${percentEncode("/")}&${percentEncode(canonicalized)}`
  const hmac = crypto.createHmac("sha1", secret + "&")
  return hmac.update(stringToSign).digest("base64")
}

export async function sendSms(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const accessKey = process.env.ALIYUN_SMS_ACCESS_KEY
  const secret = process.env.ALIYUN_SMS_SECRET
  const signName = process.env.ALIYUN_SMS_SIGN
  const templateId = process.env.ALIYUN_SMS_TEMPLATE_ID

  if (!accessKey || !secret || !signName || !templateId) {
    console.error("[SMS] Missing Aliyun SMS configuration")
    return { ok: false, error: "SMS not configured" }
  }

  const params: Record<string, string> = {
    AccessKeyId: accessKey,
    Action: "SendSms",
    Format: "JSON",
    PhoneNumbers: phone,
    RegionId: "cn-hangzhou",
    SignName: signName,
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: "1.0",
    TemplateCode: templateId,
    TemplateParam: JSON.stringify({ code }),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    Version: "2017-05-25",
  }

  params.Signature = sign(params, secret)

  const body = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&")

  try {
    const res = await fetch(ALIYUN_SMS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })
    const data: AliyunResponse = await res.json()

    if (data.Code !== "OK") {
      console.error("[SMS] Aliyun error:", data.Code, data.Message)
      return { ok: false, error: data.Message }
    }
    return { ok: true }
  } catch (err) {
    console.error("[SMS] Request failed:", err)
    return { ok: false, error: "Request failed" }
  }
}
