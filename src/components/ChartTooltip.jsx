import { fmtNumber } from './format.js'

export default function ChartTooltip({ active, payload, label, valueFormatter, suffix = '' }) {
  if (!active || !payload || payload.length === 0) return null
  const fmt = valueFormatter || fmtNumber

  return (
    <div
      className="text-xs"
      style={{
        background: 'var(--color-paper-soft)',
        border: '1px solid var(--color-rule)',
        borderRadius: 2,
        padding: '10px 12px',
        minWidth: 160,
        boxShadow: '0 2px 10px rgba(20, 17, 10, 0.06)',
      }}
    >
      {label !== undefined && label !== null && (
        <p
          className="uppercase mb-2 font-semibold"
          style={{
            fontSize: 9,
            letterSpacing: '0.2em',
            color: 'var(--color-ink-mute)',
          }}
        >
          {label}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((p, i) => (
          <div key={`${p.dataKey}-${i}`} className="flex items-center gap-2.5">
            <span
              className="inline-block w-2 h-2 shrink-0"
              style={{ background: p.color, borderRadius: 1 }}
            />
            <span className="flex-1 text-[color:var(--color-ink-soft)] capitalize">
              {p.name || p.dataKey}
            </span>
            <span
              className="tabular-nums font-display font-semibold"
              style={{
                color: 'var(--color-ink)',
                letterSpacing: '-0.02em',
                fontFeatureSettings: '"tnum", "lnum"',
              }}
            >
              {fmt(p.value)}{suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PctTooltip(props) {
  return <ChartTooltip {...props} valueFormatter={v => (v ?? 0).toFixed(2)} suffix="%" />
}
