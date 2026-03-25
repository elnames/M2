'use client'
import { useEffect, useRef } from 'react'

interface HeatPoint {
  lat: number
  lng: number
  intensity: number
  comuna?: string
  titulo?: string
  precio_uf?: number
  url?: string
}

interface Props {
  points: HeatPoint[]
  height?: string
  flyToCommune?: string | null
}

// Centros aproximados de las comunas del Gran Santiago [lat, lng]
const COMMUNE_CENTERS: Record<string, [number, number]> = {
  'macul':               [-33.4934, -70.5989],
  'nunoa':               [-33.4574, -70.5999],
  'ñuñoa':               [-33.4574, -70.5999],
  'santiago':            [-33.4378, -70.6504],
  'providencia':         [-33.4326, -70.6124],
  'las condes':          [-33.4103, -70.5686],
  'vitacura':            [-33.3844, -70.5800],
  'la reina':            [-33.4508, -70.5473],
  'san miguel':          [-33.4983, -70.6519],
  'la florida':          [-33.5231, -70.5998],
  'puente alto':         [-33.6113, -70.5757],
  'maipu':               [-33.5082, -70.7573],
  'la pintana':          [-33.5812, -70.6234],
  'el bosque':           [-33.5603, -70.6728],
  'lo espejo':           [-33.5227, -70.6978],
  'pedro aguirre cerda': [-33.4964, -70.6852],
  'lo prado':            [-33.4622, -70.7280],
  'cerrillos':           [-33.4992, -70.7142],
  'estacion central':    [-33.4583, -70.6855],
  'quinta normal':       [-33.4412, -70.6988],
  'independencia':       [-33.4198, -70.6600],
  'recoleta':            [-33.4073, -70.6376],
  'conchali':            [-33.3823, -70.6594],
  'quilicura':           [-33.3622, -70.7276],
  'pudahuel':            [-33.4366, -70.7641],
  'lo barnechea':        [-33.3537, -70.5340],
  'huechuraba':          [-33.3759, -70.6470],
  'renca':               [-33.3987, -70.7192],
  'cerro navia':         [-33.4228, -70.7371],
  'la cisterna':         [-33.5241, -70.6611],
  'san joaquin':         [-33.4928, -70.6342],
  'penalolen':           [-33.4879, -70.5370],
  'peñalolén':           [-33.4879, -70.5370],
}

// CSS del tooltip y popup (inyectado una sola vez)
const LEAFLET_STYLES = `
  .m2-tip { background:#0f172a !important; border:1px solid rgba(255,255,255,0.12) !important;
    border-radius:8px !important; padding:6px 10px !important; color:#f1f5f9 !important;
    font-size:12px !important; box-shadow:0 4px 16px rgba(0,0,0,0.5) !important; white-space:nowrap; }
  .m2-tip::before { display:none !important; }
  .m2-popup .leaflet-popup-content-wrapper { background:#0f172a; border:1px solid rgba(255,255,255,0.1);
    border-radius:12px; color:#f1f5f9; box-shadow:0 8px 32px rgba(0,0,0,0.5); padding:0; }
  .m2-popup .leaflet-popup-content { margin:0; }
  .m2-popup .leaflet-popup-tip { background:#0f172a; }
  .m2-popup .leaflet-popup-close-button { color:#64748b !important; top:8px !important; right:10px !important; }
`

