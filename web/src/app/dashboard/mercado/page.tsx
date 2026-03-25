import { Card } from '@/components/ui/Card'

const ENGINE = process.env.DATA_ENGINE_URL ?? 'http://data-engine:3050'

async function getStats() {
  try {
    const res = await fetch(`${ENGINE}/api/scraper/status`, { cache: 'no-store' })
    return res.json()
  } catch { return {} }
}

async function getTop() {
  try {
    const res = await fetch(`${ENGINE}/api/valuations/top-oportunidades?limit=100`, { next: { revalidate: 300 } })
    return res.json()
  } catch { return [] }
}

export default async function MercadoPage() {
  const [stats, props] = await Promise.all([getStats(), getTop()])

  const comunas: string[] = [...new Set<string>(props.map((p: any) => p.comuna as string))]
  const byComuna = comunas.map(c => {
    const list = props.filter((p: any) => p.comuna === c)
    const avgScore = list.reduce((a: number, p: any) => a + p.opportunity_score, 0) / list.length
    const avgPrecio = list.reduce((a: number, p: any) => a + p.precio_uf, 0) / list.length
    return { comuna: c, count: list.length, avgScore: Math.round(avgScore), avgPrecio: Math.round(avgPrecio) }
  }).sort((a, b) => b.avgScore - a.avgScore)

  return (
    <>
      <div className='h-14 flex items-center px-6 border-b border-white/[0.06] bg-[#020617]/70 backdrop-blur-md flex-shrink-0'>
        <h1 className='font-semibold text-base'>📈 Mercado · Análisis por Comuna</h1>
      </div>
      <div className='flex-1 overflow-y-auto p-6'>
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
          {[
            { label: 'Total propiedades', value: stats.total_properties?.toLocaleString() ?? '0' },
            { label: 'Oportunidades (≥70)', value: stats.oportunidades ?? '0' },
            { label: 'Diamantes (≥80)', value: stats.diamantes ?? '0' },
            { label: 'Comunas analizadas', value: comunas.length },
          ].map(k => (
            <Card key={k.label} className='p-5'>
              <p className='text-xs uppercase tracking-wider text-slate-500 mb-2'>{k.label}</p>
              <p className='text-2xl font-extrabold text-emerald-300'>{k.value}</p>
            </Card>
          ))}
        </div>
        <Card className='overflow-hidden'>
          <div className='px-5 py-4 border-b border-white/[0.06]'>
            <h2 className='text-sm font-semibold'>Ranking por Score Promedio</h2>
          </div>
          <div className='divide-y divide-white/[0.04]'>
            {byComuna.map((c, i) => (
              <div key={c.comuna} className='flex items-center gap-4 px-5 py-4'>
                <span className='text-slate-600 text-sm w-6'>{i + 1}</span>
                <div className='flex-1'>
                  <p className='text-sm font-semibold'>{c.comuna}</p>
                  <p className='text-xs text-slate-500'>{c.count} propiedades · Precio prom: {c.avgPrecio.toLocaleString()} UF</p>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='w-32 h-1.5 rounded-full bg-slate-800'>
                    <div className='h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300' style={{ width: c.avgScore + '%' }} />
                  </div>
                  <span className='text-sm font-bold text-emerald-300 w-8 text-right'>{c.avgScore}</span>
                </div>
              </div>
            ))}
            {byComuna.length === 0 && (
              <div className='px-5 py-12 text-center text-slate-500 text-sm'>Sin datos · Ejecuta el scraper</div>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}
