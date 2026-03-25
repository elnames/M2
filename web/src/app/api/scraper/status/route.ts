import { NextResponse } from 'next/server'

const ENGINE = process.env.DATA_ENGINE_URL ?? 'http://data-engine:3050'

export async function GET() {
  try {
    const res = await fetch(`${ENGINE}/api/scraper/status`, { cache: 'no-store' })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ running: false, total_properties: 0, oportunidades: 0, diamantes: 0 })
  }
}

export async function POST() {
  try {
    const res = await fetch(`${ENGINE}/api/scraper/run`, { method: 'POST', cache: 'no-store' })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Engine unavailable' }, { status: 503 })
  }
}
