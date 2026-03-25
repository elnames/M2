'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/Card'

const PLAN_LABELS: Record<string, string> = {
  INVERSOR:   'Plan Inversor ✓',
  EXPLORADOR: 'Plan Explorador',
}

export default function ConfiguracionPage() {
  const { data: session } = useSession()
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/auth/set-password')
      .then(r => r.json())
      .then(d => setHasPassword(d.hasPassword))
      .catch(() => setHasPassword(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('idle')
    setMessage('')
    if (newPassword.length < 8) {
      setMessage('La contraseña debe tener al menos 8 caracteres.')
      setStatus('error')
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage('Las contraseñas no coinciden.')
      setStatus('error')
      return
    }
    setStatus('loading')
    const res = await fetch('/api/auth/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: hasPassword ? currentPassword : undefined, newPassword }),
    })
    const data = await res.json()
    if (res.ok) {
      setStatus('ok')
      setMessage(hasPassword ? 'Contraseña actualizada correctamente.' : 'Contraseña creada. Ya puedes iniciar sesión con email y contraseña.')
      setHasPassword(true)
      setNewPassword('')
      setConfirmPassword('')
      setCurrentPassword('')
    } else {
      setStatus('error')
      setMessage(data.error ?? 'Error al guardar la contraseña.')
    }
  }

  const user = session?.user as any
  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase() ?? 'U'
  const isAdmin = user?.role === 'ADMIN'
  const planLabel = isAdmin ? 'Administrador' : (PLAN_LABELS[user?.plan] ?? 'Plan Explorador')
  const planColor = isAdmin ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'

  return (
    <>
      <div className='h-14 flex items-center px-6 border-b border-white/[0.06] bg-[#020617]/70 backdrop-blur-md flex-shrink-0'>
        <h1 className='font-semibold text-base'>⚙️ Configuración de Cuenta</h1>
      </div>
      <div className='flex-1 overflow-y-auto p-6 max-w-xl'>
        <Card className='p-6 mb-4'>
          <div className='flex items-center gap-4'>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-black ${isAdmin ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-emerald-400 to-emerald-600'}`}>
              {initials}
            </div>
            <div>
              <p className='font-semibold text-base'>{user?.name ?? 'Usuario'}</p>
              <p className='text-sm text-slate-400'>{user?.email}</p>
              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${planColor}`}>{planLabel}</span>
            </div>
          </div>
        </Card>

        <Card className='p-6'>
          <h2 className='text-sm font-semibold mb-1'>
            {hasPassword === null ? 'Cargando...' : hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}
          </h2>
          {hasPassword === false && (
            <p className='text-xs text-slate-400 mb-4'>Iniciaste sesión con enlace mágico. Puedes añadir una contraseña para acceder también con email + contraseña.</p>
          )}
          {hasPassword === true && (
            <p className='text-xs text-slate-400 mb-4'>Ingresa tu contraseña actual y la nueva.</p>
          )}
          {hasPassword !== null && (
            <form onSubmit={handleSubmit} className='space-y-3'>
              {hasPassword && (
                <div>
                  <label className='text-xs text-slate-400 mb-1 block'>Contraseña actual</label>
                  <input type='password' value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required
                    className='w-full px-4 py-2.5 rounded-xl bg-white/[0.07] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500/50 transition'
                    placeholder='••••••••' />
                </div>
              )}
              <div>
                <label className='text-xs text-slate-400 mb-1 block'>Nueva contraseña</label>
                <input type='password' value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8}
                  className='w-full px-4 py-2.5 rounded-xl bg-white/[0.07] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500/50 transition'
                  placeholder='Mínimo 8 caracteres' />
              </div>
              <div>
                <label className='text-xs text-slate-400 mb-1 block'>Confirmar contraseña</label>
                <input type='password' value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                  className='w-full px-4 py-2.5 rounded-xl bg-white/[0.07] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500/50 transition'
                  placeholder='Repite la contraseña' />
              </div>
              {status === 'error' && <p className='text-xs text-red-400'>{message}</p>}
              {status === 'ok'    && <p className='text-xs text-emerald-400'>{message}</p>}
              <button type='submit' disabled={status === 'loading'}
                className='w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold px-5 py-2.5 rounded-full shadow transition text-sm mt-2'>
                {status === 'loading' ? 'Guardando...' : hasPassword ? 'Actualizar contraseña' : 'Crear contraseña'}
              </button>
            </form>
          )}
        </Card>
      </div>
    </>
  )
}
