import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { UserProfile } from "./_components/user-profile"
import { LinkedAccounts } from "./_components/linked-accounts"
import { SignOutButton } from "./_components/sign-out-button"

export default async function AccountPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const region = process.env.REGION || "GLOBAL"
  const isCN = region === "CN"

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    select: { provider: true, providerAccountId: true },
  })

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-semibold mb-8">
          {isCN ? "账号设置" : "Account Settings"}
        </h1>

        <div className="space-y-6">
          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4">
              {isCN ? "基本信息" : "Profile"}
            </h2>
            <UserProfile user={session.user} region={region} />
          </section>

          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4">
              {isCN ? "已绑定账号" : "Linked Accounts"}
            </h2>
            <LinkedAccounts accounts={accounts} region={region} />
          </section>

          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4">
              {isCN ? "退出登录" : "Sign Out"}
            </h2>
            <SignOutButton region={region} />
          </section>
        </div>
      </div>
    </div>
  )
}
