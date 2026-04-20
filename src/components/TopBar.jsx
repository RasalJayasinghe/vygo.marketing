import { useEffect, useState } from 'react'

function formatTimeAgo(date) {
  if (!date) return 'syncing…'
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

function formatIssueDate(date) {
  if (!date) return ''
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
}

export default function TopBar({ years, months, year, month, onYear, onMonth, recordCount, lastUpdated, loading }) {
  const [, tick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 15_000)
    return () => clearInterval(id)
  }, [])

  const issueDate = formatIssueDate(lastUpdated || new Date())

  return (
    <header className="relative z-10 px-6 lg:px-10 pt-6 pb-5 border-b border-[color:var(--color-rule)]">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-[color:var(--color-ink-mute)] tabular-nums">
            {issueDate}
          </span>
          <span className="hidden md:block w-px h-3.5 bg-[color:var(--color-rule)]" />
          <span className="inline-flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${loading ? '' : 'pulse-dot'}`}
              style={{ background: loading ? 'var(--color-coral-500)' : 'var(--color-moss-500)' }}
            />
            <span className="text-[11px] font-medium tracking-wide text-[color:var(--color-ink-soft)]">
              {loading ? 'Syncing' : 'Live'}
            </span>
            <span className="text-[11px] text-[color:var(--color-ink-mute)]">
              · {formatTimeAgo(lastUpdated)}
            </span>
          </span>
          <span className="hidden md:block w-px h-3.5 bg-[color:var(--color-rule)]" />
          <span className="text-[11px] text-[color:var(--color-ink-mute)] tabular-nums">
            <span className="text-[color:var(--color-ink)] font-medium">{recordCount.toLocaleString()}</span> records in view
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[color:var(--color-ink-mute)] pr-1">
            Year
          </label>
          <select className="paper-select" value={year} onChange={e => onYear(e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <label className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[color:var(--color-ink-mute)] pl-3 pr-1">
            Month
          </label>
          <select className="paper-select" value={month} onChange={e => onMonth(e.target.value)}>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
    </header>
  )
}
