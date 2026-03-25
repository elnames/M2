import Link from 'next/link'
import { Button } from '@/components/ui/Button'

const plans = [
  {
    name: 'Explorador', price: '$0', period: 'Gratis para siempre',
    features: ['10 consultas/día', 'Mapa de calor básico', 'Hasta 3 comunas a elección', 'Opportunity Score visible'],
    cta: 'Registrarse gratis', popular: false,
  },
  {
    name: 'Inversor', price: '9', period: 'USD/mes · Cancela cuando quieras',
    features: ['Consultas ilimitadas', 'Alertas Diamante en tiempo real', 'Las 32 comunas de Santiago', 'Exportación CSV', 'API access'],
    cta: 'Empezar ahora', popular: true,
  },
]

export function Pricing() {
  return (
    <section id='precios' className='px-6 py-20'>
      <div className='max-w-3xl mx-auto'>
        <p className='text-center text-xs font-bold uppercase tracking-widest text-emerald-500 mb-3'>Planes</p>
        <h2 className='text-center text-4xl font-extrabold mb-4'>Simple y transparente</h2>
        <p className='text-center text-slate-400 mb-14'>Empieza gratis. Escala cuando lo necesites.</p>
        <div className='grid md:grid-cols-2 gap-6'>
          {plans.map(p => (
            <div key={p.name} className={'relative rounded-2xl border p-8 ' + (p.popular ? 'border-emerald-500 bg-gradient-to-b from-emerald-500/[0.08] to-transparent' : 'border-white/[0.07] bg-slate-900/80')}>
              {p.popular && (
                <div className='absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-xs font-bold px-4 py-1 rounded-full'>
                  Más popular
                </div>
              )}
              <p className='text-sm text-slate-400 mb-1'>{p.name}</p>
              <div className='text-4xl font-extrabold mb-0.5 text-emerald-300'>{p.price}</div>
              <p className='text-xs text-slate-500 mb-6'>{p.period}</p>
              <ul className='space-y-2 mb-8'>
                {p.features.map(f => (
                  <li key={f} className='text-sm text-slate-300 flex items-center gap-2'>
                    <span className='text-emerald-400 font-bold'>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href='/auth/register' className='block'>
                <Button variant={p.popular ? 'primary' : 'ghost'} className='w-full'>{p.cta}</Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
