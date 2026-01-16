import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 })
  }

  const { provider } = await request.json()

  // Check if user has at least 2 accounts
  const accountCount = await prisma.account.count({
    where: { userId: session.user.id },
  })

  if (accountCount <= 1) {
    return NextResponse.json(
      { error: "至少保留一种登录方式" },
      { status: 400 }
    )
  }

  await prisma.account.deleteMany({
    where: {
      userId: session.user.id,
      provider,
    },
  })

  return NextResponse.json({ success: true })
}
