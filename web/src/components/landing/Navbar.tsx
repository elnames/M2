'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

const navItems = [
  { label: 'Producto',  href: '/#producto' },
  { label: 'Comunas',   href: '/#comunas' },
  { label: 'Precios',   href: '/#precios' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <nav className='sticky top-0 z-50 border-b border-white/[0.06] bg-[#020617]/80 backdrop-blur-xl'>
      <div className='max-w-7xl mx-auto px-6 h-16 flex items-center justify-between'>
        <Link href='/' className='text-lg font-bold bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent'>
          m²
        </Link>
        <ul className='hidden md:flex items-center gap-8 list-none'>
          {navItems.map(item => (
            <li key={item.label}>
              <a href={item.href} className='text-sm text-slate-400 hover:text-white transition-colors'>{item.label}</a>
            </li>
          ))}
        </ul>
        <div className='hidden md:flex items-center gap-3'>
          <Link href='/auth/login'>
            <Button variant='ghost' size='sm'>Iniciar sesión</Button>
          </Link>
          <Link href='/auth/register'>
            <Button size='sm'>Empezar gratis</Button>
          </Link>
        </div>
        <button className='md:hidden text-slate-400' onClick={() => setOpen(!open)}>☰</button>
      </div>
      {open && (
        <div className='md:hidden px-6 pb-4 flex flex-col gap-3 border-t border-white/[0.06]'>
          {navItems.map(item => (
            <a key={item.label} href={item.href} className='text-sm text-slate-400 py-2' onClick={() => setOpen(false)}>{item.label}</a>
          ))}
          <Link href='/auth/login' className='text-sm text-slate-400 py-2'>Iniciar sesión</Link>
          <Link href='/auth/register'><Button size='sm' className='w-full'>Empezar gratis</Button></Link>
        </div>
      )}
    </nav>
  )
}
