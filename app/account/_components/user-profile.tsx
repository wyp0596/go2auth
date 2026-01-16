"use client"

import { useState } from "react"
import type { User } from "next-auth"

export function UserProfile({ user }: { user: User }) {
  const [name, setName] = useState(user.name || "")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  async function handleSave() {
    setSaving(true)
    setMessage("")
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        setMessage("保存成功")
      } else {
        setMessage("保存失败")
      }
    } catch {
      setMessage("保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {user.image ? (
          <img
            src={user.image}
            alt="头像"
            className="w-16 h-16 rounded-full"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
            {(user.name || user.email || "U")[0].toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-medium">{user.name || "未设置昵称"}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          昵称
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        {message && (
          <span className={message === "保存成功" ? "text-green-600" : "text-red-600"}>
            {message}
          </span>
        )}
      </div>
    </div>
  )
}
