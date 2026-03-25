import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { selectedCommunes } = await req.json()
  if (!Array.isArray(selectedCommunes) || selectedCommunes.length !== 3) {
    return NextResponse.json({ error: 'Selecciona exactamente 3 comunas.' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { selectedCommunes, onboardingDone: true },
  })

  return NextResponse.json({ ok: true })
}
