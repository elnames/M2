'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const MapLibreMap = dynamic(
  () => import('@/components/ui/MapLibreMap').then(m => m.MapLibreMap),
  { ssr: false, loading: () => null }
)

// Puntos de oportunidad ficticios sobre Santiago para el fondo
const BG_POINTS = [
  { lat: -33.4326, lng: -70.6121, intensity: 72 },
  { lat: -33.4912, lng: -70.5901, intensity: 90 },
  { lat: -33.4570, lng: -70.5985, intensity: 70 },
  { lat: -33.4569, lng: -70.6483, intensity: 60 },
  { lat: -33.4986, lng: -70.6549, intensity: 75 },
  { lat: -33.5260, lng: -70.5992, intensity: 55 },
  { lat: -33.5098, lng: -70.7588, intensity: 50 },
  { lat: -33.3900, lng: -70.5656, intensity: 85 },
  { lat: -33.3784, lng: -70.5868, intensity: 80 },
  { lat: -33.4142, lng: -70.5741, intensity: 76 },
  { lat: -33.4680, lng: -70.6350, intensity: 68 },
  { lat: -33.4420, lng: -70.6600, intensity: 73 },
  { lat: -33.5150, lng: -70.6200, intensity: 82 },
  { lat: -33.4800, lng: -70.5700, intensity: 65 },
  { lat: -33.4250, lng: -70.5850, intensity: 88 },
  { lat: -33.4600, lng: -70.7000, intensity: 58 },
  { lat: -33.5400, lng: -70.6800, intensity: 62 },
  { lat: -33.4050, lng: -70.6300, intensity: 79 },
]

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePassword() {
    setError('')
    if (!email || !password) { setError('Ingresa email y contraseña.'); return }
    setLoading(true)
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.error) { setError('Email o contraseña incorrectos.'); return }
    router.push('/dashboard')
  }

  async function handleMagic() {
    setError('')
    if (!email) { setError('Ingresa tu email.'); return }
    setLoading(true)
    await signIn('resend', { email, callbackUrl: '/dashboard', redirect: false })
    setLoading(false)
    setInfo('Enlace enviado. Revisa tu correo y haz clic en el link.')
  }

  return (
    <div className='min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-[#020617]'>

      {/* Mapa de Santiago como fondo — no interactivo */}
      <div className='absolute inset-0 z-0'>
        <MapLibreMap
          points={BG_POINTS}
          height='h-full'
          zoom={12}
          center={[-70.6476, -33.457]}
          interactive={false}
        />
      </div>

      {/* Overlay oscuro para que el card resalte */}
      <div className='absolute inset-0 z-[1] bg-[#020617]/70' />

      {/* Glow central */}
      <div className='pointer-events-none absolute inset-0 flex items-center justify-center z-[2]'>
        <div className='w-[500px] h-[500px] rounded-full bg-emerald-500/[0.06] blur-3xl' />
      </div>

      {/* Login card */}
      <div className='relative z-10 w-full max-w-sm rounded-3xl border border-white/[0.10] bg-gradient-to-b from-slate-900/95 to-[#020617]/98 backdrop-blur-xl shadow-2xl p-8 flex flex-col items-center'>
        <div className='flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 mb-5 shadow-lg'>
          <span className='text-emerald-300 text-lg font-black'>m²</span>
        </div>
        <h2 className='text-xl font-semibold text-white mb-1 text-center'>Iniciar sesión</h2>
        <p className='text-sm text-slate-400 text-center mb-6'>Accede a tus oportunidades inmobiliarias</p>

        <div className='flex w-full rounded-xl bg-slate-800/60 p-1 mb-6 gap-1'>
          <button
            onClick={() => { setTab('password'); setError(''); setInfo('') }}
            className={'flex-1 text-xs py-2 rounded-lg font-medium transition ' + (tab === 'password' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200')}
          >
            Contraseña
          </button>
          <button
            onClick={() => { setTab('magic'); setError(''); setInfo('') }}
            className={'flex-1 text-xs py-2 rounded-lg font-medium transition ' + (tab === 'magic' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200')}
          >
            Enlace mágico
          </button>
        </div>

        <div className='flex flex-col w-full gap-3'>
          <input
            placeholder='tu@email.com'
            type='email'
            value={email}
            onChange={e => setEmail(e.target.value)}
            className='w-full px-4 py-3 rounded-xl bg-white/[0.07] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.10] transition'
          />
          {tab === 'password' && (
            <input
              placeholder='Contraseña'
              type='password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePassword()}
              className='w-full px-4 py-3 rounded-xl bg-white/[0.07] border border-white/[0.08] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.10] transition'
            />
          )}
          {error && <p className='text-xs text-red-400'>{error}</p>}
          {info  && <p className='text-xs text-emerald-400'>{info}</p>}
          <button
            onClick={() => tab === 'password' ? handlePassword() : handleMagic()}
            disabled={loading}
            className='w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold px-5 py-3 rounded-full shadow transition text-sm mt-1'
          >
            {loading ? 'Cargando...' : tab === 'password' ? 'Ingresar' : 'Enviar enlace mágico'}
          </button>
          <hr className='border-white/[0.06] my-1' />
          <p className='text-xs text-slate-400 text-center'>
            ¿No tienes cuenta?{' '}
            <a href='/auth/register' className='text-emerald-400 hover:text-emerald-300 underline'>
              Regístrate gratis
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
