import * as crypto from "crypto"

const DYSMSAPI_ENDPOINT = "https://dysmsapi.aliyuncs.com"
const DYPNSAPI_ENDPOINT = "https://dypnsapi.aliyuncs.com"

interface AliyunResponse {
  Code: string
  Message: string
  RequestId: string
}

interface PnvsResponse extends AliyunResponse {
  Model?: {
    VerifyCode?: string
    BizId?: string
  }
}

interface CheckVerifyResponse extends AliyunResponse {
  Model?: {
    VerifyResult?: string
  }
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

async function callAliyunApi(
  endpoint: string,
  params: Record<string, string>,
  secret: string
): Promise<AliyunResponse> {
  params.Signature = sign(params, secret)

  const body = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&")

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  return res.json()
}

export function isPnvsMode(): boolean {
  return process.env.ALIYUN_SMS_MODE === "pnvs"
}

// Legacy mode: SendSms (dysmsapi) - 本地生成验证码
export async function sendSmsLegacy(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
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

  try {
    const data = await callAliyunApi(DYSMSAPI_ENDPOINT, params, secret)
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

// PNVS mode: SendSmsVerifyCode (dypnsapi) - 阿里云生成验证码
export async function sendSmsPnvs(phone: string): Promise<{ ok: boolean; error?: string }> {
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
    Action: "SendSmsVerifyCode",
    CodeLength: "6",
    CodeType: "1", // 纯数字
    Format: "JSON",
    PhoneNumber: phone,
    SignName: signName,
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: "1.0",
    TemplateCode: templateId,
    TemplateParam: "##code##",
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    ValidTime: "300", // 5分钟
    Version: "2017-05-25",
  }

  try {
    const data: PnvsResponse = await callAliyunApi(DYPNSAPI_ENDPOINT, params, secret)
    if (data.Code !== "OK") {
      console.error("[SMS] PNVS error:", data.Code, data.Message)
      return { ok: false, error: data.Message }
    }
    return { ok: true }
  } catch (err) {
    console.error("[SMS] Request failed:", err)
    return { ok: false, error: "Request failed" }
  }
}

// PNVS mode: CheckSmsVerifyCode (dypnsapi) - 阿里云验证
export async function checkSmsPnvs(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const accessKey = process.env.ALIYUN_SMS_ACCESS_KEY
  const secret = process.env.ALIYUN_SMS_SECRET

  if (!accessKey || !secret) {
    console.error("[SMS] Missing Aliyun SMS configuration")
    return { ok: false, error: "SMS not configured" }
  }

  const params: Record<string, string> = {
    AccessKeyId: accessKey,
    Action: "CheckSmsVerifyCode",
    Format: "JSON",
    PhoneNumber: phone,
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: "1.0",
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    VerifyCode: code,
    Version: "2017-05-25",
  }

  try {
    const data: CheckVerifyResponse = await callAliyunApi(DYPNSAPI_ENDPOINT, params, secret)
    if (data.Code !== "OK") {
      console.error("[SMS] PNVS check error:", data.Code, data.Message)
      return { ok: false, error: data.Message }
    }
    if (data.Model?.VerifyResult !== "PASS") {
      return { ok: false, error: "验证码错误" }
    }
    return { ok: true }
  } catch (err) {
    console.error("[SMS] Request failed:", err)
    return { ok: false, error: "Request failed" }
  }
}

// 统一发送入口
export async function sendSms(phone: string, code?: string): Promise<{ ok: boolean; error?: string }> {
  if (isPnvsMode()) {
    return sendSmsPnvs(phone)
  }
  if (!code) {
    return { ok: false, error: "Code required in legacy mode" }
  }
  return sendSmsLegacy(phone, code)
}
