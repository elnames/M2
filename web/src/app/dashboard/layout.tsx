import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SidebarClient } from './SidebarClient'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/auth/login')

  const user = session.user as any
  const isAdmin = user.role === 'ADMIN'
  const initials = user.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U'
  const planLabel = isAdmin ? 'Admin' : user.plan === 'INVERSOR' ? 'Plan Inversor ✓' : 'Plan Explorador'

  return (
    <div className='flex h-screen bg-[#020617] text-white overflow-hidden'>
      <SidebarClient
        isAdmin={isAdmin}
        initials={initials}
        name={user.name ?? user.email ?? ''}
        planLabel={planLabel}
      />
      <div className='flex-1 flex flex-col overflow-hidden'>
        {children}
      </div>
    </div>
  )
}
