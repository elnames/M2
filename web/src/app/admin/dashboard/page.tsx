import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PrismaClient } from '@prisma/client'
import { AdminClient } from './AdminClient'

const prisma = new PrismaClient()
const ENGINE = process.env.DATA_ENGINE_URL ?? 'http://data-engine:3050'

async function getEngineStatus() {
  try {
    const res = await fetch(`${ENGINE}/api/scraper/status`, { cache: 'no-store' })
    return res.json()
  } catch {
    return { running: false, total_properties: 0, oportunidades: 0, diamantes: 0 }
  }
}

export default async function AdminDashboard() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') redirect('/dashboard')

  const [users, engine] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, role: true,
        plan: true, onboardingDone: true, createdAt: true,
        selectedCommunes: true,
      },
    }),
    getEngineStatus(),
  ])

  return (
    <div className='min-h-screen bg-[#020617] text-white p-4 md:p-8'>
      <div className='max-w-6xl mx-auto space-y-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-extrabold'>Panel Admin</h1>
            <p className='text-slate-400 text-sm'>m2.nmsdev.tech</p>
          </div>
          <a href='/dashboard' className='text-xs text-emerald-400 hover:underline'>← Dashboard</a>
        </div>

        {/* Stats de usuarios */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
          {[
            { label: 'Total usuarios',   value: users.length },
            { label: 'Plan Inversor',    value: users.filter(u => u.plan === 'INVERSOR').length },
            { label: 'Plan Explorador',  value: users.filter(u => u.plan === 'EXPLORADOR').length },
            { label: 'Admins',           value: users.filter(u => u.role === 'ADMIN').length },
          ].map(k => (
            <div key={k.label} className='rounded-xl border border-white/[0.07] bg-slate-900/80 p-4'>
              <p className='text-xs uppercase tracking-wider text-slate-500 mb-2'>{k.label}</p>
              <p className='text-3xl font-extrabold text-emerald-300'>{k.value}</p>
            </div>
          ))}
        </div>

        {/* AdminClient: scraper button + tabla de usuarios + modal de edición */}
        <AdminClient users={users as any} engine={engine} />
      </div>
    </div>
  )
}
