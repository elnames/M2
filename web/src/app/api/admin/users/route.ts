import { auth } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

// PATCH /api/admin/users  — update plan, role, or password
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard) return guard

  const { id, plan, role, password } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const data: Record<string, any> = {}
  if (plan) data.plan = plan
  if (role) data.role = role
  if (password) data.password = await bcrypt.hash(password, 10)

  await prisma.user.update({ where: { id }, data })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/users?id=xxx
export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard) return guard

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
