'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

export function DashboardClient({ running: initialRunning }: { running: boolean }) {
  const [running, setRunning] = useState(initialRunning)
  const [loading, setLoading] = useState(false)

  async function triggerScraper() {
    setLoading(true)
    try {
      await fetch('/api/scraper/status', { method: 'POST' })
      setRunning(true)
      // Poll status cada 10s
      const interval = setInterval(async () => {
        const res = await fetch('/api/scraper/status')
        const data = await res.json()
        if (!data.running) {
          setRunning(false)
          clearInterval(interval)
          window.location.reload()
        }
      }, 10_000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size='sm'
      onClick={triggerScraper}
      disabled={running || loading}
      className={running ? 'opacity-60 cursor-not-allowed' : ''}
    >
      {running ? (
        <><span className='inline-block w-2 h-2 rounded-full bg-black animate-pulse mr-2' />Scrapeando…</>
      ) : loading ? '...' : '▶ Ejecutar Scraping'}
    </Button>
  )
}
