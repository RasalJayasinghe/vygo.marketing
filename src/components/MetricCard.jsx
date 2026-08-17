import { DollarSign, Eye, MousePointerClick, MailOpen, UserPlus, Mic2, BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { cn } from '@/lib/utils'

const ICONS = {
  cost: DollarSign,
  impressions: Eye,
  clicks: MousePointerClick,
  opens: MailOpen,
  registrations: UserPlus,
  podcast: Mic2,
  default: BarChart3,
}

export function MetricCard({ label, value, hint, icon = 'default' }) {
  const Icon = ICONS[icon] || ICONS.default
  return (
    <Card className="min-w-0">
      <CardContent className="px-4 py-3.5">
        <div className="mb-3 flex items-center gap-2 text-muted-foreground">
          <Icon className="size-3.5" strokeWidth={1.75} />
          <span className="text-[12px] font-medium">{label}</span>
        </div>
        <p className="text-[28px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
          {value}
        </p>
        {hint ? <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}

export function ChartCard({ title, children, className }) {
  return (
    <Card className={cn('min-w-0', className)}>
      <div className="px-4 pt-3 pb-1">
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
      </div>
      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  )
}

export function EmptyState({ title, message }) {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <p className="text-base font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  )
}
