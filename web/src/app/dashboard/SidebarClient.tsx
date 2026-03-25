'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard',               icon: '📊', label: 'Dashboard' },
  { href: '/dashboard/mapa',          icon: '🗺️', label: 'Mapa de Calor' },
  { href: '/dashboard/oportunidades', icon: '💎', label: 'Oportunidades' },
  { href: '/dashboard/alertas',       icon: '🔔', label: 'Alertas' },
  { href: '/dashboard/mercado',       icon: '📈', label: 'Mercado' },
]

const adminItems = [
  { href: '/admin/dashboard', icon: '🛡️', label: 'Panel Admin' },
]

interface Props {
  isAdmin:   boolean
  initials:  string
  name:      string
  planLabel: string
}

export function SidebarClient({ isAdmin, initials, name, planLabel }: Props) {
  const pathname   = usePathname()
  const [open, setOpen] = useState(false)

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const SidebarInner = (
    <aside className='w-56 flex-shrink-0 border-r border-white/[0.06] bg-slate-900/95 flex flex-col h-full'>
      {/* Logo + botón cerrar (mobile) */}
      <div className='px-5 h-14 flex items-center justify-between border-b border-white/[0.06]'>
        <Link href='/dashboard' onClick={() => setOpen(false)}
          className='font-bold text-base bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent'>
          m²
        </Link>
        <button
          onClick={() => setOpen(false)}
          className='md:hidden text-slate-500 hover:text-white text-xl leading-none px-1'
          aria-label='Cerrar menú'>
          ✕
        </button>
      </div>

      {/* Nav */}
      <nav className='flex-1 px-3 py-4 overflow-y-auto space-y-0.5'>
        {navItems.map(item => (
          <Link key={item.href} href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
              isActive(item.href)
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-emerald-500/10'
            }`}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className='pt-4 pb-1 px-3'>
              <p className='text-[10px] font-bold uppercase tracking-widest text-slate-600'>Administración</p>
            </div>
            {adminItems.map(item => (
              <Link key={item.href} href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                  isActive(item.href)
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                    : 'text-slate-400 hover:text-amber-300 hover:bg-amber-500/10'
                }`}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Usuario */}
      <div className='px-3 py-3 border-t border-white/[0.06] space-y-1'>
        <Link href='/dashboard/configuracion'
          onClick={() => setOpen(false)}
          className='flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.05] transition-all duration-150 group'>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            isAdmin
              ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-black'
              : 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-black'
          }`}>
            {initials}
          </div>
          <div className='flex-1 min-w-0'>
            <p className='text-xs font-semibold truncate group-hover:text-white transition-colors'>{name}</p>
            <p className={`text-xs ${isAdmin ? 'text-amber-400' : 'text-emerald-400'}`}>{planLabel}</p>
          </div>
          <span className='text-slate-600 text-xs group-hover:text-slate-400'>⚙️</span>
        </Link>

        <button
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className='w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 text-sm'>
          <span className='text-base'>↩</span>
          <span className='text-xs font-medium'>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* ─── Desktop: sidebar siempre visible ─────────────────────────────── */}
      <div className='hidden md:flex h-full'>
        {SidebarInner}
      </div>

      {/* ─── Mobile: top bar fija con hamburger ───────────────────────────── */}
      <div className='md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center gap-3 px-4
                      bg-slate-900/95 border-b border-white/[0.06] backdrop-blur-md'>
        <button
          onClick={() => setOpen(true)}
          className='text-slate-400 hover:text-white text-xl leading-none'
          aria-label='Abrir menú'>
          ☰
        </button>
        <Link href='/dashboard'
          className='font-bold text-base bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent'>
          m²
        </Link>
      </div>

      {/* ─── Mobile: drawer overlay ───────────────────────────────────────── */}
      {open && (
        <>
          {/* Fondo oscuro */}
          <div
            className='md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm'
            onClick={() => setOpen(false)}
          />
          {/* Panel lateral */}
          <div className='md:hidden fixed inset-y-0 left-0 z-50 flex'>
            {SidebarInner}
          </div>
        </>
      )}
    </>
  )
}
