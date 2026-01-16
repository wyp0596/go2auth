import { describe, it, expect } from "vitest"
import { generateOtp } from "../otp"

describe("generateOtp", () => {
  it("generates 6-digit string", () => {
    const otp = generateOtp()
    expect(otp).toMatch(/^\d{6}$/)
  })

  it("generates different codes on each call", () => {
    const codes = new Set<string>()
    for (let i = 0; i < 100; i++) {
      codes.add(generateOtp())
    }
    // With 100 calls, we should have at least 90 unique codes (extremely high probability)
    expect(codes.size).toBeGreaterThan(90)
  })

  it("generates codes in valid range (100000-999999)", () => {
    for (let i = 0; i < 100; i++) {
      const otp = generateOtp()
      const num = parseInt(otp, 10)
      expect(num).toBeGreaterThanOrEqual(100000)
      expect(num).toBeLessThanOrEqual(999999)
    }
  })
})
