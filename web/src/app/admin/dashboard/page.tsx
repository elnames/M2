import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PrismaClient } from '@prisma/client'
import { Card } from '@/components/ui/Card'
import { AdminUsersTable } from '@/components/admin/AdminUsersTable'
import Link from 'next/link'

const prisma = new PrismaClient()

export default async function AdminDashboard() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') redirect('/dashboard')

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, email: true, role: true,
      plan: true, onboardingDone: true, createdAt: true,
      selectedCommunes: true,
    },
  })

  const stats = {
    total: users.length,
    inversores: users.filter(u => u.plan === 'INVERSOR').length,
    exploradores: users.filter(u => u.plan === 'EXPLORADOR').length,
    admins: users.filter(u => u.role === 'ADMIN').length,
  }

  return (
    <div className='min-h-screen bg-[#020617] text-white p-8'>
      <div className='max-w-6xl mx-auto'>
        <div className='flex items-center justify-between mb-8'>
          <div>
            <h1 className='text-2xl font-extrabold'>Panel Admin</h1>
            <p className='text-slate-400 text-sm'>m2.nmsdev.tech</p>
          </div>
          <Link href='/dashboard' className='text-xs text-emerald-400 hover:underline'>← Dashboard</Link>
        </div>

        {/* KPIs */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
          {[
            { label: 'Total usuarios', value: stats.total },
            { label: 'Plan Inversor', value: stats.inversores },
            { label: 'Plan Explorador', value: stats.exploradores },
            { label: 'Admins', value: stats.admins },
          ].map(k => (
            <Card key={k.label} className='p-5'>
              <p className='text-xs uppercase tracking-wider text-slate-500 mb-2'>{k.label}</p>
              <p className='text-3xl font-extrabold text-emerald-300'>{k.value}</p>
            </Card>
          ))}
        </div>

        {/* Users table with inline editing */}
        <Card className='overflow-hidden'>
          <div className='px-5 py-4 border-b border-white/[0.06] flex items-center justify-between'>
            <h2 className='text-sm font-semibold'>Usuarios registrados</h2>
            <span className='text-xs text-slate-500'>Plan y Rol editables inline · 🔑 cambiar contraseña · 🗑 eliminar</span>
          </div>
          <AdminUsersTable users={users} />
        </Card>
      </div>
    </div>
  )
}
