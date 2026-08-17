import { cn } from '@/lib/utils'

export function Badge({ className, variant = 'default', ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium',
        variant === 'default' && 'border-transparent bg-muted text-muted-foreground',
        variant === 'live' && 'border-transparent bg-[#e8f6ee] text-[#1f7a4d]',
        className
      )}
      {...props}
    />
  )
}
