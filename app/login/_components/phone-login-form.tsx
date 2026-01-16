"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export function PhoneLoginForm({ returnTo }: { returnTo: string }) {
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [step, setStep] = useState<"phone" | "code">("phone")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    if (!phone || loading) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/phone/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "发送失败")
        return
      }

      setStep("code")
      setCountdown(60)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!code || loading) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, returnTo }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "验证失败")
        return
      }

      router.push(data.redirect || "/account")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (countdown > 0 || loading) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/phone/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "发送失败")
        return
      }

      setCountdown(60)
    } finally {
      setLoading(false)
    }
  }

  if (step === "code") {
    return (
      <form onSubmit={handleVerify}>
        <div className="text-center mb-4">
          <p className="text-sm text-gray-500">
            验证码已发送至 <span className="font-medium text-gray-900">{phone}</span>
          </p>
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            更换手机号
          </button>
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-2">
          验证码
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="请输入6位验证码"
          required
          autoFocus
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-center text-xl tracking-widest"
        />

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full mt-4 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "验证中..." : "登录"}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0 || loading}
          className="w-full mt-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-400"
        >
          {countdown > 0 ? `${countdown}秒后可重新发送` : "重新发送验证码"}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSendCode}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        手机号
      </label>
      <div className="flex">
        <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-lg text-sm">
          +86
        </span>
        <input
          type="tel"
          inputMode="numeric"
          pattern="1[3-9]\d{9}"
          maxLength={11}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          placeholder="请输入手机号"
          required
          className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading || phone.length !== 11}
        className="w-full mt-4 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "发送中..." : "获取验证码"}
      </button>
    </form>
  )
}
