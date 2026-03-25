'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

const ALL_COMUNAS = [
  'Santiago','Providencia','Las Condes','Vitacura','Ñuñoa','La Reina',
  'Macul','San Miguel','La Florida','Puente Alto','Maipú','La Pintana',
  'El Bosque','Lo Espejo','Pedro Aguirre Cerda','Lo Prado','Cerrillos',
  'Estación Central','Quinta Normal','Independencia','Recoleta','Conchalí',
  'Quilicura','Pudahuel','Lo Barnechea','Huechuraba','Renca','Cerro Navia',
  'La Cisterna','San Joaquín','Peñalolén','Las Condes (Alto)',
]

export default function OnboardingPage() {
  const router = useRouter()
  const { update } = useSession()
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggle(comuna: string) {
    setSelected(prev =>
      prev.includes(comuna)
        ? prev.filter(c => c !== comuna)
        : prev.length < 3 ? [...prev, comuna] : prev
    )
  }

  async function handleSubmit() {
    if (selected.length < 3) { setError('Selecciona exactamente 3 comunas.'); return }
    setLoading(true)
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedCommunes: selected }),
    })
    if (res.ok) {
      await update({ onboardingDone: true, selectedCommunes: selected })
      router.push('/dashboard')
    } else {
      setError('Error al guardar. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-[#020617] text-white flex items-center justify-center px-4'>
      <div className='w-full max-w-2xl'>
        <div className='text-center mb-10'>
          <div className='inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-5'>
            <span className='text-2xl'>🗺️</span>
          </div>
          <h1 className='text-3xl font-extrabold mb-2'>¿Qué comunas te interesan?</h1>
          <p className='text-slate-400'>
            Plan Explorador: elige <strong className='text-emerald-400'>3 comunas</strong> para monitorear.
            Puedes cambiarlas en Configuración.
          </p>
        </div>

        <div className='grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-8'>
          {ALL_COMUNAS.map(c => {
            const active = selected.includes(c)
            return (
              <button
                key={c}
                onClick={() => toggle(c)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  active
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-900/60 border-white/[0.07] text-slate-400 hover:border-emerald-500/30 hover:text-white'
                }`}
              >
                {active ? '✓ ' : ''}{c}
              </button>
            )
          })}
        </div>

        <div className='flex items-center justify-between'>
          <p className='text-sm text-slate-500'>{selected.length}/3 seleccionadas</p>
          {error && <p className='text-xs text-red-400'>{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={selected.length < 3 || loading}
            className='bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-semibold px-8 py-3 rounded-full transition text-sm'
          >
            {loading ? 'Guardando...' : 'Continuar al Dashboard →'}
          </button>
        </div>
      </div>
    </div>
  )
}
