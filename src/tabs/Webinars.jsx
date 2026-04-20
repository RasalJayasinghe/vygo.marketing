import { useMemo } from 'react'
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Legend, Cell,
} from 'recharts'
import Panel from '../components/Panel.jsx'
import StatTile from '../components/StatTile.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import ChartTooltip from '../components/ChartTooltip.jsx'
import { AXIS_PROPS, CHART_COLORS, GRID_PROPS } from '../components/chartTheme.js'
import { fmtCompact, fmtNumber, fmtPct, shortMonth, truncate } from '../components/format.js'
import { MONTHS_ORDER } from '../hooks/useMarketingData.js'

export default function Webinars({ data }) {
  const rows = useMemo(() => data.filter(r => r.assetType === 'Webinar'), [data])

  const { totals, monthly, leaderboard } = useMemo(() => {
    let regs = 0, atts = 0, imp = 0, clicks = 0
    const monthMap = new Map()

    for (const r of rows) {
      regs += r.registrations
      atts += r.attendees
      imp += r.impressions
      clicks += r.totalClicks

      const key = `${r.year}-${r.month}`
      if (!monthMap.has(key)) {
        monthMap.set(key, { key, month: r.month, year: r.year, label: shortMonth(r.month), registrations: 0, attendees: 0, impressions: 0, clicks: 0 })
      }
      const m = monthMap.get(key)
      m.registrations += r.registrations
      m.attendees += r.attendees
      m.impressions += r.impressions
      m.clicks += r.totalClicks
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
        attendRate: m.registrations ? +((m.attendees / m.registrations) * 100).toFixed(1) : 0,
        noShow: Math.max(m.registrations - m.attendees, 0),
      }))

    const leaderboard = [...rows]
      .filter(r => r.registrations > 0)
      .sort((a, b) => b.registrations - a.registrations)
      .slice(0, 6)
      .map(r => ({
        name: r.assetName,
        short: truncate(r.assetName, 48),
        registrations: r.registrations,
        attendees: r.attendees,
        rate: r.registrations ? (r.attendees / r.registrations) * 100 : 0,
      }))

    const attendRate = regs ? (atts / regs) * 100 : 0

    return {
      totals: { regs, atts, imp, clicks, attendRate, count: rows.length },
      monthly,
      leaderboard,
    }
  }, [rows])

  if (rows.length === 0) {
    return (
      <div className="card py-16 text-center">
        <p className="kicker">Webinars</p>
        <p className="mt-2 font-display text-2xl text-[color:var(--color-ink)]">No webinars in this range</p>
        <p className="text-sm text-[color:var(--color-ink-mute)] mt-1">Try adjusting the year or month.</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <SectionHeading number="01" title="Headline figures" caption="Registrations through to attendance" />

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-x-8 gap-y-4 divide-x divide-[color:var(--color-rule-soft)] lg:divide-x">
        <div className="pr-4 lg:pr-5">
          <StatTile label="Webinars" accent="ink" value={fmtNumber(totals.count)} caption="sessions" delay={40} />
        </div>
        <div className="pl-4 lg:pl-5 pr-4 lg:pr-5">
          <StatTile label="Registrations" accent="violet" value={fmtCompact(totals.regs)} caption={fmtNumber(totals.regs)} spark={monthly.map(m => m.registrations)} delay={90} />
        </div>
        <div className="pl-4 lg:pl-5 pr-4 lg:pr-5">
          <StatTile label="Attendees" accent="moss" value={fmtCompact(totals.atts)} caption={fmtNumber(totals.atts)} spark={monthly.map(m => m.attendees)} delay={140} />
        </div>
        <div className="pl-4 lg:pl-5 pr-4 lg:pr-5">
          <StatTile label="Attend rate" accent="coral" value={fmtPct(totals.attendRate)} caption="attended / registered" spark={monthly.map(m => m.attendRate)} delay={190} />
        </div>
        <div className="pl-4 lg:pl-5">
          <StatTile label="Impressions" accent="sky" value={fmtCompact(totals.imp)} caption="reach driven" spark={monthly.map(m => m.impressions)} delay={240} />
        </div>
      </section>

      <SectionHeading number="02" title="The funnel" caption="Registered vs attended, month-by-month" />

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel title="Registrations & attendance" eyebrow="Monthly" className="xl:col-span-2" delay={270}>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={monthly} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" {...AXIS_PROPS} />
              <YAxis yAxisId="left" {...AXIS_PROPS} tickFormatter={fmtCompact} />
              <YAxis yAxisId="right" orientation="right" {...AXIS_PROPS} tickFormatter={v => `${v}%`} />
              <Tooltip content={<ChartTooltip valueFormatter={fmtNumber} />} cursor={{ fill: 'rgba(20,17,10,0.03)' }} />
              <Legend iconType="square" wrapperStyle={{ paddingTop: 10 }} />
              <Bar yAxisId="left" dataKey="registrations" name="Registrations" fill={CHART_COLORS.violet} radius={[2, 2, 0, 0]} />
              <Bar yAxisId="left" dataKey="attendees"     name="Attendees"     fill={CHART_COLORS.moss} radius={[2, 2, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="attendRate" name="Attend rate (%)" stroke={CHART_COLORS.coral} strokeWidth={1.75} dot={{ r: 2.5, fill: CHART_COLORS.coral, strokeWidth: 0 }} activeDot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Webinar leaderboard" eyebrow="Highest demand" delay={310}>
          <ul className="space-y-4">
            {leaderboard.length === 0 && (
              <li className="text-xs text-[color:var(--color-ink-faint)]">No webinars with registrations yet.</li>
            )}
            {leaderboard.map((w, i) => {
              const pct = Math.max(0, Math.min(100, w.rate))
              return (
                <li key={`${w.name}-${i}`}>
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <p className="text-[13px] text-[color:var(--color-ink)] leading-snug">
                      <span className="section-no mr-2.5" style={{ fontSize: 13 }}>{String(i + 1).padStart(2, '0')}</span>
                      {w.short}
                    </p>
                    <p className="font-display font-semibold tabular-nums shrink-0 text-[color:var(--color-ink)] text-[16px]" style={{ letterSpacing: '-0.02em' }}>
                      {fmtPct(w.rate, 0)}
                    </p>
                  </div>
                  <div className="relative h-[3px] bg-[color:var(--color-rule-soft)] overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{ width: `${pct}%`, background: CHART_COLORS.moss }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[color:var(--color-ink-mute)] tabular-nums">
                    <span><span className="text-[color:var(--color-ink)] font-medium">{fmtNumber(w.attendees)}</span> attended</span>
                    <span className="text-[color:var(--color-ink-faint)]">·</span>
                    <span><span className="text-[color:var(--color-ink)] font-medium">{fmtNumber(w.registrations)}</span> registered</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>
      </section>

      <SectionHeading number="03" title="Attendance anatomy" caption="Show against no-show" />

      <Panel title="Show vs no-show" eyebrow="Stacked by month" delay={340}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthly} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} barCategoryGap="18%">
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="label" {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} tickFormatter={fmtCompact} />
            <Tooltip content={<ChartTooltip valueFormatter={fmtNumber} />} cursor={{ fill: 'rgba(20,17,10,0.03)' }} />
            <Legend iconType="square" wrapperStyle={{ paddingTop: 10 }} />
            <Bar dataKey="attendees" name="Attended" stackId="a">
              {monthly.map((_, i) => <Cell key={i} fill={CHART_COLORS.moss} />)}
            </Bar>
            <Bar dataKey="noShow" name="No-show" stackId="a" radius={[2, 2, 0, 0]}>
              {monthly.map((_, i) => <Cell key={i} fill={CHART_COLORS.mossSoft} opacity={0.5} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  )
}
