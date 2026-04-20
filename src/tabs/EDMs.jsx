import { useMemo } from 'react'
import {
  Area, AreaChart, Bar, CartesianGrid, Cell, ComposedChart,
  Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart,
} from 'recharts'
import Panel from '../components/Panel.jsx'
import StatTile from '../components/StatTile.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import ChartTooltip from '../components/ChartTooltip.jsx'
import { AXIS_PROPS, CHART_COLORS, GRID_PROPS } from '../components/chartTheme.js'
import { fmtCompact, fmtNumber, fmtPct, shortMonth, truncate } from '../components/format.js'
import { MONTHS_ORDER } from '../hooks/useMarketingData.js'

export default function EDMs({ data }) {
  const rows = useMemo(() => data.filter(r => r.assetType === 'EDM'), [data])

  const { totals, monthly, topEdms } = useMemo(() => {
    let delivered = 0, opens = 0, clicks = 0, ctrSum = 0, ctrCount = 0
    const monthMap = new Map()

    for (const r of rows) {
      delivered += r.totalDelivered
      opens += r.totalOpens
      clicks += r.totalClicks
      if (r.ctr) { ctrSum += r.ctr; ctrCount++ }

      const key = `${r.year}-${r.month}`
      if (!monthMap.has(key)) {
        monthMap.set(key, { key, month: r.month, year: r.year, label: shortMonth(r.month), delivered: 0, opens: 0, clicks: 0, ctrSum: 0, count: 0 })
      }
      const m = monthMap.get(key)
      m.delivered += r.totalDelivered
      m.opens += r.totalOpens
      m.clicks += r.totalClicks
      m.ctrSum += r.ctr
      m.count++
    }

    const monthly = [...monthMap.values()]
      .sort((a, b) => {
        if (a.year !== b.year) return String(a.year).localeCompare(String(b.year))
        const ai = MONTHS_ORDER.indexOf(a.month)
        const bi = MONTHS_ORDER.indexOf(b.month)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })
      .map(m => ({
        ...m,
        openRate: m.delivered ? +((m.opens / m.delivered) * 100).toFixed(1) : 0,
        avgCtr: m.count ? +(m.ctrSum / m.count).toFixed(2) : 0,
      }))

    const topEdms = [...rows]
      .filter(r => r.totalOpens > 0 || r.totalDelivered > 0)
      .sort((a, b) => {
        const ar = a.totalDelivered ? a.totalOpens / a.totalDelivered : 0
        const br = b.totalDelivered ? b.totalOpens / b.totalDelivered : 0
        if (br !== ar) return br - ar
        return b.totalOpens - a.totalOpens
      })
      .slice(0, 8)
      .map(r => ({
        name: truncate(r.assetName || 'Untitled EDM', 56),
        fullName: r.assetName,
        opens: r.totalOpens,
        delivered: r.totalDelivered,
        clicks: r.totalClicks,
        openRate: r.totalDelivered ? +((r.totalOpens / r.totalDelivered) * 100).toFixed(1) : 0,
        ctr: r.ctr,
      }))

    const openRate = delivered ? (opens / delivered) * 100 : 0

    return {
      totals: { delivered, opens, clicks, openRate, avgCtr: ctrCount ? ctrSum / ctrCount : 0, count: rows.length },
      monthly,
      topEdms,
    }
  }, [rows])

  if (rows.length === 0) {
    return (
      <div className="card py-16 text-center">
        <p className="kicker">EDMs</p>
        <p className="mt-2 font-display text-2xl text-[color:var(--color-ink)]">No EDMs in this range</p>
        <p className="text-sm text-[color:var(--color-ink-mute)] mt-1">Try adjusting the year or month.</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <SectionHeading number="01" title="Headline figures" caption="Deliverability & engagement" />

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-x-8 gap-y-4 divide-x divide-[color:var(--color-rule-soft)] lg:divide-x">
        <div className="pr-4 lg:pr-5">
          <StatTile label="Campaigns" accent="ink" value={fmtNumber(totals.count)} caption="EDMs sent" delay={40} />
        </div>
        <div className="pl-4 lg:pl-5 pr-4 lg:pr-5">
          <StatTile label="Delivered" accent="violet" value={fmtCompact(totals.delivered)} caption={fmtNumber(totals.delivered)} spark={monthly.map(m => m.delivered)} delay={90} />
        </div>
        <div className="pl-4 lg:pl-5 pr-4 lg:pr-5">
          <StatTile label="Opens" accent="coral" value={fmtCompact(totals.opens)} caption={fmtPct(totals.openRate) + ' open rate'} spark={monthly.map(m => m.opens)} delay={140} />
        </div>
        <div className="pl-4 lg:pl-5 pr-4 lg:pr-5">
          <StatTile label="Clicks" accent="moss" value={fmtCompact(totals.clicks)} caption={fmtPct(totals.avgCtr) + ' avg CTR'} spark={monthly.map(m => m.clicks)} delay={190} />
        </div>
        <div className="pl-4 lg:pl-5">
          <StatTile label="Open rate" accent="sky" value={fmtPct(totals.openRate)} caption="opens / delivered" spark={monthly.map(m => m.openRate)} delay={240} />
        </div>
      </section>

      <SectionHeading number="02" title="The funnel" caption="From inbox to click" />

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel title="Deliverability & engagement" eyebrow="Monthly" className="xl:col-span-2" delay={270}>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={monthly} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" {...AXIS_PROPS} />
              <YAxis yAxisId="left" {...AXIS_PROPS} tickFormatter={fmtCompact} />
              <YAxis yAxisId="right" orientation="right" {...AXIS_PROPS} tickFormatter={v => `${v}%`} />
              <Tooltip content={<ChartTooltip valueFormatter={fmtNumber} />} cursor={{ fill: 'rgba(20,17,10,0.03)' }} />
              <Legend iconType="square" wrapperStyle={{ paddingTop: 10 }} />
              <Bar yAxisId="left" dataKey="delivered" name="Delivered" fill={CHART_COLORS.violet} radius={[2, 2, 0, 0]} />
              <Bar yAxisId="left" dataKey="opens"     name="Opens"     fill={CHART_COLORS.coral} radius={[2, 2, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="openRate" name="Open rate (%)" stroke={CHART_COLORS.moss} strokeWidth={1.75} dot={{ r: 2.5, fill: CHART_COLORS.moss, strokeWidth: 0 }} activeDot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Open rate over time" eyebrow="Trendline" delay={310}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="edm-or" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.coral} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={CHART_COLORS.coral} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} tickFormatter={v => `${v}%`} />
              <Tooltip content={<ChartTooltip valueFormatter={v => (v ?? 0).toFixed(1)} suffix="%" />} cursor={{ stroke: CHART_COLORS.inkFaint }} />
              <Area type="monotone" dataKey="openRate" name="Open rate" stroke={CHART_COLORS.coral} strokeWidth={1.75} fill="url(#edm-or)" />
            </AreaChart>
          </ResponsiveContainer>
          <p className="mt-3 text-xs text-[color:var(--color-ink-mute)] leading-relaxed border-t border-[color:var(--color-rule-soft)] pt-3">
            The single most reliable signal of subject-line craft.
          </p>
        </Panel>
      </section>

      <SectionHeading number="03" title="Engagement leaders" caption="Top eight by open rate" />

      <Panel title="Top EDMs by open rate" eyebrow="Leaderboard" delay={340}>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={topEdms} layout="vertical" margin={{ top: 5, right: 30, left: 220, bottom: 0 }} barCategoryGap={10}>
            <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
            <XAxis type="number" {...AXIS_PROPS} tickFormatter={v => `${v}%`} />
            <YAxis dataKey="name" type="category" {...AXIS_PROPS} width={210} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return (
                  <div className="card px-3 py-2 text-xs max-w-xs" style={{ borderRadius: 2 }}>
                    <p className="kicker mb-1">Campaign</p>
                    <p className="text-[color:var(--color-ink)] font-medium mb-2 leading-snug">{d.fullName}</p>
                    <div className="space-y-1 tabular-nums text-[color:var(--color-ink-soft)]">
                      <p>Open rate · <span className="text-[color:var(--color-ink)] font-display font-semibold" style={{ letterSpacing: '-0.02em' }}>{fmtPct(d.openRate)}</span></p>
                      <p>Opens · <span className="text-[color:var(--color-ink)] font-display font-semibold" style={{ letterSpacing: '-0.02em' }}>{fmtNumber(d.opens)} / {fmtNumber(d.delivered)}</span></p>
                      <p>CTR · <span className="text-[color:var(--color-ink)] font-display font-semibold" style={{ letterSpacing: '-0.02em' }}>{fmtPct(d.ctr, 2)}</span></p>
                    </div>
                  </div>
                )
              }}
              cursor={{ fill: 'rgba(20,17,10,0.03)' }}
            />
            <Bar dataKey="openRate" name="Open rate (%)" radius={[0, 2, 2, 0]}>
              {topEdms.map((_, i) => (
                <Cell key={i} fill={i === 0 ? CHART_COLORS.coral : CHART_COLORS.violet} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  )
}
