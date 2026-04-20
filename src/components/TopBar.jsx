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

export default function TopBar({
  years,
  months,
  year,
  month,
  onYear,
  onMonth,
  recordCount,
  lastUpdated,
  loading,
  tabs,
  currentTab,
  onTabChange,
}) {
  const [, tick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 15_000)
    return () => clearInterval(id)
  }, [])

  const issueDate = formatIssueDate(lastUpdated || new Date())

  return (
    <header className="relative z-10 border-b border-[color:var(--color-rule)] bg-[color:var(--color-paper)]">
      <div className="max-w-[min(100%,1600px)] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between pt-5 pb-4 lg:pt-6 lg:pb-5">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3 min-w-0">
            <div className="shrink-0 min-w-0">
              <h1 className="display-heading text-[17px] sm:text-[20px] text-[color:var(--color-ink)] leading-snug tracking-tight">
                Vygo — Marketing Metrics Dashboard
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[color:var(--color-ink-mute)] tabular-nums">
                {issueDate}
              </span>
              <span className="hidden sm:block w-px h-3 bg-[color:var(--color-rule)]" />
              <span className="inline-flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${loading ? '' : 'pulse-dot'}`}
                  style={{ background: loading ? 'var(--color-coral-500)' : 'var(--color-moss-500)' }}
                />
                <span className="font-medium text-[color:var(--color-ink-soft)]">
                  {loading ? 'Syncing' : 'Live'}
                </span>
                <span className="text-[color:var(--color-ink-mute)]">· {formatTimeAgo(lastUpdated)}</span>
              </span>
              <span className="hidden sm:block w-px h-3 bg-[color:var(--color-rule)]" />
              <span className="text-[color:var(--color-ink-mute)] tabular-nums">
                <span className="text-[color:var(--color-ink)] font-medium">{recordCount.toLocaleString()}</span> in view
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <label className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[color:var(--color-ink-mute)]">
              Year
            </label>
            <select className="paper-select" value={year} onChange={e => onYear(e.target.value)}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <label className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[color:var(--color-ink-mute)] pl-2">
              Month
            </label>
            <select className="paper-select" value={month} onChange={e => onMonth(e.target.value)}>
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <nav
          className="flex gap-0 sm:gap-1 overflow-x-auto scroll-slim pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 border-t border-[color:var(--color-rule-soft)]"
          aria-label="Dashboard sections"
        >
          {tabs.map((t, i) => {
            const isActive = currentTab === t.id
            const num = String(i + 1).padStart(2, '0')
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className={`
                  group shrink-0 flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 text-left
                  border-b-[3px] transition-colors
                  ${isActive
                    ? 'border-[color:var(--color-violet-500)] bg-[color:var(--color-paper-soft)]'
                    : 'border-transparent hover:border-[color:var(--color-rule)] hover:bg-white/60'
                  }
                `}
              >
                <span
                  className="section-no text-[15px] sm:text-[17px] transition-colors"
                  style={{ color: isActive ? 'var(--color-violet-500)' : 'var(--color-ink-faint)' }}
                >
                  {num}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-[13px] sm:text-[14px] leading-tight ${
                      isActive ? 'text-[color:var(--color-ink)] font-semibold' : 'text-[color:var(--color-ink-soft)] font-medium'
                    }`}
                  >
                    {t.label}
                  </span>
                  {t.count !== undefined && (
                    <span className="block mt-0.5 text-[9px] sm:text-[10px] tabular-nums uppercase tracking-[0.12em] text-[color:var(--color-ink-faint)]">
                      {t.count} {t.count === 1 ? 'entry' : 'entries'}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
