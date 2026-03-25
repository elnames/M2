'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string | null
  email: string
  role: string
  plan: string
  onboardingDone: boolean
  createdAt: Date
  selectedCommunes: string[]
}

const SELECT_CLS = [
  'bg-slate-900 border border-white/10 text-slate-200 text-xs rounded-md px-2 py-1',
  'outline-none cursor-pointer',
  'hover:border-emerald-500/50 focus:border-emerald-500',
  'transition-colors appearance-none',
].join(' ')

export function AdminUsersTable({ users }: { users: User[] }) {
  const router = useRouter()
  const [saving, setSaving] = useState<string | null>(null)
  const [pwdRow, setPwdRow] = useState<string | null>(null)
  const [pwdValue, setPwdValue] = useState('')

  async function updateUser(id: string, payload: Record<string, string>) {
    setSaving(id)
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      })
      router.refresh()
    } finally {
      setSaving(null)
    }
  }

  async function deleteUser(id: string, email: string) {
    if (!confirm(`¿Eliminar usuario ${email}? Esta acción no se puede deshacer.`)) return
    setSaving(id)
    try {
      await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setSaving(null)
    }
  }

  async function savePassword(id: string) {
    if (!pwdValue.trim() || pwdValue.length < 6) return
    await updateUser(id, { password: pwdValue })
    setPwdRow(null)
    setPwdValue('')
  }

  return (
    <div className='overflow-x-auto'>
      <table className='w-full'>
        <thead>
          <tr className='border-b border-white/[0.05]'>
            {['Nombre', 'Email', 'Plan', 'Rol', 'Onboarding', 'Comunas', 'Registro', 'Acciones'].map(h => (
              <th key={h} className='px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500'>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className='divide-y divide-white/[0.04]'>
          {users.map(u => (
            <>
              <tr key={u.id} className='hover:bg-white/[0.02]'>
                <td className='px-4 py-3 text-sm font-medium'>{u.name ?? '—'}</td>
                <td className='px-4 py-3 text-sm text-slate-300'>{u.email}</td>

                {/* Plan select */}
                <td className='px-4 py-2'>
                  <select
                    className={SELECT_CLS}
                    value={u.plan}
                    disabled={saving === u.id}
                    onChange={e => updateUser(u.id, { plan: e.target.value })}
                  >
                    <option value='EXPLORADOR'>EXPLORADOR</option>
                    <option value='INVERSOR'>INVERSOR</option>
                  </select>
                </td>

                {/* Role select */}
                <td className='px-4 py-2'>
                  <select
                    className={SELECT_CLS}
                    value={u.role}
                    disabled={saving === u.id}
                    onChange={e => updateUser(u.id, { role: e.target.value })}
                  >
                    <option value='USER'>USER</option>
                    <option value='ADMIN'>ADMIN</option>
                  </select>
                </td>

                <td className='px-4 py-3 text-sm text-slate-400'>{u.onboardingDone ? '✓' : '—'}</td>
                <td className='px-4 py-3 text-xs text-slate-500 max-w-[120px] truncate'>{u.selectedCommunes.join(', ') || '—'}</td>
                <td className='px-4 py-3 text-xs text-slate-500'>{new Date(u.createdAt).toLocaleDateString('es-CL')}</td>

                {/* Actions */}
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() => { setPwdRow(pwdRow === u.id ? null : u.id); setPwdValue('') }}
                      className='text-xs text-slate-400 hover:text-slate-200 transition-colors'
                    >
                      🔑
                    </button>
                    <button
                      onClick={() => deleteUser(u.id, u.email)}
                      disabled={saving === u.id}
                      className='text-xs text-red-500/70 hover:text-red-400 transition-colors disabled:opacity-40'
                    >
                      🗑
                    </button>
                    {saving === u.id && <span className='text-xs text-slate-600'>…</span>}
                  </div>
                </td>
              </tr>

              {/* Inline password row */}
              {pwdRow === u.id && (
                <tr key={u.id + '-pwd'} className='bg-slate-900/60'>
                  <td colSpan={8} className='px-4 py-2'>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs text-slate-500'>Nueva contraseña para {u.email}:</span>
                      <input
                        type='password'
                        placeholder='mín. 6 caracteres'
                        value={pwdValue}
                        onChange={e => setPwdValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && savePassword(u.id)}
                        className='bg-slate-800 border border-white/10 text-slate-200 text-xs rounded-md px-2 py-1 outline-none focus:border-emerald-500 w-48'
                      />
                      <button
                        onClick={() => savePassword(u.id)}
                        disabled={pwdValue.length < 6}
                        className='text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-2 py-1 rounded-md transition-colors'
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => { setPwdRow(null); setPwdValue('') }}
                        className='text-xs text-slate-500 hover:text-slate-300'
                      >
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
