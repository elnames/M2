'use client'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { WarpShaderBackground } from '@/components/ui/warp-shader'

const stats = [
  { num: '12.4K', label: 'Propiedades analizadas' },
  { num: '847',   label: 'Oportunidades detectadas' },
  { num: '23%',   label: 'Ahorro promedio' },
  { num: '32',    label: 'Comunas cubiertas' },
]

export function Hero() {
  function scrollToSection() {
    document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className='relative overflow-hidden px-6 pt-24 pb-20 text-center min-h-[80vh] flex flex-col justify-center'>
      <WarpShaderBackground />
      <div className='pointer-events-none absolute -top-48 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-emerald-500/[0.05] blur-3xl z-[1]' />

      <div className='relative z-10 max-w-4xl mx-auto'>
        <div className='inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-300 mb-6'>
          <span className='inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse' />
          ML en tiempo real · Santiago, Chile
        </div>

        <h1 className='text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6'>
          Encuentra propiedades<br />
          <span className='bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300 bg-clip-text text-transparent'>
            subvaloradas
          </span><br />
          antes que todos
        </h1>

        <p className='text-lg text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed'>
          Analizamos miles de avisos en PortalInmobiliario y TocToc cada día.
          Nuestro modelo XGBoost calcula el valor justo de cada propiedad y te avisa
          cuando aparece una oportunidad real.
        </p>

        <div className='flex flex-col sm:flex-row gap-4 justify-center mb-16'>
          <Link href='/auth/register'>
            <Button size='lg' className='group'>
              Ver oportunidades ahora
              <span className='ml-2 transition-transform group-hover:translate-x-1'>→</span>
            </Button>
          </Link>
          <Button variant='ghost' size='lg' onClick={scrollToSection}>Cómo funciona</Button>
        </div>

        <div className='mx-auto max-w-2xl grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/[0.07] border border-white/[0.07] rounded-2xl overflow-hidden bg-black/30 backdrop-blur-sm'>
          {stats.map(s => (
            <div key={s.label} className='px-6 py-4 text-center'>
              <div className='text-2xl font-extrabold text-emerald-300'>{s.num}</div>
              <div className='text-xs text-slate-500 mt-0.5'>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
