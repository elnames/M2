'use client'
import { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { HeatPoint } from '@/components/ui/MapLibreMap'

interface MapProps {
  points?: HeatPoint[]
  height?: string
  className?: string
  zoom?: number
  center?: [number, number]
  interactive?: boolean
  onMapReady?: (map: any) => void
}

const MapLibreMap = dynamic<MapProps>(
  () => import('@/components/ui/MapLibreMap').then(m => m.MapLibreMap),
  { ssr: false, loading: () => <div className='h-full bg-slate-950 rounded-xl flex items-center justify-center text-xs text-slate-600'>Cargando mapa...</div> }
)

// Approximate centers for flyTo
const COMUNA_CENTERS: Record<string, [number, number]> = {
  'Santiago':           [-70.6483, -33.4569],
  'Providencia':        [-70.6130, -33.4372],
  'Las Condes':         [-70.5365, -33.4040],
  'Vitacura':           [-70.5748, -33.3896],
  'Ñuñoa':             [-70.5947, -33.4565],
  'La Reina':           [-70.5355, -33.4463],
  'Macul':              [-70.5765, -33.4833],
  'San Miguel':         [-70.6520, -33.4946],
  'La Florida':         [-70.5888, -33.5236],
  'Puente Alto':        [-70.5752, -33.6102],
  'Maipú':             [-70.7599, -33.5108],
  'La Pintana':         [-70.6199, -33.5832],
  'El Bosque':          [-70.6714, -33.5639],
  'Lo Espejo':          [-70.6913, -33.5178],
  'Pedro Aguirre Cerda':[-70.6769, -33.4951],
  'Cerrillos':          [-70.7217, -33.4932],
  'Estación Central':   [-70.6882, -33.4596],
  'Quinta Normal':      [-70.7017, -33.4341],
  'Independencia':      [-70.6639, -33.4132],
  'Recoleta':           [-70.6431, -33.4116],
  'Conchalí':          [-70.6661, -33.3890],
  'Quilicura':          [-70.7315, -33.3555],
  'Pudahuel':           [-70.7634, -33.4462],
  'Lo Barnechea':       [-70.5119, -33.3497],
  'Huechuraba':         [-70.6416, -33.3595],
  'Renca':              [-70.7100, -33.3961],
  'Cerro Navia':        [-70.7305, -33.4260],
  'La Cisterna':        [-70.6567, -33.5271],
  'San Joaquín':        [-70.6413, -33.4965],
  'Peñalolén':         [-70.5510, -33.4880],
  'Lo Prado':           [-70.7250, -33.4448],
}

interface Props {
  points: HeatPoint[]
  allowedCommunes?: string[] | null
}

export function MapaClient({ points, allowedCommunes }: Props) {
  const [mapRef, setMapRef] = useState<any>(null)
  const [filterComuna, setFilterComuna] = useState('')
  const [filterMinScore, setFilterMinScore] = useState(0)
  const [filterMaxPrice, setFilterMaxPrice] = useState(0)
  const [filterMinPrice, setFilterMinPrice] = useState(0)

  const communeOptions = useMemo(() => {
    if (allowedCommunes) return allowedCommunes
    return [...new Set(points.map(p => p.comuna).filter(Boolean))].sort() as string[]
  }, [points, allowedCommunes])

  const maxPriceInData = useMemo(() => {
    const prices = points.map(p => p.precio_uf ?? 0).filter(v => v > 0 && v < 50000)
    return prices.length ? Math.ceil(Math.max(...prices) / 1000) * 1000 : 10000
  }, [points])

  const filtered = useMemo(() => {
    return points.filter(p => {
      if (filterComuna && p.comuna?.toLowerCase() !== filterComuna.toLowerCase()) return false
      if (filterMinScore > 0 && (p.opportunity_score ?? 0) < filterMinScore) return false
      if (filterMaxPrice > 0 && (p.precio_uf ?? 0) > filterMaxPrice) return false
      if (filterMinPrice > 0 && (p.precio_uf ?? 0) < filterMinPrice) return false
      return true
    })
  }, [points, filterComuna, filterMinScore, filterMaxPrice, filterMinPrice])

  const handleComunaChange = useCallback((comuna: string) => {
    setFilterComuna(comuna)
    if (comuna && mapRef && COMUNA_CENTERS[comuna]) {
      mapRef.flyTo({
        center: COMUNA_CENTERS[comuna],
        zoom: 14,
        duration: 1200,
        essential: true,
      })
    } else if (!comuna && mapRef) {
      mapRef.flyTo({ center: [-70.6476, -33.457], zoom: 13, duration: 1000 })
    }
  }, [mapRef])

  const handleReset = useCallback(() => {
    setFilterComuna('')
    setFilterMinScore(0)
    setFilterMaxPrice(0)
    setFilterMinPrice(0)
    if (mapRef) mapRef.flyTo({ center: [-70.6476, -33.457], zoom: 13, duration: 800 })
  }, [mapRef])

  const hasFilters = filterComuna || filterMinScore > 0 || filterMaxPrice > 0 || filterMinPrice > 0

  return (
    <div className='flex flex-col h-full gap-3'>
      {/* Filter bar */}
      <div className='flex-shrink-0 flex flex-wrap items-center gap-2 px-1'>
        {/* Comuna */}
        <select
          value={filterComuna}
          onChange={e => handleComunaChange(e.target.value)}
          className='bg-slate-800/80 border border-white/[0.07] text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500/50 transition min-w-[140px]'
        >
          <option value=''>Todas las comunas</option>
          {communeOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Min score */}
        <div className='flex items-center gap-2 bg-slate-800/80 border border-white/[0.07] rounded-lg px-3 py-2'>
          <span className='text-xs text-slate-500'>Score min</span>
          <input type='range' min={0} max={95} step={5} value={filterMinScore}
            onChange={e => setFilterMinScore(Number(e.target.value))}
            className='w-20 accent-emerald-500' />
          <span className='text-xs text-emerald-400 font-semibold min-w-[24px]'>
            {filterMinScore > 0 ? filterMinScore : '—'}
          </span>
        </div>

        {/* Max price */}
        <div className='flex items-center gap-2 bg-slate-800/80 border border-white/[0.07] rounded-lg px-3 py-2'>
          <span className='text-xs text-slate-500'>Precio máx</span>
          <input type='range' min={0} max={maxPriceInData} step={500} value={filterMaxPrice}
            onChange={e => setFilterMaxPrice(Number(e.target.value))}
            className='w-20 accent-emerald-500' />
          <span className='text-xs text-emerald-400 font-semibold min-w-[60px]'>
            {filterMaxPrice > 0 ? filterMaxPrice.toLocaleString() + ' UF' : '—'}
          </span>
        </div>

        {/* Count + reset */}
        <div className='flex items-center gap-2 ml-auto'>
          <span className='text-xs text-slate-500'>
            {filtered.length} <span className='text-slate-600'>/ {points.length} prop.</span>
          </span>
          {hasFilters && (
            <button onClick={handleReset}
              className='text-xs text-slate-500 hover:text-red-400 border border-white/[0.07] rounded-lg px-2.5 py-1.5 transition hover:border-red-500/30'>
              ✕ Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className='flex-shrink-0 flex items-center gap-4 px-1'>
        <span className='text-[10px] text-slate-600 uppercase tracking-wider'>Score:</span>
        {[
          { color: '#10b981', label: '< 55' },
          { color: '#34d399', label: '55-70' },
          { color: '#eab308', label: '70-80' },
          { color: '#f59e0b', label: '80-90' },
          { color: '#ef4444', label: '> 90' },
        ].map(({ color, label }) => (
          <div key={label} className='flex items-center gap-1.5'>
            <span className='w-2.5 h-2.5 rounded-full' style={{ background: color }} />
            <span className='text-[10px] text-slate-500'>{label}</span>
          </div>
        ))}
        <span className='text-[10px] text-slate-600 ml-2'>· Hover = score · Click = detalles</span>
      </div>

      {/* Map */}
      <div className='flex-1 overflow-hidden rounded-xl border border-white/[0.07]'>
        <MapLibreMap
          points={filtered}
          height='h-full'
          zoom={13}
          center={[-70.6476, -33.457]}
          interactive={true}
          onMapReady={setMapRef}
        />
      </div>
    </div>
  )
}
