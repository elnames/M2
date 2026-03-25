import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glass?: boolean
}

export function Card({ children, className, hover = false, glass = false }: CardProps) {
  return (
    <div className={cn(
      'rounded-2xl border border-white/[0.07] bg-slate-900/80',
      hover && 'transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30',
      glass && 'backdrop-blur-xl bg-white/[0.03]',
      className
    )}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07]', className)}>
      {children}
    </div>
  )
}
