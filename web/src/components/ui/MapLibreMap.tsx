'use client'
import { useEffect, useRef } from 'react'

export interface HeatPoint {
  lat: number; lng: number; intensity: number
  titulo?: string; comuna?: string; precio_uf?: number
  valor_justo_uf?: number; opportunity_score?: number
  tipo?: string; m2?: number; url?: string
}

interface Props {
  points?: HeatPoint[]
  height?: string
  className?: string
  zoom?: number
  center?: [number, number]
  interactive?: boolean
  onMapReady?: (map: any) => void
}

// GeoJSON builder — reutilizado tanto en init como en update reactivo
function toGeoJSON(points: HeatPoint[]): any {
  return {
    type: 'FeatureCollection',
    features: points.map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: {
        intensity:         p.intensity          ?? 0,
        titulo:            p.titulo             ?? null,
        comuna:            p.comuna             ?? null,
        precio_uf:         p.precio_uf          ?? null,
        valor_justo_uf:    p.valor_justo_uf     ?? null,
        opportunity_score: p.opportunity_score  ?? null,
        tipo:              p.tipo               ?? null,
        m2:                p.m2                 ?? null,
        url:               p.url                ?? null,
      },
    })),
  }
}

// Parseo seguro: GeoJSON puede serializar null como la cadena "null"
function safeNum(v: any): number | null {
  if (v == null || v === 'null' || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

function safeStr(v: any): string | null {
  if (v == null || v === 'null' || v === '') return null
  return String(v)
}

export function MapLibreMap({
  points = [],
  height = 'h-60',
  className = '',
  zoom = 11,
  center = [-70.6476, -33.457],
  interactive = true,
  onMapReady,
}: Props) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<any>(null)
  const onReadyRef    = useRef(onMapReady)
  onReadyRef.current  = onMapReady

  // ─── Init map (once) ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    import('maplibre-gl').then(({ default: maplibregl }) => {
      // CSS una sola vez
      if (!document.querySelector('link[href*="maplibre-gl"]')) {
        const link = document.createElement('link')
        link.rel  = 'stylesheet'
        link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'
        document.head.appendChild(link)
      }

      const map = new maplibregl.Map({
        container: containerRef.current!,
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center, zoom, interactive, attributionControl: false,
      })
      mapRef.current = map

      const popup = new maplibregl.Popup({
        closeButton: false, closeOnClick: false,
        className: 'm2-popup', maxWidth: '300px',
      })

      // Estilos popup (una sola vez en el documento)
      if (!document.querySelector('style[data-m2-popup]')) {
        const s = document.createElement('style')
        s.setAttribute('data-m2-popup', '')
        s.textContent = [
          '.m2-popup .maplibregl-popup-content{',
          '  background:#0f172a;border:1px solid rgba(255,255,255,0.1);',
          '  border-radius:12px;padding:12px 14px;',
          '  box-shadow:0 8px 32px rgba(0,0,0,0.5);color:#f1f5f9;}',
          '.m2-popup .maplibregl-popup-tip{border-top-color:#0f172a;}',
        ].join('')
        document.head.appendChild(s)
      }

      map.on('load', () => {
        map.addSource('heatmap', { type: 'geojson', data: toGeoJSON(points) })

        // Capa heatmap (zoom bajo)
        map.addLayer({
          id: 'heatmap-layer', type: 'heatmap', source: 'heatmap', maxzoom: 14,
          paint: {
            'heatmap-weight':     ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 100, 1],
            'heatmap-intensity':  ['interpolate', ['linear'], ['zoom'], 0, 1, 13, 2],
            'heatmap-radius':     ['interpolate', ['linear'], ['zoom'], 0, 15, 13, 30],
            'heatmap-opacity':    ['interpolate', ['linear'], ['zoom'], 12, 0.85, 14, 0],
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0,   'rgba(0,0,0,0)',
              0.2, 'rgba(16,185,129,0.3)',
              0.5, 'rgba(52,211,153,0.6)',
              0.8, 'rgba(110,231,183,0.85)',
              1,   'rgba(167,243,208,1)',
            ],
          },
        })

        // Capa puntos (zoom alto)
        map.addLayer({
          id: 'points-layer', type: 'circle', source: 'heatmap', minzoom: 13,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 6, 16, 12],
            'circle-color': [
              'interpolate', ['linear'], ['get', 'intensity'],
              0,   '#10b981',
              60,  '#34d399',
              80,  '#fbbf24',
              90,  '#f59e0b',
              100, '#ef4444',
            ],
            'circle-opacity': 0.85,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': 'rgba(255,255,255,0.2)',
          },
        })

        // ── Hover tooltip ────────────────────────────────────────────────────
        map.on('mouseenter', 'points-layer', (e: any) => {
          if (!e.features?.length) return
          map.getCanvas().style.cursor = 'pointer'
          const raw   = e.features[0].properties as any
          const coords = (e.features[0].geometry as any).coordinates.slice()

          // Parseo seguro para evitar NaN cuando GeoJSON serializa null→"null"
          const score  = safeNum(raw.opportunity_score)
          const precio = safeNum(raw.precio_uf)
          const justo  = safeNum(raw.valor_justo_uf)
          const m2     = safeNum(raw.m2)
          const titulo = safeStr(raw.titulo)
          const tipo   = safeStr(raw.tipo)
          const comuna = safeStr(raw.comuna)
          const url    = safeStr(raw.url)

          const sc = score != null
            ? (score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#94a3b8')
            : '#94a3b8'

          const parts: string[] = [
            '<div style="font-family:system-ui;font-size:12px;line-height:1.6">',
          ]
          if (titulo) {
            const t = titulo.slice(0, 48) + (titulo.length > 48 ? '…' : '')
            parts.push(`<p style="font-weight:700;color:#f1f5f9;margin:0 0 6px;font-size:13px">${t}</p>`)
          }
          const meta = [tipo, comuna, m2 != null ? `${m2} m²` : null].filter(Boolean)
          if (meta.length) parts.push(`<p style="color:#94a3b8;margin:0 0 4px">${meta.join(' · ')}</p>`)
          if (precio  != null) parts.push(`<p style="color:#f1f5f9;margin:0 0 2px"><span style="color:#94a3b8">Precio:</span> ${precio.toLocaleString('es-CL')} UF</p>`)
          if (justo   != null) parts.push(`<p style="color:#f1f5f9;margin:0 0 6px"><span style="color:#94a3b8">Justo:</span> ${justo.toLocaleString('es-CL')} UF</p>`)
          if (score   != null) parts.push(`<div style="display:flex;align-items:center;gap:6px"><span style="color:#94a3b8">Score</span><span style="color:${sc};font-weight:700;font-size:14px">${Math.round(score)}/100</span></div>`)
          if (url)             parts.push(`<a href="${url}" target="_blank" style="display:inline-block;margin-top:8px;color:#34d399;text-decoration:underline">Ver propiedad →</a>`)
          parts.push('</div>')

          popup.setLngLat(coords).setHTML(parts.join('')).addTo(map)
        })

        map.on('mouseleave', 'points-layer', () => {
          map.getCanvas().style.cursor = ''
          popup.remove()
        })

        map.on('click', 'points-layer', (e: any) => {
          if (!e.features?.length) return
          const url = safeStr((e.features[0].properties as any).url)
          if (url) window.open(url, '_blank')
        })

        // Notificar al padre (MapaClient lo usa para flyTo)
        onReadyRef.current?.(map)
      })
    })

    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Actualizar fuente reactivamente cuando cambia `points` ─────────────────
  // Esto permite que el filtro de comunas en MapaClient funcione sin reiniciar el mapa
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const update = () => {
      const src = map.getSource('heatmap') as any
      if (src?.setData) src.setData(toGeoJSON(points))
    }

    if (map.isStyleLoaded()) {
      update()
    } else {
      map.once('load', update)
    }
  }, [points])

  return (
    <div
      ref={containerRef}
      className={`${height} w-full ${className}`}
      style={{ background: '#020617' }}
    />
  )
}
