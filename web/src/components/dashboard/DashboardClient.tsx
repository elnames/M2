'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

export function DashboardClient({ running: initialRunning }: { running: boolean }) {
  const [running, setRunning] = useState(initialRunning)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function triggerScraper() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/scraper/run', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `Error ${res.status} al contactar el engine`)
        return
      }
      setRunning(true)
      // Poll status cada 10s hasta que termine
      const interval = setInterval(async () => {
        try {
          const statusRes = await fetch('/api/scraper/status')
          const data = await statusRes.json()
          if (!data.running) {
            setRunning(false)
            clearInterval(interval)
            window.location.reload()
          }
        } catch {
          clearInterval(interval)
          setRunning(false)
        }
      }, 10_000)
    } catch {
      setError('No se pudo contactar el engine. ¿Está corriendo el contenedor?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex flex-col gap-1 items-start'>
      <Button
        size='sm'
        onClick={triggerScraper}
        disabled={running || loading}
        className={running ? 'opacity-60 cursor-not-allowed' : ''}
      >
        {running ? (
          <><span className='inline-block w-2 h-2 rounded-full bg-black animate-pulse mr-2' />Scrapeando…</>
        ) : loading ? 'Iniciando…' : '▶ Ejecutar Scraping'}
      </Button>
      {error && (
        <p className='text-xs text-red-400 max-w-xs'>{error}</p>
      )}
    </div>
  )
}
