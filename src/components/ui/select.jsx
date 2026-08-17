import { cn } from '@/lib/utils'

export function Select({ className, ...props }) {
  return (
    <select
      className={cn(
        'h-8 rounded-md border border-border bg-white px-2.5 pr-7 text-[13px] text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20',
        className
      )}
      {...props}
    />
  )
}
