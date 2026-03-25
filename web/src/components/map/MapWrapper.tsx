'use client'
import dynamic from 'next/dynamic'

const MapLeaflet = dynamic(
  () => import('./MapLeaflet').then(m => m.MapLeaflet),
  {
    ssr: false,
    loading: () => (
      <div className='h-full bg-slate-950 flex items-center justify-center text-xs text-slate-600'>
        Cargando mapa...
      </div>
    ),
  }
)

interface HeatPoint {
  lat: number; lng: number; intensity: number; comuna?: string
  titulo?: string; precio_uf?: number; url?: string
}

interface Props {
  points: HeatPoint[]
  height?: string
  flyToCommune?: string | null
}

export function MapWrapper({ points, height, flyToCommune }: Props) {
  return <MapLeaflet points={points} height={height} flyToCommune={flyToCommune} />
}
