import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const ENGINE = process.env.DATA_ENGINE_URL ?? 'http://data-engine:3050'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json([], { status: 401 })

  const user = session.user as any

  try {
    const res = await fetch(`${ENGINE}/api/properties/heatmap?limit=800`, { next: { revalidate: 120 } })
    let data = await res.json()

    if (user.plan === 'EXPLORADOR' && Array.isArray(user.selectedCommunes) && user.selectedCommunes.length > 0) {
      const allowed = user.selectedCommunes.map((c: string) => c.toLowerCase())
      data = data.filter((p: any) => allowed.includes(p.comuna?.toLowerCase()))
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json([], { status: 503 })
  }
}
