'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    setError('')
    if (!name || !email || !password) { setError('Completa todos los campos.'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error al registrarse.'); setLoading(false); return }
    await signIn('credentials', { email, password, callbackUrl: '/dashboard', redirect: true })
  }

  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-[#020617] px-4 relative overflow-hidden'>
      <div className='pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/[0.06] blur-3xl' />
      <div className='relative z-10 w-full max-w-sm rounded-3xl border border-white/[0.08] bg-gradient-to-b from-slate-900/90 to-[#020617]/90 backdrop-blur-sm shadow-2xl p-8 flex flex-col items-center'>
        <div className='flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-5'>
          <span className='text-emerald-400 text-xl font-bold'>K</span>
        </div>
        <h2 className='text-xl font-semibold text-white mb-1 text-center'>Crear cuenta</h2>
        <p className='text-sm text-slate-400 text-center mb-6'>Empieza a detectar oportunidades hoy</p>
        <div className='flex flex-col w-full gap-3'>
          <input placeholder='Tu nombre' type='text' value={name} onChange={e => setName(e.target.value)}
            className='w-full px-4 py-3 rounded-xl bg-white/[0.07] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500/50 transition' />
          <input placeholder='tu@email.com' type='email' value={email} onChange={e => setEmail(e.target.value)}
            className='w-full px-4 py-3 rounded-xl bg-white/[0.07] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500/50 transition' />
          <input placeholder='Contraseña (mín. 8 caracteres)' type='password' value={password} onChange={e => setPassword(e.target.value)}
            className='w-full px-4 py-3 rounded-xl bg-white/[0.07] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500/50 transition' />
          <input placeholder='Confirmar contraseña' type='password' value={confirm} onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRegister()}
            className='w-full px-4 py-3 rounded-xl bg-white/[0.07] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500/50 transition' />
          {error && <p className='text-xs text-red-400'>{error}</p>}
          <button onClick={handleRegister} disabled={loading}
            className='w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold px-5 py-3 rounded-full shadow transition text-sm mt-1'>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
          <hr className='border-white/[0.06] my-1' />
          <p className='text-xs text-slate-400 text-center'>
            ¿Ya tienes cuenta?{' '}
            <a href='/auth/login' className='text-emerald-400 hover:text-emerald-300 underline'>Iniciar sesión</a>
          </p>
        </div>
      </div>
    </div>
  )
}
