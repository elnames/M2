import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'diamond' | 'gold' | 'silver' | 'default'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold',
      {
        'bg-emerald-500/15 text-emerald-300': variant === 'diamond',
        'bg-amber-500/15 text-amber-300': variant === 'gold',
        'bg-slate-500/15 text-slate-400': variant === 'silver',
        'bg-white/10 text-white': variant === 'default',
      },
      className
    )}>
      {children}
    </span>
  )
}

export function ScoreBadge({ score }: { score: number }) {
  if (score >= 80) return <Badge variant='diamond'>💎 {score}</Badge>
  if (score >= 70) return <Badge variant='gold'>⭐ {score}</Badge>
  return <Badge variant='silver'>○ {score}</Badge>
}
