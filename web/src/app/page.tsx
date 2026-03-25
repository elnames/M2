import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/landing/Navbar'
import { Hero } from '@/components/landing/Hero'
import { BentoFeatures } from '@/components/landing/BentoFeatures'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Pricing } from '@/components/landing/Pricing'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

const COMUNAS = [
  'Santiago','Providencia','Las Condes','Vitacura','Ñuñoa','La Reina',
  'Macul','San Miguel','La Florida','Puente Alto','Maipú','La Pintana',
  'El Bosque','Lo Espejo','Pedro Aguirre Cerda','Cerrillos','Estación Central',
  'Quinta Normal','Independencia','Recoleta','Conchalí','Quilicura',
  'Pudahuel','Lo Barnechea','Huechuraba','Renca','Cerro Navia',
  'La Cisterna','San Joaquín','Peñalolén','Lo Prado',
]

export default async function LandingPage() {
  const session = await auth()
  if (session?.user) redirect('/dashboard')

  return (
    <div className='min-h-screen bg-[#020617] text-white'>
      <Navbar />
      <main>
        <Hero />
        <BentoFeatures />
        <HowItWorks />

        <section id='comunas' className='px-6 py-20 border-y border-white/[0.06]'>
          <div className='max-w-5xl mx-auto'>
            <p className='text-center text-xs font-bold uppercase tracking-widest text-emerald-500 mb-3'>Cobertura</p>
            <h2 className='text-center text-4xl font-extrabold mb-4'>Las 32 comunas de Santiago</h2>
            <p className='text-center text-slate-400 max-w-lg mx-auto mb-12'>
              Plan Explorador: monitorea <span className='text-emerald-400 font-semibold'>3 comunas a tu elección</span>.
              Plan Inversor: acceso a <span className='text-emerald-400 font-semibold'>todas las comunas</span> en tiempo real.
            </p>
            <div className='flex flex-wrap gap-2 justify-center'>
              {COMUNAS.map(c => (
                <span key={c} className='text-xs px-3 py-1.5 rounded-full bg-slate-900 border border-white/[0.07] text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 transition-colors'>
                  {c}
                </span>
              ))}
            </div>
            <div className='text-center mt-10'>
              <Link href='/auth/register'>
                <Button size='lg'>Empezar gratis — elige tus 3 comunas</Button>
              </Link>
            </div>
          </div>
        </section>

        <Pricing />

        <section className='px-6 py-24 text-center border-t border-white/[0.06] bg-gradient-to-b from-emerald-500/[0.04] to-transparent'>
          <h2 className='text-4xl md:text-5xl font-extrabold mb-4'>
            Listo para invertir con{' '}
            <span className='bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent'>ventaja</span>?
          </h2>
          <p className='text-slate-400 mb-10 text-lg'>Únete a inversores que ya usan datos para tomar mejores decisiones.</p>
          <Link href='/auth/register'>
            <Button size='lg' className='group'>
              Crear cuenta gratis
              <span className='ml-2 transition-transform group-hover:translate-x-1'>→</span>
            </Button>
          </Link>
        </section>
      </main>

      <footer className='px-6 py-8 border-t border-white/[0.06]'>
        <div className='max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6'>
          <Link href='/' className='text-base font-bold bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent'>
            m²
          </Link>
          <p className='text-sm text-slate-500'>© 2025 NMSDev · m2.nmsdev.tech</p>
          <div className='flex items-center gap-6 text-sm text-slate-600'>
            <Link href='/auth/login' className='hover:text-slate-400 transition'>Iniciar sesión</Link>
            <Link href='/auth/register' className='hover:text-slate-400 transition'>Crear cuenta</Link>
            <a href='/#comunas' className='hover:text-slate-400 transition'>Comunas</a>
            <a href='/#precios' className='hover:text-slate-400 transition'>Precios</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
