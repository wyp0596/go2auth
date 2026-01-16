"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"

export function EmailLoginForm({ returnTo }: { returnTo: string }) {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

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
      <div className="text-center py-4">
        <p className="text-green-600 font-medium">验证邮件已发送</p>
        <p className="text-gray-500 text-sm mt-2">请检查 {email} 的收件箱</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        邮箱地址
      </label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "发送中..." : "发送登录链接"}
      </button>
    </form>
  )
}
