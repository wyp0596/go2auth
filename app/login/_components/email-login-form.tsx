"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"

export function EmailLoginForm({ returnTo, region }: { returnTo: string; region: string }) {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const isCN = region === "CN"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    try {
      await signIn("nodemailer", { email, callbackUrl: returnTo, redirect: false })
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-gray-900 font-medium">
          {isCN ? "验证邮件已发送" : "Verification email sent"}
        </p>
        <p className="text-gray-500 text-sm mt-2">
          {isCN ? `请检查 ${email} 的收件箱` : `Please check your inbox at ${email}`}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {isCN ? "邮箱地址" : "Email address"}
      </label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full mt-4 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (isCN ? "发送中..." : "Sending...") : (isCN ? "发送登录链接" : "Send login link")}
      </button>
    </form>
  )
}
