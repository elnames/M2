'use client'
import { useState } from 'react'

interface User {
  id: string; name: string | null; email: string | null
  plan: string; role: string; onboardingDone: boolean
  selectedCommunes: string[]; createdAt: string
}

interface EngineStatus {
  running?: boolean; total_properties?: number
  oportunidades?: number; diamantes?: number; last_run_at?: string
}

interface Props {
  users: User[]
  engine: EngineStatus
}

export function AdminClient({ users: initialUsers, engine: initialEngine }: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [engine, setEngine] = useState(initialEngine)
  const [scraperLoading, setScraperLoading] = useState(false)
  const [editModal, setEditModal] = useState<User | null>(null)
  const [editPlan, setEditPlan] = useState('')
  const [editRole, setEditRole] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function pollStatus() {
    const res = await fetch('/api/scraper/status')
    const data = await res.json()
    setEngine(data)
    return data.running
  }

  async function runScraper() {
    setScraperLoading(true)
    try {
      await fetch('/api/scraper/status', { method: 'POST' })
      setEngine(e => ({ ...e, running: true }))
      const interval = setInterval(async () => {
        const still = await pollStatus()
        if (!still) clearInterval(interval)
      }, 8000)
    } finally {
      setScraperLoading(false)
    }
  }

  function openEdit(user: User) {
    setEditModal(user)
    setEditPlan(user.plan)
    setEditRole(user.role)
    setNewPassword('')
    setMsg('')
  }

  async function saveEdit() {
    if (!editModal) return
    setSaving(true)
    setMsg('')
    try {
      const body: any = { plan: editPlan, role: editRole }
      if (newPassword.length >= 8) body.password = newPassword
      const res = await fetch(`/api/admin/users/${editModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        setUsers(us => us.map(u => u.id === editModal.id ? { ...u, plan: editPlan, role: editRole } : u))
        setMsg('Guardado correctamente')
        setTimeout(() => setEditModal(null), 800)
      } else {
        setMsg(data.error ?? 'Error al guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  async function deleteUser(userId: string, email: string | null) {
    if (!confirm(`¿Eliminar usuario ${email}? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers(us => us.filter(u => u.id !== userId))
    } else {
      alert('Error al eliminar usuario')
    }
  }

  const lastRun = engine.last_run_at
    ? new Date(engine.last_run_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <>
      {/* Scraper control card */}
      <div>
        <p className='text-xs font-bold uppercase tracking-widest text-slate-500 mb-3'>Control del Scraper</p>
        <div className='rounded-xl border border-white/[0.07] bg-slate-900/80 p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <p className='text-sm font-semibold mb-0.5'>
                {engine.running ? '🟢 Ejecutándose...' : `⚪ Inactivo${lastRun ? ` · Última vez: ${lastRun}` : ''}`}
              </p>
              <p className='text-xs text-slate-500'>El scraper actualiza datos para todos los usuarios</p>
            </div>
            <button
              onClick={runScraper}
              disabled={engine.running || scraperLoading}
              className='bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-sm px-4 py-2 rounded-lg transition'
            >
              {engine.running ? (
                <><span className='inline-block w-2 h-2 rounded-full bg-black animate-pulse mr-2' />Scrapeando…</>
              ) : '▶ Ejecutar Scraping'}
            </button>
          </div>
          <div className='grid grid-cols-3 gap-3 text-center'>
            <div className='bg-white/[0.03] rounded-lg p-3'>
              <p className='text-xs text-slate-500 mb-1'>Propiedades</p>
              <p className='text-xl font-bold text-white'>{engine.total_properties?.toLocaleString() ?? '0'}</p>
            </div>
            <div className='bg-white/[0.03] rounded-lg p-3'>
              <p className='text-xs text-slate-500 mb-1'>Oportunidades</p>
              <p className='text-xl font-bold text-emerald-300'>{engine.oportunidades ?? '0'}</p>
            </div>
            <div className='bg-white/[0.03] rounded-lg p-3'>
              <p className='text-xs text-slate-500 mb-1'>Diamantes</p>
              <p className='text-xl font-bold text-amber-300'>💎 {engine.diamantes ?? '0'}</p>
            </div>
          </div>
          <p className='text-xs text-slate-600 mt-3'>⏰ Scraping automático diario configurado (04:00 AM)</p>
        </div>
      </div>

      {/* User table */}
      <div className='rounded-xl border border-white/[0.07] bg-slate-900/80 overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-white/[0.05]'>
                {['Nombre','Email','Plan','Rol','Onboarding','Registro','Acciones'].map(h => (
                  <th key={h} className='px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500'>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-white/[0.04]'>
              {users.map(u => (
                <tr key={u.id} className='hover:bg-white/[0.02]'>
                  <td className='px-4 py-3 text-sm font-medium'>{u.name ?? '-'}</td>
                  <td className='px-4 py-3 text-sm text-slate-300 max-w-[180px] truncate'>{u.email}</td>
                  <td className='px-4 py-3'>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.plan === 'INVERSOR' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>{u.plan}</span>
                  </td>
                  <td className='px-4 py-3'>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'}`}>{u.role}</span>
                  </td>
                  <td className='px-4 py-3 text-sm text-slate-400'>{u.onboardingDone ? '✓' : '-'}</td>
                  <td className='px-4 py-3 text-xs text-slate-500'>{new Date(u.createdAt).toLocaleDateString('es-CL')}</td>
                  <td className='px-4 py-3'>
                    <div className='flex items-center gap-2'>
                      <button onClick={() => openEdit(u)}
                        className='text-xs text-emerald-400 hover:underline border border-emerald-500/20 rounded px-2 py-0.5 hover:border-emerald-500/50 transition'>
                        Editar
                      </button>
                      <button onClick={() => deleteUser(u.id, u.email)}
                        className='text-xs text-red-400 hover:underline border border-red-500/20 rounded px-2 py-0.5 hover:border-red-500/50 transition'>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editModal && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4' onClick={() => setEditModal(null)}>
          <div className='bg-slate-900 border border-white/[0.1] rounded-2xl p-6 w-full max-w-md' onClick={e => e.stopPropagation()}>
            <h2 className='text-base font-bold mb-1'>Editar usuario</h2>
            <p className='text-xs text-slate-500 mb-5'>{editModal.email}</p>

            <div className='space-y-4'>
              <div>
                <label className='text-xs text-slate-400 mb-1.5 block'>Plan</label>
                <select value={editPlan} onChange={e => setEditPlan(e.target.value)}
                  className='w-full bg-white/[0.07] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none'>
                  <option value='EXPLORADOR'>EXPLORADOR</option>
                  <option value='INVERSOR'>INVERSOR</option>
                </select>
              </div>
              <div>
                <label className='text-xs text-slate-400 mb-1.5 block'>Rol</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value)}
                  className='w-full bg-white/[0.07] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none'>
                  <option value='USER'>USER</option>
                  <option value='ADMIN'>ADMIN</option>
                </select>
              </div>
              <div>
                <label className='text-xs text-slate-400 mb-1.5 block'>Nueva contraseña (opcional)</label>
                <input type='password' value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder='Dejar vacío para no cambiar'
                  className='w-full bg-white/[0.07] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-emerald-500/50 transition' />
              </div>

              {msg && <p className={`text-xs ${msg.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{msg}</p>}

              <div className='flex gap-3 pt-1'>
                <button onClick={() => setEditModal(null)}
                  className='flex-1 bg-white/[0.07] hover:bg-white/[0.1] text-white text-sm font-semibold py-2.5 rounded-xl transition'>
                  Cancelar
                </button>
                <button onClick={saveEdit} disabled={saving}
                  className='flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-sm font-semibold py-2.5 rounded-xl transition'>
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
