'use client'
import { useEffect, useRef } from 'react'

interface HeatPoint { lat: number; lng: number; intensity: number; comuna?: string }

interface Props {
  points: HeatPoint[]
  height?: string
  flyToCommune?: string | null
}

// Centros aproximados de las comunas del Gran Santiago [lat, lng]
const COMMUNE_CENTERS: Record<string, [number, number]> = {
  'macul':              [-33.4934, -70.5989],
  'nunoa':              [-33.4574, -70.5999],
  'ñuñoa':              [-33.4574, -70.5999],
  'santiago':           [-33.4378, -70.6504],
  'providencia':        [-33.4326, -70.6124],
  'las condes':         [-33.4103, -70.5686],
  'vitacura':           [-33.3844, -70.5800],
  'la reina':           [-33.4508, -70.5473],
  'san miguel':         [-33.4983, -70.6519],
  'la florida':         [-33.5231, -70.5998],
  'puente alto':        [-33.6113, -70.5757],
  'maipu':              [-33.5082, -70.7573],
  'la pintana':         [-33.5812, -70.6234],
  'el bosque':          [-33.5603, -70.6728],
  'lo espejo':          [-33.5227, -70.6978],
  'pedro aguirre cerda':[-33.4964, -70.6852],
  'lo prado':           [-33.4622, -70.7280],
  'cerrillos':          [-33.4992, -70.7142],
  'estacion central':   [-33.4583, -70.6855],
  'quinta normal':      [-33.4412, -70.6988],
  'independencia':      [-33.4198, -70.6600],
  'recoleta':           [-33.4073, -70.6376],
  'conchali':           [-33.3823, -70.6594],
  'quilicura':          [-33.3622, -70.7276],
  'pudahuel':           [-33.4366, -70.7641],
  'lo barnechea':       [-33.3537, -70.5340],
  'huechuraba':         [-33.3759, -70.6470],
  'renca':              [-33.3987, -70.7192],
  'cerro navia':        [-33.4228, -70.7371],
  'la cisterna':        [-33.5241, -70.6611],
  'san joaquin':        [-33.4928, -70.6342],
  'penalolen':          [-33.4879, -70.5370],
  'peñalolén':          [-33.4879, -70.5370],
}

export function MapLeaflet({ points, height = 'h-60', flyToCommune }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  // Initialise map once
  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return

    import('leaflet').then(L => {
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
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

      // Initial view: Santiago centro, zoom 12
      map.setView([-33.457, -70.6476], 12)

      _renderPoints(L, map, points, null)
    })

    return () => {
      instanceRef.current?.remove()
      instanceRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render points when `points` array changes (after filtering)
  useEffect(() => {
    if (!instanceRef.current) return
    import('leaflet').then(L => {
      _renderPoints(L, instanceRef.current, points, flyToCommune ?? null)
    })
  }, [points]) // eslint-disable-line react-hooks/exhaustive-deps

  // FlyTo when commune changes (independent of point re-render)
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

function _renderPoints(L: any, map: any, points: HeatPoint[], flyToCommune: string | null) {
  // Remove previous markers
  markersRef_global.forEach(m => map.removeLayer(m))
  markersRef_global.length = 0

  if (points.length === 0) return

  points.forEach(p => {
    const norm = Math.min(p.intensity / 100, 1)
    const color = norm < 0.5 ? '#10b981' : norm < 0.75 ? '#f59e0b' : '#ef4444'

    const marker = L.circleMarker([p.lat, p.lng], {
      radius: 5 + norm * 9,
      color,
      fillColor: color,
      fillOpacity: 0.55,
      weight: 1,
      opacity: 0.85,
    }).addTo(map)

    markersRef_global.push(marker)
  })

  // Only fit bounds if NOT flying to a specific commune
  if (!flyToCommune && points.length > 0) {
    const latlngs = points.map(p => [p.lat, p.lng] as [number, number])
    map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30], maxZoom: 13 })
  }
}

// Module-level ref to track markers across renders
const markersRef_global: any[] = []
