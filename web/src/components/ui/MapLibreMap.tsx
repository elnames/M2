'use client'
import { useEffect, useRef, useCallback } from 'react'

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
}

export function MapLibreMap({
  points = [],
  height = 'h-60',
  className = '',
  zoom = 11,
  center = [-70.6476, -33.457],
  interactive = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    import('maplibre-gl').then(({ default: maplibregl }) => {
      if (!document.querySelector('link[href*="maplibre-gl"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
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
        closeButton: false,
        closeOnClick: false,
        className: 'm2-popup',
        maxWidth: '280px',
      })

      // Popup styles
      const style = document.createElement('style')
      style.textContent = [
        '.m2-popup .maplibregl-popup-content {',
        '  background:#0f172a;border:1px solid rgba(255,255,255,0.1);',
        '  border-radius:12px;padding:12px 14px;',
        '  box-shadow:0 8px 32px rgba(0,0,0,0.5);color:#f1f5f9;',
        '}',
        '.m2-popup .maplibregl-popup-tip{border-top-color:#0f172a;}',
      ].join('')
      document.head.appendChild(style)

      map.on('load', () => {
        if (points.length === 0) return

        const geojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: points.map(p => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
            properties: {
              intensity: p.intensity,
              titulo: p.titulo ?? null,
              comuna: p.comuna ?? null,
              precio_uf: p.precio_uf ?? null,
              valor_justo_uf: p.valor_justo_uf ?? null,
              opportunity_score: p.opportunity_score ?? null,
              tipo: p.tipo ?? null,
              m2: p.m2 ?? null,
              url: p.url ?? null,
            },
          })),
        }

        map.addSource('heatmap', { type: 'geojson', data: geojson })

        map.addLayer({
          id: 'heatmap-layer',
          type: 'heatmap',
          source: 'heatmap',
          maxzoom: 14,
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 100, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 13, 2],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 15, 13, 30],
            'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.85, 14, 0],
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0,0,0,0)',
              0.2, 'rgba(16,185,129,0.3)',
              0.5, 'rgba(52,211,153,0.6)',
              0.8, 'rgba(110,231,183,0.85)',
              1, 'rgba(167,243,208,1)',
            ],
          },
        })

        map.addLayer({
          id: 'points-layer',
          type: 'circle',
          source: 'heatmap',
          minzoom: 13,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 6, 16, 12],
            'circle-color': [
              'interpolate', ['linear'], ['get', 'intensity'],
              0, '#10b981', 60, '#34d399', 80, '#fbbf24', 90, '#f59e0b', 100, '#ef4444',
            ],
            'circle-opacity': 0.85,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': 'rgba(255,255,255,0.2)',
          },
        })

        map.on('mouseenter', 'points-layer', (e) => {
          if (!e.features?.length) return
          map.getCanvas().style.cursor = 'pointer'
          const props = e.features[0].properties as any
          const coords = (e.features[0].geometry as any).coordinates.slice()
          const score = props.opportunity_score
          const sc = score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#94a3b8'

          const parts: string[] = ['<div style="font-family:system-ui;font-size:12px;line-height:1.6">']
          if (props.titulo) {
            const t = props.titulo.slice(0, 45) + (props.titulo.length > 45 ? '…' : '')
            parts.push(`<p style="font-weight:700;color:#f1f5f9;margin:0 0 6px;font-size:13px">${t}</p>`)
          }
          const meta = [props.tipo, props.comuna, props.m2 ? props.m2 + ' m²' : null].filter(Boolean)
          if (meta.length) parts.push(`<p style="color:#94a3b8;margin:0 0 4px">${meta.join(' · ')}</p>`)
          if (props.precio_uf) parts.push(`<p style="color:#f1f5f9;margin:0 0 2px"><span style="color:#94a3b8">Precio:</span> ${Number(props.precio_uf).toLocaleString('es-CL')} UF</p>`)
          if (props.valor_justo_uf) parts.push(`<p style="color:#f1f5f9;margin:0 0 6px"><span style="color:#94a3b8">Justo:</span> ${Number(props.valor_justo_uf).toLocaleString('es-CL')} UF</p>`)
          if (score !== null) parts.push(`<div style="display:flex;align-items:center;gap:6px"><span style="color:#94a3b8">Score</span><span style="color:${sc};font-weight:700;font-size:14px">${Math.round(score)}/100</span></div>`)
          if (props.url && props.url !== 'null') parts.push(`<a href="${props.url}" target="_blank" style="display:inline-block;margin-top:8px;color:#34d399;text-decoration:underline">Ver propiedad →</a>`)
          parts.push('</div>')

          popup.setLngLat(coords).setHTML(parts.join('')).addTo(map)
        })

        map.on('mouseleave', 'points-layer', () => {
          map.getCanvas().style.cursor = ''
          popup.remove()
        })

        map.on('click', 'points-layer', (e) => {
          if (!e.features?.length) return
          const url = (e.features[0].properties as any).url
          if (url && url !== 'null') window.open(url, '_blank')
        })
      })
    })

    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`${height} w-full ${className}`}
      style={{ background: '#020617' }}
    />
  )
}
