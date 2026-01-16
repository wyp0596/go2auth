import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 })
  }

  const { name } = await request.json()

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name },
  })

  return NextResponse.json({ success: true })
}
