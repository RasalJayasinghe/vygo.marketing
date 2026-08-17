import { fmtNumber } from '@/components/format.js'

export default function ChartTooltip({ active, payload, label, valueFormatter, suffix = '' }) {
  if (!active || !payload || payload.length === 0) return null
  const fmt = valueFormatter || fmtNumber

  return (
    <div className="min-w-[140px] rounded-md border border-border bg-white px-3 py-2 text-xs shadow-md">
      {label != null && <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">{label}</p>}
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={`${p.dataKey}-${i}`} className="flex items-center gap-2">
            <span className="size-2 rounded-[2px]" style={{ background: p.color }} />
            <span className="flex-1 capitalize text-muted-foreground">{p.name || p.dataKey}</span>
            <span className="tabular-nums font-medium text-foreground">
              {fmt(p.value)}{suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
