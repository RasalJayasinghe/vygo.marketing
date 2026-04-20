const ACCENTS = {
  violet: { ink: 'var(--color-violet-500)', soft: '#E3DAF9' },
  coral:  { ink: 'var(--color-coral-500)',  soft: '#F7DFD1' },
  moss:   { ink: 'var(--color-moss-500)',   soft: '#DDE3CC' },
  sky:    { ink: '#2B5C8A',                 soft: '#D6E2EC' },
  ink:    { ink: 'var(--color-ink)',        soft: 'var(--color-rule)' },
}

function Sparkline({ data, stroke, soft }) {
  if (!data || data.length < 2) return null
  const w = 108
  const h = 28
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const step = w / (data.length - 1)
  const points = data.map((v, i) => {
    const x = i * step
    const y = h - ((v - min) / range) * (h - 2) - 1
    return [x, y]
  })
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="overflow-visible">
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      {points.length > 0 && (
        <g>
          <circle
            cx={points[points.length - 1][0]}
            cy={points[points.length - 1][1]}
            r="1.75"
            fill={stroke}
          />
        </g>
      )}
    </svg>
  )
}

export default function StatTile({
  label,
  value,
  caption,
  accent = 'ink',
  spark,
  size = 'md',
  delay = 0,
}) {
  const a = ACCENTS[accent] || ACCENTS.ink
  const valueClass = size === 'lg' ? 'text-6xl sm:text-7xl' : 'text-[52px] sm:text-[60px]'

  return (
    <div
      className="rise-in relative pt-1 pb-5"
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <p className="kicker">{label}</p>
        {spark && spark.length > 1 && (
          <Sparkline data={spark} stroke={a.ink} soft={a.soft} />
        )}
      </div>

      <p className={`serif-numeral ${valueClass} text-[color:var(--color-ink)]`}>
        {value}
      </p>

      {caption && (
        <div className="mt-3 flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: a.ink }}
          />
          <p className="text-[11px] text-[color:var(--color-ink-mute)] tracking-wide">
            {caption}
          </p>
        </div>
      )}
    </div>
  )
}
