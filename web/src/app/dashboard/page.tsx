import { DashboardInteractive } from '@/components/dashboard/DashboardInteractive'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

const ENGINE = process.env.DATA_ENGINE_URL ?? 'http://data-engine:3050'

async function getStatus() {
  try {
    const res = await fetch(`${ENGINE}/api/scraper/status`, { cache: 'no-store' })
    return res.json()
  } catch { return { running: false, total_properties: 0, oportunidades: 0, diamantes: 0 } }
}

async function getTopOportunidades() {
  try {
    const res = await fetch(`${ENGINE}/api/valuations/top-oportunidades?limit=50`, { next: { revalidate: 120 } })
    return res.json()
  } catch { return [] }
}

async function getAlerts() {
  try {
    const res = await fetch(`${ENGINE}/api/properties/?min_score=80&limit=5`, { next: { revalidate: 60 } })
    return res.json()
  } catch { return [] }
}

async function getHeatmap() {
  try {
    const res = await fetch(`${ENGINE}/api/properties/heatmap?limit=500`, { next: { revalidate: 120 } })
    return res.json()
  } catch { return [] }
}

export default async function DashboardPage() {
  const [status, properties, alerts, heatmapPoints] = await Promise.all([
    getStatus(), getTopOportunidades(), getAlerts(), getHeatmap(),
  ])

  return (
    <DashboardInteractive
      properties={properties}
      heatmapPoints={heatmapPoints}
      alerts={alerts}
      status={status}
    />
  )
}
