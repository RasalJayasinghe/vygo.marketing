import { useMemo, useState } from 'react'
import { useMarketingData, filterData, useFilterState } from './hooks/useMarketingData.js'
import SideRail from './components/SideRail.jsx'
import TopBar from './components/TopBar.jsx'
import Overview from './tabs/Overview.jsx'
import SocialPosts from './tabs/SocialPosts.jsx'
import EDMs from './tabs/EDMs.jsx'
import Webinars from './tabs/Webinars.jsx'

const TAB_DEFS = [
  { id: 'overview', label: 'Observatory' },
  { id: 'social',   label: 'Social Posts' },
  { id: 'edm',      label: 'EDMs' },
  { id: 'webinar',  label: 'Webinars' },
]

export default function App() {
  const [tab, setTab] = useState('overview')
  const { data, loading, error, lastUpdated } = useMarketingData()
  const { year, month, years, months, setYear, setMonth } = useFilterState(data)

  const filtered = useMemo(() => filterData(data, year, month), [data, year, month])

  const counts = useMemo(() => {
    let social = 0, edm = 0, webinar = 0
    for (const r of filtered) {
      if (r.assetType === 'Social Post') social++
      else if (r.assetType === 'EDM') edm++
      else if (r.assetType === 'Webinar') webinar++
    }
    return { social, edm, webinar, overview: filtered.length }
  }, [filtered])

  const tabs = TAB_DEFS.map(t => ({ ...t, count: counts[t.id] }))

  return (
    <div className="relative min-h-screen flex">
      <SideRail tabs={tabs} current={tab} onChange={setTab} />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          years={years}
          months={months}
          year={year}
          month={month}
          onYear={setYear}
          onMonth={setMonth}
          recordCount={filtered.length}
          lastUpdated={lastUpdated}
          loading={loading && data.length === 0}
        />

        <main className="relative z-10 flex-1 px-6 lg:px-10 pt-6 pb-10 max-w-[1400px] w-full mx-auto">
          <MobileTabs tabs={tabs} current={tab} onChange={setTab} />

          {error && (
            <div
              className="card p-4 mb-6"
              style={{ borderColor: 'rgba(216, 90, 46, 0.4)', background: '#fbf3ed' }}
            >
              <p className="kicker" style={{ color: 'var(--color-coral-500)' }}>Connection error</p>
              <p className="mt-1 text-sm text-[color:var(--color-ink)]">{error}</p>
              <p className="mt-1 text-xs text-[color:var(--color-ink-mute)]">
                Make sure the Google Sheet is published publicly (File → Share → Publish to web → CSV).
              </p>
            </div>
          )}

          {loading && data.length === 0 && <LoadingState />}

          {data.length > 0 && (
            <>
              {tab === 'overview' && <Overview data={filtered} />}
              {tab === 'social'   && <SocialPosts data={filtered} />}
              {tab === 'edm'      && <EDMs data={filtered} />}
              {tab === 'webinar'  && <Webinars data={filtered} />}
            </>
          )}
        </main>

        <footer className="relative z-10 px-6 lg:px-10 py-5 border-t border-[color:var(--color-rule)] flex flex-wrap gap-2 justify-between text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink-mute)]">
          <span>Vygometrics · Marketing Journal</span>
          <span className="tabular-nums">Live · Auto-refresh 60s</span>
        </footer>
      </div>
    </div>
  )
}

function MobileTabs({ tabs, current, onChange }) {
  return (
    <div className="lg:hidden flex gap-6 mb-6 overflow-x-auto scroll-slim -mx-1 px-1 pb-3 border-b border-[color:var(--color-rule)]">
      {tabs.map((t, i) => {
        const isActive = current === t.id
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="shrink-0 flex items-baseline gap-2 pb-2 relative"
          >
            <span className="section-no" style={{ fontSize: 14, color: isActive ? 'var(--color-violet-500)' : 'var(--color-ink-faint)' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span
              className={`text-xs tracking-wide ${
                isActive ? 'text-[color:var(--color-ink)] font-semibold' : 'text-[color:var(--color-ink-mute)]'
              }`}
            >
              {t.label}
            </span>
            {isActive && (
              <span
                aria-hidden
                className="absolute left-0 right-0 -bottom-[1px] h-[2px]"
                style={{ background: 'var(--color-ink)' }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="py-24 flex flex-col items-center justify-center gap-5">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border border-[color:var(--color-rule)]" />
        <div
          className="absolute inset-0 rounded-full border border-transparent animate-spin"
          style={{ borderTopColor: 'var(--color-violet-500)' }}
        />
      </div>
      <p className="kicker">Syncing master sheet</p>
    </div>
  )
}
