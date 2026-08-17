import { cn } from '@/lib/utils'

export function Card({ className, ...props }) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-card text-card-foreground shadow-[0_1px_2px_rgba(28,36,48,0.04)]', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex items-center justify-between gap-3 px-4 py-3 border-b border-border', className)} {...props} />
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-[13px] font-semibold text-foreground', className)} {...props} />
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-4', className)} {...props} />
}