export function MapLeaflet({ points, height = 'h-60', flyToCommune }: Props) {
  const mapRef       = useRef<HTMLDivElement>(null)
  const instanceRef  = useRef<any>(null)

  // ── Init map (una vez) ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return

    import('leaflet').then(L => {
      // Inyectar estilos personalizados
      if (!document.querySelector('style[data-m2-leaflet]')) {
        const s = document.createElement('style')
        s.setAttribute('data-m2-leaflet', '')
        s.textContent = LEAFLET_STYLES
        document.head.appendChild(s)
      }

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, {
        zoomControl: true,
        scrollWheelZoom: true,
        attributionControl: false,
      })
      instanceRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)

      // Vista inicial: Santiago centro, zoom 12 (ciudad bien visible)
      // NO se llama fitBounds al inicio — evita el "alejamiento de mancha"
      map.setView([-33.457, -70.6476], 12)

      _renderPoints(L, map, points)
    })

    return () => {
      instanceRef.current?.remove()
      instanceRef.current = null
      markersRef_global.length = 0
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-renderizar puntos cuando cambia el array (filtro de comuna) ────────
  useEffect(() => {
    if (!instanceRef.current) return
    import('leaflet').then(L => {
      _renderPoints(L, instanceRef.current, points)
    })
  }, [points]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── FlyTo cuando cambia la comuna seleccionada ───────────────────────────
  useEffect(() => {
    if (!instanceRef.current || !flyToCommune) return
    const key = flyToCommune.toLowerCase().trim()
    const center = COMMUNE_CENTERS[key]
    if (center) {
      instanceRef.current.flyTo(center, 14, { animate: true, duration: 1.2 })
    }
  }, [flyToCommune])

  return (
    <>
      <link rel='stylesheet' href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' crossOrigin='' />
      <div ref={mapRef} className={height + ' w-full'} style={{ background: '#020617' }} />
    </>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function _scoreColor(norm: number): string {
  if (norm >= 0.9) return '#ef4444'   // rojo  > 90
  if (norm >= 0.8) return '#f59e0b'   // ámbar > 80
  if (norm >= 0.7) return '#eab308'   // amarillo > 70
  if (norm >= 0.55) return '#34d399'  // esmeralda > 55
  return '#10b981'                    // verde < 55
}

function _renderPoints(L: any, map: any, points: HeatPoint[]) {
  // Limpiar marcadores anteriores
  markersRef_global.forEach(m => map.removeLayer(m))
  markersRef_global.length = 0

  if (points.length === 0) return

  points.forEach(p => {
    const score = Math.round(Math.min(p.intensity, 100))
    const norm  = score / 100
    const color = _scoreColor(norm)

    const marker = L.circleMarker([p.lat, p.lng], {
      radius:      5 + norm * 9,
      color,
      fillColor:   color,
      fillOpacity: 0.7,
      weight:      1,
      opacity:     0.9,
    }).addTo(map)

    // ── Tooltip hover: score + comuna ─────────────────────────────────────
    const comunaLabel = p.comuna ? `<span style="color:#94a3b8"> · ${p.comuna}</span>` : ''
    marker.bindTooltip(
      `<span style="color:${color};font-weight:700">Score ${score}/100</span>${comunaLabel}`,
      { permanent: false, direction: 'top', className: 'm2-tip', offset: [0, -4] }
    )

    // ── Popup click: tarjeta con datos y "Ver publicación" ─────────────────
    const titleHtml = p.titulo
      ? `<p style="font-weight:700;font-size:13px;margin:0 0 4px;color:#f1f5f9;max-width:220px">${p.titulo.slice(0, 55)}${p.titulo.length > 55 ? '…' : ''}</p>`
      : ''
    const metaHtml = [
      p.comuna ? `<span>${p.comuna}</span>` : null,
      p.precio_uf ? `<span>${p.precio_uf.toLocaleString('es-CL')} UF</span>` : null,
    ].filter(Boolean).join('<span style="color:#334155"> · </span>')

    const linkHtml = p.url && p.url.startsWith('https://')
      ? `<a href="${p.url}" target="_blank" rel="noreferrer"
           style="display:inline-block;margin-top:8px;background:#10b981;color:#000;
           font-weight:600;font-size:11px;padding:4px 10px;border-radius:6px;text-decoration:none">
           Ver publicación →
         </a>`
      : ''

    marker.bindPopup(
      `<div style="font-family:system-ui;font-size:12px;padding:12px 14px;line-height:1.6">
        ${titleHtml}
        ${metaHtml ? `<p style="color:#94a3b8;margin:0 0 4px">${metaHtml}</p>` : ''}
        <div style="display:flex;align-items:center;gap:6px">
          <span style="color:#94a3b8">Score</span>
          <span style="color:${color};font-weight:700;font-size:14px">${score}/100</span>
        </div>
        ${linkHtml}
      </div>`,
      { className: 'm2-popup', maxWidth: 260 }
    )

    markersRef_global.push(marker)
  })

  // ⚠️  NO se llama fitBounds aquí — causaba zoom-out excesivo con 500+ puntos.
  // La vista queda fijada en el setView inicial (Santiago zoom 12) o en el
  // flyTo de la comuna seleccionada.
}

// Ref global de marcadores activos (compartida entre renders del mismo mapa)
const markersRef_global: any[] = []
