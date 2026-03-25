import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'm² — Encuentra propiedades subvaloradas en Santiago',
  description: 'Analítica avanzada para detectar oportunidades inmobiliarias en el mercado chileno.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='es' className='dark'>
      <body className={inter.className + ' bg-[#020617] text-white antialiased'}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
