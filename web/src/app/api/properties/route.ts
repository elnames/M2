import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const ENGINE = process.env.DATA_ENGINE_URL ?? 'http://data-engine:3050'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const { searchParams } = new URL(req.url)
  const minScore = searchParams.get('min_score') ?? '0'
  const limit = searchParams.get('limit') ?? '50'

  try {
    const res = await fetch(
      `${ENGINE}/api/properties/?min_score=${minScore}&limit=${limit}`,
      { next: { revalidate: 60 } }
    )
    let data = await res.json()

    // Paywall: EXPLORADOR only sees their 3 selected communes
    if (user.plan === 'EXPLORADOR' && Array.isArray(user.selectedCommunes) && user.selectedCommunes.length > 0) {
      const allowed = user.selectedCommunes.map((c: string) => c.toLowerCase())
      data = data.filter((p: any) => allowed.includes(p.comuna?.toLowerCase()))
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json([], { status: 503 })
  }
}
