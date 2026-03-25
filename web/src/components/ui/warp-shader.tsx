'use client'
import { Warp } from '@paper-design/shaders-react'

export function WarpShaderBackground() {
  return (
    <div className='absolute inset-0 z-0'>
      {/* Shader layer */}
      <div className='absolute inset-0 opacity-[0.18]'>
        <Warp
          style={{ height: '100%', width: '100%' }}
          proportion={0.45}
          softness={1}
          distortion={0.15}
          swirl={0.6}
          swirlIterations={8}
          shape='checks'
          shapeScale={0.12}
          scale={1}
          rotation={0}
          speed={0.4}
          colors={['hsl(160, 80%, 35%)', 'hsl(180, 70%, 25%)', 'hsl(200, 60%, 20%)', 'hsl(155, 90%, 45%)']}
        />
      </div>
      {/* Dark overlay para que el texto sea legible */}
      <div className='absolute inset-0 bg-gradient-to-b from-[#020617]/80 via-[#020617]/60 to-[#020617]/90' />
    </div>
  )
}
