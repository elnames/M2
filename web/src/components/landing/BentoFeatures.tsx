'use client'
import { ScoreBadge } from '@/components/ui/Badge'
import dynamic from 'next/dynamic'

const MapLibreMap = dynamic(
  () => import('@/components/ui/MapLibreMap').then(m => m.MapLibreMap),
  { ssr: false, loading: () => <div className='w-full h-full bg-slate-950 rounded-xl' /> }
)

const scoreItems = [
  { label: 'Macul · Depto 3D/2B · 68m²', score: 87 },
  { label: 'Ñuñoa · Casa · 120m²', score: 73 },
]

const DEMO_POINTS = [
  { lat: -33.4326, lng: -70.6121, intensity: 72 },
  { lat: -33.4912, lng: -70.5901, intensity: 85 },
  { lat: -33.4570, lng: -70.5985, intensity: 70 },
  { lat: -33.4569, lng: -70.6483, intensity: 60 },
  { lat: -33.4986, lng: -70.6549, intensity: 65 },
  { lat: -33.5260, lng: -70.5992, intensity: 55 },
  { lat: -33.5098, lng: -70.7588, intensity: 50 },
  { lat: -33.3900, lng: -70.5656, intensity: 78 },
  { lat: -33.3784, lng: -70.5868, intensity: 80 },
  { lat: -33.4142, lng: -70.5741, intensity: 76 },
]

export function BentoFeatures() {
  return (
    <section id='producto' className='px-6 py-20'>
      <div className='max-w-6xl mx-auto'>
        <p className='text-center text-xs font-bold uppercase tracking-widest text-emerald-500 mb-3'>Funcionalidades</p>
        <h2 className='text-center text-4xl md:text-5xl font-extrabold mb-4'>Todo lo que necesitas para<br />invertir con datos</h2>
        <p className='text-center text-slate-400 max-w-lg mx-auto mb-14'>De los datos brutos a la decisión de compra, sin pasos manuales.</p>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {/* Opportunity Score — col-span-2, row 1 */}
          <div className='md:col-span-2 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.07] to-teal-500/[0.04] p-6 transition-all duration-300 hover:border-emerald-500/40'>
            <div className='w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center text-xl mb-5'>🤖</div>
            <h3 className='text-lg font-bold mb-2'>Opportunity Score™</h3>
            <p className='text-sm text-slate-400 leading-relaxed mb-5'>
              Nuestro modelo XGBoost analiza m², habitaciones, antigüedad, comuna y tendencia de mercado
              para calcular el valor justo. El Score (0–100) mide cuánto está por debajo del precio real.
            </p>
            <div className='space-y-3'>
              {scoreItems.map(item => (
                <div key={item.label}>
                  <div className='flex justify-between items-center mb-1.5'>
                    <span className='text-xs text-slate-400'>{item.label}</span>
                    <ScoreBadge score={item.score} />
                  </div>
                  <div className='h-1.5 rounded-full bg-slate-800 overflow-hidden'>
                    <div className='h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all' style={{ width: item.score + '%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mapa de Calor — col 3, rows 1+2 con altura fija */}
          <div className='md:row-span-2 rounded-2xl border border-white/[0.07] bg-slate-900/80 p-6 flex flex-col transition-all duration-300 hover:border-emerald-500/30 hover:-translate-y-1'>
            <div className='w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center text-xl mb-5'>🗺️</div>
            <h3 className='text-lg font-bold mb-2'>Mapa de Calor</h3>
            <p className='text-sm text-slate-400 leading-relaxed mb-5'>
              Visualiza en tiempo real qué zonas tienen mayor concentración de oportunidades.
              Filtros por comuna, precio y score.
            </p>
            {/* El mapa ocupa todo el espacio restante */}
            <div className='flex-1 min-h-[260px] rounded-xl overflow-hidden border border-white/[0.07]'>
              <MapLibreMap
                points={DEMO_POINTS}
                height='h-full'
                zoom={10}
                center={[-70.64, -33.46]}
                interactive={false}
              />
            </div>
          </div>

          {/* Alertas y Scraping — row 2, cols 1-2 */}
          {[
            { icon: '🔔', title: 'Alertas Diamante', desc: 'Score >80 + Cap Rate >6% → email automático al instante via Resend.' },
            { icon: '🕷️', title: 'Scraping Diario', desc: 'PortalInmobiliario y TocToc, 32 comunas, cada 24h. Datos frescos.' },
          ].map(f => (
            <div key={f.title} className='rounded-2xl border border-white/[0.07] bg-slate-900/80 p-6 transition-all duration-300 hover:border-emerald-500/30 hover:-translate-y-1'>
              <div className='w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center text-xl mb-5'>{f.icon}</div>
              <h3 className='text-lg font-bold mb-2'>{f.title}</h3>
              <p className='text-sm text-slate-400 leading-relaxed'>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
