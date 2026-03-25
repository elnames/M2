'use client'
import { useState, useMemo, useEffect } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { ScoreBadge } from '@/components/ui/Badge'
import { MapWrapper } from '@/components/map/MapWrapper'

const PAGE_SIZE = 10

interface Property {
  id: number
  titulo: string
  precio_uf: number
  m2: number
  comuna: string
  tipo: string
  opportunity_score: number
  valor_justo_uf: number
  diferencia_pct: number
  url: string
}

interface HeatPoint {
  lat: number
  lng: number
  intensity: number
  comuna?: string
  titulo?: string
  precio_uf?: number
  url?: string
}

interface Alert {
  opportunity_score: number
  comuna: string
  precio_uf: number
  valor_justo_uf: number
  titulo: string
  url: string
}

interface Props {
  properties: Property[]
  heatmapPoints: HeatPoint[]
  alerts: Alert[]
  status: {
    running: boolean
    total_properties: number
    oportunidades: number
    diamantes: number
  }
}

function uniqueComunas(properties: Property[]): string[] {
  const set = new Set(properties.map(p => p.comuna).filter(Boolean))
  return Array.from(set).sort()
}

export function DashboardInteractive({ properties, heatmapPoints, alerts, status }: Props) {
  const [selectedComuna, setSelectedComuna] = useState<string>('')
  const [page, setPage] = useState(0)

  const comunas = useMemo(() => uniqueComunas(properties), [properties])

  const filteredProperties = useMemo(() =>
    selectedComuna
      ? properties.filter(p => p.comuna?.toLowerCase() === selectedComuna.toLowerCase())
      : properties,
    [properties, selectedComuna]
  )

  const filteredPoints = useMemo(() =>
    selectedComuna
      ? heatmapPoints.filter(p => p.comuna?.toLowerCase() === selectedComuna.toLowerCase())
      : heatmapPoints,
    [heatmapPoints, selectedComuna]
  )

  // Resetear página al cambiar filtro
  useEffect(() => { setPage(0) }, [selectedComuna])

  const totalPages     = Math.max(1, Math.ceil(filteredProperties.length / PAGE_SIZE))
  const pageProperties = useMemo(
    () => filteredProperties.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredProperties, page]
  )

  const avgScore = filteredProperties.length > 0
    ? Math.round(filteredProperties.reduce((a, p) => a + (p.opportunity_score ?? 0), 0) / filteredProperties.length)
    : null

  const kpis = [
    {
      label: 'Propiedades analizadas',
      value: selectedComuna ? filteredProperties.length.toLocaleString() : status.total_properties?.toLocaleString() ?? '0',
      change: selectedComuna ? `En ${selectedComuna}` : 'Total en base de datos',
    },
    {
      label: 'Oportunidades activas',
      value: filteredProperties.filter(p => p.opportunity_score >= 70).length.toString(),
      change: 'Score ≥ 70',
    },
    {
      label: 'Diamantes detectados',
      value: `💎 ${filteredProperties.filter(p => p.opportunity_score >= 80).length}`,
      change: 'Score ≥ 80',
    },
    {
      label: 'Avg. Opportunity Score',
      value: avgScore !== null ? avgScore.toString() : '—',
      change: selectedComuna ? `Top en ${selectedComuna}` : 'Top propiedades',
    },
  ]

  return (
    <>
      {/* Header con filtro */}
      <div className='h-14 flex items-center justify-between px-4 md:px-6 border-b border-white/[0.06] bg-[#020617]/70 backdrop-blur-md flex-shrink-0'>
        <h1 className='font-semibold text-sm md:text-base truncate'>Dashboard · Resumen General</h1>
        <div className='flex items-center gap-2.5 flex-shrink-0'>
          <select
            value={selectedComuna}
            onChange={e => setSelectedComuna(e.target.value)}
            className='bg-slate-800 border border-white/[0.07] text-slate-300 text-xs rounded-lg px-2 md:px-3 py-1.5 outline-none cursor-pointer hover:border-emerald-500/40 transition-colors max-w-[130px] md:max-w-none'
          >
            <option value=''>Todas las comunas</option>
            {comunas.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto p-4 md:p-6'>
        {/* KPIs */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6'>
          {kpis.map(k => (
            <Card key={k.label} className='p-4 md:p-5'>
              <p className='text-[10px] md:text-xs uppercase tracking-wider text-slate-500 mb-2'>{k.label}</p>
              <p className='text-xl md:text-2xl font-extrabold mb-1'>{k.value}</p>
              <p className='text-xs text-emerald-400'>{k.change}</p>
            </Card>
          ))}
        </div>

        {/* Mapa + Alertas */}
        <div className='grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6'>
          <Card className='lg:col-span-2 overflow-hidden'>
            <CardHeader>
              <span className='text-sm font-semibold'>🗺️ Mapa de Calor</span>
              <a href='/dashboard/mapa' className='text-xs text-emerald-400 hover:underline'>Ver completo →</a>
            </CardHeader>
            <MapWrapper
              points={filteredPoints}
              height='h-52 md:h-60'
              flyToCommune={selectedComuna || null}
            />
          </Card>

          <Card className='lg:col-span-3 overflow-hidden'>
            <CardHeader>
              <span className='text-sm font-semibold'>🔔 Alertas Recientes</span>
              <span className='text-xs text-emerald-400'>En tiempo real</span>
            </CardHeader>
            <div className='divide-y divide-white/[0.05] max-h-52 md:max-h-60 overflow-y-auto'>
              {alerts.length > 0 ? alerts.map((a, i) => (
                <div key={i} className='flex items-start gap-3 px-4 md:px-5 py-3.5'>
                  <span className='mt-1.5 w-2 h-2 rounded-full flex-shrink-0 bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' />
                  <div className='min-w-0'>
                    <p className='text-xs md:text-sm leading-snug'>
                      💎 Score <strong>{a.opportunity_score}/100</strong> — {a.comuna} · {a.precio_uf?.toLocaleString()} UF
                    </p>
                    <p className='text-xs text-slate-500 mt-0.5 truncate'>
                      <a href={a.url} target='_blank' rel='noreferrer' className='text-emerald-500 hover:underline'>{a.titulo?.slice(0, 50)}</a>
                    </p>
                  </div>
                </div>
              )) : (
                <div className='px-5 py-8 text-center text-sm text-slate-500'>
                  No hay diamantes aún · Ejecuta el scraper para detectar oportunidades
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Tabla de oportunidades con paginación */}
        <Card className='overflow-hidden'>
          <CardHeader>
            <span className='text-sm font-semibold'>
              📋 Tabla de Oportunidades
              {selectedComuna ? ` · ${selectedComuna}` : ` · Top ${filteredProperties.length} por Score`}
            </span>
            <div className='flex items-center gap-3'>
              <span className='text-xs text-slate-500'>{filteredProperties.length} propiedades</span>
            </div>
          </CardHeader>

          <div className='overflow-x-auto'>
            <table className='w-full min-w-[640px]'>
              <thead>
                <tr className='border-b border-white/[0.05]'>
                  {['Propiedad', 'Comuna', 'Tipo', 'm²', 'Precio', 'Valor Justo', 'Dif%', 'Score', ''].map(h => (
                    <th key={h} className='px-4 py-3 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500'>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-white/[0.04]'>
                {pageProperties.map((p, i) => {
                  const difPct = p.diferencia_pct != null && !isNaN(Number(p.diferencia_pct))
                    ? Number(p.diferencia_pct)
                    : null

                  return (
                    <tr key={i} className='hover:bg-white/[0.02] transition-colors'>
                      <td className='px-4 py-3 text-sm font-medium max-w-[180px] truncate' title={p.titulo}>{p.titulo || '—'}</td>
                      <td className='px-4 py-3 text-sm text-slate-300'>{p.comuna || '—'}</td>
                      <td className='px-4 py-3 text-sm text-slate-400'>{p.tipo || '—'}</td>
                      <td className='px-4 py-3 text-sm text-slate-400'>{p.m2 ? `${p.m2} m²` : '—'}</td>
                      <td className='px-4 py-3 text-sm whitespace-nowrap'>{p.precio_uf ? `${p.precio_uf.toLocaleString()} UF` : '—'}</td>
                      <td className='px-4 py-3 text-sm whitespace-nowrap'>{p.valor_justo_uf ? `${p.valor_justo_uf.toLocaleString()} UF` : '—'}</td>
                      <td className='px-4 py-3 text-sm font-semibold text-emerald-400'>
                        {difPct != null ? `${difPct > 0 ? '+' : ''}${difPct.toFixed(1)}%` : '—'}
                      </td>
                      <td className='px-4 py-3'><ScoreBadge score={Math.round(p.opportunity_score ?? 0)} /></td>
                      <td className='px-4 py-3'>
                        {p.url
                          ? <a href={p.url} target='_blank' rel='noreferrer' className='text-xs text-emerald-400 hover:underline whitespace-nowrap'>Ver →</a>
                          : <span className='text-xs text-slate-600'>—</span>
                        }
                      </td>
                    </tr>
                  )
                })}
                {pageProperties.length === 0 && (
                  <tr>
                    <td colSpan={9} className='px-4 py-12 text-center text-slate-500 text-sm'>
                      {selectedComuna ? `Sin propiedades en ${selectedComuna}` : 'Sin datos · Ejecuta el scraper para poblar la tabla'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {filteredProperties.length > PAGE_SIZE && (
            <div className='flex items-center justify-between px-4 py-3 border-t border-white/[0.05]'>
              <span className='text-xs text-slate-500'>
                Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredProperties.length)} de {filteredProperties.length}
              </span>
              <div className='flex gap-2'>
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className='text-xs px-2.5 py-1.5 rounded border border-white/[0.07] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition'>
                  ← Anterior
                </button>
                <span className='text-xs text-slate-600 self-center px-1'>
                  {page + 1} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className='text-xs px-2.5 py-1.5 rounded border border-white/[0.07] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition'>
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
