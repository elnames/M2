import { Card } from '@/components/ui/Card'

const ENGINE = process.env.DATA_ENGINE_URL ?? 'http://data-engine:3050'

async function getAlerts() {
  try {
    const res = await fetch(`${ENGINE}/api/properties/?min_score=70&limit=50`, { next: { revalidate: 60 } })
    return res.json()
  } catch { return [] }
}

export default async function AlertasPage() {
  const alerts = await getAlerts()
  const diamonds = alerts.filter((a: any) => a.opportunity_score >= 80)
  return (
    <>
      <div className='h-14 flex items-center px-6 border-b border-white/[0.06] bg-[#020617]/70 backdrop-blur-md flex-shrink-0'>
        <h1 className='font-semibold text-base'>🔔 Alertas · Oportunidades Detectadas</h1>
        <span className='ml-3 text-xs text-emerald-400'>{diamonds.length} diamantes</span>
      </div>
      <div className='flex-1 overflow-y-auto p-6 space-y-3'>
        {alerts.length === 0 && (
          <div className='text-center text-slate-500 text-sm py-20'>No hay alertas aún · Ejecuta el scraper</div>
        )}
        {alerts.map((a: any, i: number) => (
          <Card key={i} className='p-5'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <div className='flex items-center gap-2 mb-1'>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.opportunity_score >= 80 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {a.opportunity_score >= 80 ? '💎 DIAMANTE' : '⭐ OPORTUNIDAD'}
                  </span>
                  <span className='text-xs text-slate-500'>{a.comuna}</span>
                </div>
                <p className='text-sm font-semibold mb-1'>{a.titulo}</p>
                <p className='text-xs text-slate-400'>{a.m2} m² · {a.tipo}</p>
              </div>
              <div className='text-right flex-shrink-0'>
                <p className='text-lg font-extrabold'>{a.precio_uf?.toLocaleString()} UF</p>
                <p className='text-xs text-emerald-400'>Justo: {a.valor_justo_uf?.toLocaleString()} UF</p>
                <p className='text-xs text-emerald-300 font-semibold'>+{a.diferencia_pct?.toFixed(1)}% bajo mercado</p>
              </div>
            </div>
            {a.url && (
              <div className='mt-3 pt-3 border-t border-white/[0.06]'>
                <a href={a.url} target='_blank' className='text-xs text-emerald-400 hover:underline'>Ver en portal →</a>
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  )
}
