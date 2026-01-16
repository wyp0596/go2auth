"use client"

import { signIn } from "next-auth/react"

const providerStyles: Record<string, { bg: string; text: string; hover: string }> = {
  google: { bg: "bg-white", text: "text-gray-700", hover: "hover:bg-gray-50" },
  github: { bg: "bg-gray-900", text: "text-white", hover: "hover:bg-gray-800" },
}

export function OAuthButton({
  provider,
  label,
  returnTo,
}: {
  provider: string
  label: string
  returnTo: string
}) {
  const style = providerStyles[provider] || { bg: "bg-gray-100", text: "text-gray-700", hover: "hover:bg-gray-200" }

  return (
    <button
      onClick={() => signIn(provider, { callbackUrl: returnTo })}
      className={`w-full px-4 py-2 border border-gray-300 rounded-md ${style.bg} ${style.text} ${style.hover} transition-colors`}
    >
      {label}
    </button>
  )
}
