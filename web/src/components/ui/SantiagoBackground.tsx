'use client'
import { useEffect, useRef } from 'react'

interface Dot {
  x: number; y: number; radius: number; alpha: number
  phase: number; phaseTick: number; maxAlpha: number
  ringRadius: number; ringAlpha: number
}

// Santiago avenues as percentage coordinates [x1%,y1%,x2%,y2%]
const STREETS = [
  // Horizontales principales (Alameda, Av. Grecia, Av. Departamental...)
  [0, 20, 100, 20], [0, 30, 100, 30], [0, 40, 100, 42],
  [0, 50, 100, 50], [0, 60, 100, 60], [0, 70, 100, 70], [0, 80, 100, 80],
  // Verticales (Américo Vespucio, Av. Vicuña Mackenna, Tobalaba...)
  [15, 0, 15, 100], [30, 0, 30, 100], [45, 0, 45, 100],
  [60, 0, 60, 100], [75, 0, 75, 100], [88, 0, 88, 100],
  // Diagonales (Av. Providencia, Gran Avenida...)
  [0, 38, 60, 52], [40, 48, 100, 62],
  [0, 55, 50, 40], [50, 40, 100, 55],
]

export function SantiagoBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    const dots: Dot[] = []

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function spawnDot() {
      dots.push({
        x: Math.random() * canvas!.width,
        y: Math.random() * canvas!.height,
        radius: 2 + Math.random() * 3,
        alpha: 0, phase: 0, phaseTick: 0,
        maxAlpha: 0.6 + Math.random() * 0.4,
        ringRadius: 4, ringAlpha: 0,
      })
    }

    for (let i = 0; i < 8; i++) spawnDot()

    let tick = 0
    function draw() {
      const W = canvas!.width
      const H = canvas!.height

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#020617'
      ctx.fillRect(0, 0, W, H)

      // Grid fino de fondo
      ctx.strokeStyle = 'rgba(30,58,138,0.08)'
      ctx.lineWidth = 0.4
      for (let gx = 0; gx <= W; gx += W / 24) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke()
      }
      for (let gy = 0; gy <= H; gy += H / 18) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke()
      }

      // Avenidas principales — más visibles
      ctx.lineWidth = 0.8
      STREETS.forEach(([x1p, y1p, x2p, y2p], i) => {
        const isDiag = i >= 14
        ctx.strokeStyle = isDiag
          ? 'rgba(52,211,153,0.10)'   // diagonales en verde muy tenue
          : 'rgba(96,165,250,0.18)'   // avenidas en azul
        ctx.beginPath()
        ctx.moveTo((x1p / 100) * W, (y1p / 100) * H)
        ctx.lineTo((x2p / 100) * W, (y2p / 100) * H)
        ctx.stroke()
      })

      // Puntos de oportunidad
      for (let i = dots.length - 1; i >= 0; i--) {
        const d = dots[i]
        d.phaseTick++

        if (d.phase === 0) {
          d.alpha = Math.min(d.maxAlpha, d.alpha + 0.02)
          d.ringAlpha = d.alpha * 0.5
          if (d.alpha >= d.maxAlpha) { d.phase = 1; d.phaseTick = 0 }
        } else if (d.phase === 1) {
          d.alpha = d.maxAlpha * (0.85 + 0.15 * Math.sin(tick * 0.04 + d.x))
          d.ringRadius += 0.25
          d.ringAlpha = Math.max(0, d.ringAlpha - 0.006)
          if (d.phaseTick > 90) { d.phase = 2; d.phaseTick = 0 }
        } else {
          d.alpha = Math.max(0, d.alpha - 0.015)
          if (d.alpha <= 0) { dots.splice(i, 1); continue }
        }

        if (d.ringAlpha > 0) {
          const rg = ctx.createRadialGradient(d.x, d.y, d.radius, d.x, d.y, d.ringRadius)
          rg.addColorStop(0, `rgba(59,130,246,${d.ringAlpha})`)
          rg.addColorStop(1, 'rgba(59,130,246,0)')
          ctx.beginPath()
          ctx.arc(d.x, d.y, d.ringRadius, 0, Math.PI * 2)
          ctx.fillStyle = rg
          ctx.fill()
        }

        const grd = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.radius * 5)
        grd.addColorStop(0, `rgba(96,165,250,${d.alpha})`)
        grd.addColorStop(0.4, `rgba(59,130,246,${d.alpha * 0.6})`)
        grd.addColorStop(1, 'rgba(59,130,246,0)')
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.radius * 5, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()

        ctx.beginPath()
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(147,197,253,${d.alpha})`
        ctx.fill()
      }

      if (tick % 40 === 0 && dots.length < 12) spawnDot()
      tick++
      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className='absolute inset-0 w-full h-full pointer-events-none'
      style={{ zIndex: 0 }}
    />
  )
}
