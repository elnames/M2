import { Card } from '@/components/ui/Card'
import { ScoreBadge } from '@/components/ui/Badge'

const ENGINE = process.env.DATA_ENGINE_URL ?? 'http://data-engine:3050'

async function getOportunidades() {
  try {
    const res = await fetch(`${ENGINE}/api/valuations/top-oportunidades?limit=50`, { next: { revalidate: 120 } })
    return res.json()
  } catch { return [] }
}

export default async function OportunidadesPage() {
  const properties = await getOportunidades()
  return (
    <>
      <div className='h-14 flex items-center px-6 border-b border-white/[0.06] bg-[#020617]/70 backdrop-blur-md flex-shrink-0'>
        <h1 className='font-semibold text-base'>💎 Oportunidades · Top 50 por Score</h1>
        <span className='ml-3 text-xs text-slate-500'>{properties.length} propiedades</span>
      </div>
      <div className='flex-1 overflow-y-auto p-6'>
        <Card className='overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b border-white/[0.05]'>
                  {['Propiedad','Comuna','Tipo','m²','Precio','Valor Justo','Dif%','Score',''].map(h => (
                    <th key={h} className='px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500'>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-white/[0.04]'>
                {properties.map((p: any, i: number) => (
                  <tr key={i} className='hover:bg-white/[0.02] transition-colors'>
                    <td className='px-4 py-3 text-sm font-medium max-w-[200px] truncate' title={p.titulo}>{p.titulo}</td>
                    <td className='px-4 py-3 text-sm text-slate-300'>{p.comuna}</td>
                    <td className='px-4 py-3 text-sm text-slate-400'>{p.tipo}</td>
                    <td className='px-4 py-3 text-sm text-slate-400'>{p.m2}</td>
                    <td className='px-4 py-3 text-sm'>{p.precio_uf?.toLocaleString()} UF</td>
                    <td className='px-4 py-3 text-sm'>{p.valor_justo_uf?.toLocaleString()} UF</td>
                    <td className='px-4 py-3 text-sm font-semibold text-emerald-400'>+{p.diferencia_pct?.toFixed(1)}%</td>
                    <td className='px-4 py-3'><ScoreBadge score={Math.round(p.opportunity_score)} /></td>
                    <td className='px-4 py-3'><a href={p.url} target='_blank' className='text-xs text-emerald-400 hover:underline'>Ver →</a></td>
                  </tr>
                ))}
                {properties.length === 0 && (
                  <tr><td colSpan={9} className='px-4 py-12 text-center text-slate-500 text-sm'>Sin datos aún</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  )
}
