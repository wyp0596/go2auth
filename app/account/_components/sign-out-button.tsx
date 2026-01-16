"use client"

import { signOut } from "next-auth/react"

export function SignOutButton({ region }: { region: string }) {
  const isCN = region === "CN"

  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
    >
      {isCN ? "退出登录" : "Sign out"}
    </button>
  )
}
