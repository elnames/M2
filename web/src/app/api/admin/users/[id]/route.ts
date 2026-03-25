import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function requireAdmin() {
  const session = await auth()
  const user = session?.user as any
  if (!user || user.role !== 'ADMIN') return null
  return user
}

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, context: RouteContext) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  const body = await req.json()
  const { plan, role, password } = body

  const update: any = {}
  if (plan && ['EXPLORADOR', 'INVERSOR'].includes(plan)) update.plan = plan
  if (role && ['USER', 'ADMIN'].includes(role)) update.role = role
  if (password && password.length >= 8) {
    update.password = await bcrypt.hash(password, 12)
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Sin cambios válidos' }, { status: 400 })
  }

  const updated = await prisma.user.update({ where: { id }, data: update })
  return NextResponse.json({ ok: true, id: updated.id })
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params

  if (id === admin.id) {
    return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })
  }

  await prisma.account.deleteMany({ where: { userId: id } })
  await prisma.session.deleteMany({ where: { userId: id } })
  await prisma.user.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
