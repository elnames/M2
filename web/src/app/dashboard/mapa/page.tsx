import { auth } from '@/lib/auth'
import { MapaClient } from './MapaClient'

const ENGINE = process.env.DATA_ENGINE_URL ?? 'http://data-engine:3050'

async function getHeatmap() {
  try {
    const res = await fetch(`${ENGINE}/api/properties/heatmap?limit=800`, { next: { revalidate: 120 } })
    return res.json()
  } catch { return [] }
}

export default async function MapaPage() {
  const session = await auth()
  const user = session?.user as any
  const isExplorador = user?.plan === 'EXPLORADOR'
  const allowedCommunes: string[] | null = isExplorador && Array.isArray(user?.selectedCommunes) && user.selectedCommunes.length > 0
    ? user.selectedCommunes : null

  let heatmapPoints = await getHeatmap()

  if (allowedCommunes) {
    const allowed = allowedCommunes.map((c: string) => c.toLowerCase())
    heatmapPoints = heatmapPoints.filter((p: any) => allowed.includes(p.comuna?.toLowerCase()))
  }

  return (
    <>
      <div className='h-14 flex items-center px-6 border-b border-white/[0.06] bg-[#020617]/70 backdrop-blur-md flex-shrink-0'>
        <h1 className='font-semibold text-base'>🗺️ Mapa de Calor · Santiago</h1>
        <span className='ml-3 text-xs text-slate-500'>{heatmapPoints.length} propiedades</span>
        {allowedCommunes && (
          <span className='ml-3 text-xs text-slate-600'>· {allowedCommunes.join(', ')}</span>
        )}
      </div>
      <div className='flex-1 overflow-hidden p-4'>
        <MapaClient points={heatmapPoints} allowedCommunes={allowedCommunes} />
      </div>
    </>
  )
}
