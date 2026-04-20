import { useMemo } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import Panel from '../components/Panel.jsx'
import StatTile from '../components/StatTile.jsx'
import ChartTooltip from '../components/ChartTooltip.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import { CATEGORY_COLORS, CHART_COLORS, AXIS_PROPS, GRID_PROPS, CURSOR_PROPS } from '../components/chartTheme.js'
import { fmtCompact, fmtNumber, fmtPct, shortMonth, truncate } from '../components/format.js'
import { MONTHS_ORDER } from '../hooks/useMarketingData.js'

function sortByMonthKey(a, b) {
  const ai = MONTHS_ORDER.indexOf(a.monthFull)
  const bi = MONTHS_ORDER.indexOf(b.monthFull)
  return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
}

export default function Overview({ data }) {
  const { totals, trend, bySource, byAssetType, topAssets } = useMemo(() => {
    let imp = 0, clicks = 0, delivered = 0, opens = 0, regs = 0, atts = 0
    let ctrSum = 0, ctrCount = 0

    const monthMap = new Map()
    const typeAggMap = new Map()

    for (const r of data) {
      imp += r.impressions
      clicks += r.totalClicks
      delivered += r.totalDelivered
      opens += r.totalOpens
      regs += r.registrations
      atts += r.attendees
      if (r.ctr) { ctrSum += r.ctr; ctrCount++ }

      const mk = r.month || 'Unknown'
      const yk = `${r.year}-${mk}`
      if (!monthMap.has(yk)) {
        monthMap.set(yk, { monthFull: mk, year: r.year, label: shortMonth(mk), impressions: 0, clicks: 0, registrations: 0, opens: 0 })
      }
      const mb = monthMap.get(yk)
      mb.impressions += r.impressions
      mb.clicks += r.totalClicks
      mb.registrations += r.registrations
      mb.opens += r.totalOpens

      const t = r.assetType || 'Other'
      if (!typeAggMap.has(t)) typeAggMap.set(t, { type: t, records: 0, impressions: 0, clicks: 0, opens: 0, registrations: 0 })
      const ta = typeAggMap.get(t)
      ta.records += 1
      ta.impressions += r.impressions
      ta.clicks += r.totalClicks
      ta.opens += r.totalOpens
      ta.registrations += r.registrations
    }

    const trend = [...monthMap.values()]
      .sort((a, b) => {
        if (a.year !== b.year) return String(a.year).localeCompare(String(b.year))
        return sortByMonthKey(a, b)
      })

    const categories = ['Social Post', 'EDM', 'Webinar']
    const bySource = categories
      .map(cat => {
        const rec = typeAggMap.get(cat)
        return {
          name: cat,
          records: rec?.records || 0,
          impressions: rec?.impressions || 0,
          clicks: rec?.clicks || 0,
          opens: rec?.opens || 0,
          registrations: rec?.registrations || 0,
        }
      })
      .filter(d => d.records > 0)

    const byAssetType = [...typeAggMap.values()]

    const topAssets = [...data]
      .map(r => ({
        name: r.assetName,
        type: r.assetType,
        reach: Math.max(r.impressions, r.totalOpens, r.registrations),
      }))
      .filter(r => r.reach > 0 && r.name)
      .sort((a, b) => b.reach - a.reach)
      .slice(0, 6)

    const avgCtr = ctrCount ? ctrSum / ctrCount : 0

    return {
      totals: { imp, clicks, delivered, opens, regs, atts, avgCtr },
      trend,
      bySource,
      byAssetType,
      topAssets,
    }
  }, [data])

  const impressionsSpark = trend.map(t => t.impressions)
  const clicksSpark = trend.map(t => t.clicks)
  const opensSpark = trend.map(t => t.opens)
  const regsSpark = trend.map(t => t.registrations)

  if (data.length === 0) {
    return <EmptyState message="No data in the selected range yet." />
  }

  return (
    <div className="space-y-10">
      <SectionHeading number="01" title="Headline figures" caption="Aggregate performance across every channel" />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-4 divide-x divide-[color:var(--color-rule-soft)] lg:divide-x">
        <div className="pl-0 pr-5 lg:pr-6">
          <StatTile label="Impressions" accent="violet" value={fmtCompact(totals.imp)} caption={`${fmtNumber(totals.imp)} total`} spark={impressionsSpark} delay={40} />
        </div>
        <div className="pl-5 lg:pl-6 pr-5 lg:pr-6">
          <StatTile label="Clicks" accent="coral" value={fmtCompact(totals.clicks)} caption={`${fmtPct(totals.avgCtr)} avg CTR`} spark={clicksSpark} delay={90} />
        </div>
        <div className="pl-5 lg:pl-6 pr-5 lg:pr-6">
          <StatTile label="Opens" accent="moss" value={fmtCompact(totals.opens)} caption={`${fmtCompact(totals.delivered)} delivered`} spark={opensSpark} delay={140} />
        </div>
        <div className="pl-5 lg:pl-6">
          <StatTile label="Registrations" accent="sky" value={fmtCompact(totals.regs)} caption={`${fmtCompact(totals.atts)} attended`} spark={regsSpark} delay={190} />
        </div>
      </section>

      <SectionHeading number="02" title="The channels in motion" caption="Monthly reach, engagement & conversion" />

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel title="Channel performance over time" eyebrow="Momentum" className="xl:col-span-2" delay={220}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="g-imp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.violet} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={CHART_COLORS.violet} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g-opens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.coral} stopOpacity={0.14} />
                  <stop offset="100%" stopColor={CHART_COLORS.coral} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g-regs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.moss} stopOpacity={0.14} />
                  <stop offset="100%" stopColor={CHART_COLORS.moss} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} tickFormatter={fmtCompact} />
              <Tooltip content={<ChartTooltip valueFormatter={fmtNumber} />} cursor={CURSOR_PROPS} />
              <Legend iconType="square" wrapperStyle={{ paddingTop: 10 }} />
              <Area type="monotone" dataKey="impressions" name="Impressions" stroke={CHART_COLORS.violet} strokeWidth={1.75} fill="url(#g-imp)" />
              <Area type="monotone" dataKey="opens" name="Opens" stroke={CHART_COLORS.coral} strokeWidth={1.75} fill="url(#g-opens)" />
              <Area type="monotone" dataKey="registrations" name="Registrations" stroke={CHART_COLORS.moss} strokeWidth={1.75} fill="url(#g-regs)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Channel mix" eyebrow="Distribution" delay={260}>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={bySource}
                  dataKey="records"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={86}
                  paddingAngle={1}
                  stroke="var(--color-paper-soft)"
                  strokeWidth={2}
                >
                  {bySource.map(entry => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || CHART_COLORS.violet} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip valueFormatter={fmtNumber} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-2">
            {bySource.map(s => {
              const total = bySource.reduce((sum, b) => sum + b.records, 0) || 1
              const pct = ((s.records / total) * 100).toFixed(0)
              return (
                <li key={s.name} className="flex items-center justify-between text-xs py-1.5 border-b border-[color:var(--color-rule-soft)] last:border-b-0">
                  <span className="flex items-center gap-2.5">
                    <span className="w-2 h-2" style={{ background: CATEGORY_COLORS[s.name], borderRadius: 1 }} />
                    <span className="text-[color:var(--color-ink)] font-medium">{s.name}</span>
                  </span>
                  <span className="tabular-nums text-[color:var(--color-ink-mute)]">
                    <span className="font-display font-semibold text-[color:var(--color-ink)]" style={{ letterSpacing: '-0.02em' }}>
                      {s.records}
                    </span>
                    <span className="ml-2 text-[color:var(--color-ink-faint)]">{pct}%</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </Panel>
      </section>

      <SectionHeading number="03" title="Reach leaders" caption="The content driving the most engagement" />

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <Panel title="Top performing assets" eyebrow="Leaderboard" className="xl:col-span-3" delay={300}>
          <div className="space-y-4">
            {topAssets.length === 0 && <p className="text-xs text-[color:var(--color-ink-faint)]">Insufficient data.</p>}
            {topAssets.map((a, i) => {
              const color = CATEGORY_COLORS[a.type] || CHART_COLORS.violet
              const max = topAssets[0].reach || 1
              const width = (a.reach / max) * 100
              return (
                <div key={`${a.name}-${i}`} className="group">
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <p className="text-[13px] text-[color:var(--color-ink)] truncate" title={a.name}>
                      <span className="section-no mr-3" style={{ fontSize: 14, color }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {truncate(a.name, 68)}
                    </p>
                    <p className="font-display font-semibold tabular-nums shrink-0 text-[color:var(--color-ink)] text-[16px]" style={{ letterSpacing: '-0.02em' }}>
                      {fmtCompact(a.reach)}
                    </p>
                  </div>
                  <div className="h-[3px] bg-[color:var(--color-rule-soft)] overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${width}%`, background: color }}
                    />
                  </div>
                  <p className="mt-1.5 kicker" style={{ color }}>{a.type}</p>
                </div>
              )
            })}
          </div>
        </Panel>

        <Panel title="Performance by asset type" eyebrow="Benchmarks" className="xl:col-span-2" delay={340}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byAssetType} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 0 }} barCategoryGap={12}>
              <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
              <XAxis type="number" {...AXIS_PROPS} tickFormatter={fmtCompact} />
              <YAxis dataKey="type" type="category" {...AXIS_PROPS} width={65} />
              <Tooltip content={<ChartTooltip valueFormatter={fmtNumber} />} cursor={{ fill: 'rgba(20,17,10,0.03)' }} />
              <Legend iconType="square" wrapperStyle={{ paddingTop: 10 }} />
              <Bar dataKey="impressions" name="Impressions" fill={CHART_COLORS.violet} radius={[0, 2, 2, 0]} />
              <Bar dataKey="opens" name="Opens" fill={CHART_COLORS.coral} radius={[0, 2, 2, 0]} />
              <Bar dataKey="clicks" name="Clicks" fill={CHART_COLORS.moss} radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </section>
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="card py-20 flex flex-col items-center justify-center text-center">
      <p className="kicker mb-3">No data</p>
      <p className="font-display text-2xl text-[color:var(--color-ink)]">Nothing to report.</p>
      <p className="mt-2 text-sm text-[color:var(--color-ink-mute)] max-w-sm">{message}</p>
    </div>
  )
}
