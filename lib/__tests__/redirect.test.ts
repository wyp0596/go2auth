import { describe, it, expect } from "vitest"
import { isAllowedRedirect, getSafeReturnTo } from "../redirect"

describe("isAllowedRedirect", () => {
  it("allows example.com subdomains", () => {
    expect(isAllowedRedirect("https://app.example.com/path")).toBe(true)
    expect(isAllowedRedirect("https://accounts.example.com")).toBe(true)
    expect(isAllowedRedirect("https://my-app.example.com/callback?foo=bar")).toBe(true)
  })

  it("allows example.cn subdomains", () => {
    expect(isAllowedRedirect("https://app.example.cn/")).toBe(true)
    expect(isAllowedRedirect("https://accounts.example.cn")).toBe(true)
  })

  it("allows localtest.me subdomains", () => {
    expect(isAllowedRedirect("http://accounts.localtest.me:3000")).toBe(true)
    expect(isAllowedRedirect("http://app1.localtest.me:3001/callback")).toBe(true)
  })

  it("rejects non-matching domains", () => {
    expect(isAllowedRedirect("https://evil.com")).toBe(false)
    expect(isAllowedRedirect("https://example.com.evil.com")).toBe(false)
    expect(isAllowedRedirect("https://example.com")).toBe(false) // root domain, not subdomain
    expect(isAllowedRedirect("https://notexample.com")).toBe(false)
  })

  it("rejects invalid URLs", () => {
    expect(isAllowedRedirect("not-a-url")).toBe(false)
    expect(isAllowedRedirect("")).toBe(false)
    expect(isAllowedRedirect("javascript:alert(1)")).toBe(false)
  })
})

describe("getSafeReturnTo", () => {
  it("returns allowed URL as-is", () => {
    expect(getSafeReturnTo("https://app.example.com/dashboard")).toBe("https://app.example.com/dashboard")
  })

  it("returns fallback for disallowed URL", () => {
    expect(getSafeReturnTo("https://evil.com")).toBe("/")
    expect(getSafeReturnTo("https://evil.com", "/home")).toBe("/home")
  })

  it("returns fallback for null/empty", () => {
    expect(getSafeReturnTo(null)).toBe("/")
    expect(getSafeReturnTo(null, "/account")).toBe("/account")
    expect(getSafeReturnTo("")).toBe("/")
  })
})
