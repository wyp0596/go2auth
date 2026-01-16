"use client"

import { signIn } from "next-auth/react"

const providerNames: Record<string, string> = {
  google: "Google",
  github: "GitHub",
  nodemailer: "Email",
}

export function LinkedAccounts({
  accounts,
  region,
}: {
  accounts: { provider: string; providerAccountId: string }[]
  region: string
}) {
  const hasGoogle = !!(process.env.NEXT_PUBLIC_HAS_GOOGLE)
  const hasGitHub = !!(process.env.NEXT_PUBLIC_HAS_GITHUB)
  const isCN = region === "CN"

  const linkedProviders = accounts.map((a) => a.provider)

  async function handleUnlink(provider: string) {
    if (accounts.length <= 1) {
      alert(isCN ? "至少保留一种登录方式" : "Keep at least one login method")
      return
    }
    const confirmMsg = isCN
      ? `确定解绑 ${providerNames[provider] || provider}？`
      : `Unlink ${providerNames[provider] || provider}?`
    if (!confirm(confirmMsg)) return

    await fetch("/api/user/unlink", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    })
    window.location.reload()
  }

  return (
    <div className="space-y-3">
      {accounts.length === 0 ? (
        <p className="text-gray-500">{isCN ? "暂无绑定账号" : "No linked accounts"}</p>
      ) : (
        accounts.map((account) => (
          <div
            key={account.provider}
            className="flex items-center justify-between py-2 border-b border-gray-100"
          >
            <span>{providerNames[account.provider] || account.provider}</span>
            <button
              onClick={() => handleUnlink(account.provider)}
              className="text-sm text-red-600 hover:text-red-700"
            >
              {isCN ? "解绑" : "Unlink"}
            </button>
          </div>
        ))
      )}

      {/* Bind buttons for unlinked providers */}
      <div className="pt-4 space-y-2">
        {hasGoogle && !linkedProviders.includes("google") && (
          <button
            onClick={() => signIn("google", { callbackUrl: "/account" })}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {isCN ? "+ 绑定 Google" : "+ Link Google"}
          </button>
        )}
        {hasGitHub && !linkedProviders.includes("github") && (
          <button
            onClick={() => signIn("github", { callbackUrl: "/account" })}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {isCN ? "+ 绑定 GitHub" : "+ Link GitHub"}
          </button>
        )}
      </div>
    </div>
  )
}
