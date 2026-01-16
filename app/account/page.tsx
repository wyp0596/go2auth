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

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    select: { provider: true, providerAccountId: true },
  })

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-2xl font-semibold mb-8">账号设置</h1>

        <div className="space-y-6">
          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4">基本信息</h2>
            <UserProfile user={session.user} />
          </section>

          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4">已绑定账号</h2>
            <LinkedAccounts accounts={accounts} />
          </section>

          <section className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4">退出登录</h2>
            <SignOutButton />
          </section>
        </div>
      </div>
    </div>
  )
}
