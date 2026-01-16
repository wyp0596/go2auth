import { describe, it, expect } from "vitest"
import { encodeWechatState, decodeWechatState } from "../wechat"

describe("encodeWechatState / decodeWechatState", () => {
  it("round-trips returnTo correctly", () => {
    const returnTo = "https://app.example.com/dashboard?foo=bar"
    const encoded = encodeWechatState(returnTo)
    const decoded = decodeWechatState(encoded)

    expect(decoded).not.toBeNull()
    expect(decoded!.returnTo).toBe(returnTo)
    expect(typeof decoded!.ts).toBe("number")
  })

  it("handles special characters in returnTo", () => {
    const returnTo = "https://app.example.com/path?q=你好&a=1"
    const encoded = encodeWechatState(returnTo)
    const decoded = decodeWechatState(encoded)

    expect(decoded!.returnTo).toBe(returnTo)
  })

  it("encoded state is URL-safe (base64url)", () => {
    const encoded = encodeWechatState("https://example.com/test")
    // base64url should not contain +, /, or =
    expect(encoded).not.toMatch(/[+/=]/)
  })

  it("decodeWechatState returns null for invalid input", () => {
    expect(decodeWechatState("not-valid-base64!!!")).toBeNull()
    expect(decodeWechatState("")).toBeNull()
    // valid base64 but not valid JSON
    expect(decodeWechatState(Buffer.from("not json").toString("base64url"))).toBeNull()
  })
})
