import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@nmsdev.tech' } })
  if (existing) {
    console.log('Admin already exists.')
    return
  }
  const hashed = await bcrypt.hash('Interestelar01!', 12)
  await prisma.user.create({
    data: {
      name: 'Admin NMSDev',
      email: 'admin@nmsdev.tech',
      password: hashed,
      role: 'ADMIN',
      plan: 'INVERSOR',
      onboardingDone: true,
      selectedCommunes: [],
    },
  })
  console.log('Admin created: admin@nmsdev.tech')
}

main().catch(console.error).finally(() => prisma.$disconnect())
