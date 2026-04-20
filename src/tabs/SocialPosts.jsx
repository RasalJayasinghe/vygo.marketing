import { useMemo } from 'react'
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Legend, LabelList, Cell,
} from 'recharts'
import Panel from '../components/Panel.jsx'
import StatTile from '../components/StatTile.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import ChartTooltip from '../components/ChartTooltip.jsx'
import { AXIS_PROPS, CHART_COLORS, GRID_PROPS } from '../components/chartTheme.js'
import { fmtCompact, fmtNumber, fmtPct, shortMonth, truncate } from '../components/format.js'
import { MONTHS_ORDER } from '../hooks/useMarketingData.js'

export default function SocialPosts({ data }) {
  const rows = useMemo(() => data.filter(r => r.assetType === 'Social Post'), [data])

  const { totals, monthly, topPosts, distribution } = useMemo(() => {
    let imp = 0, clicks = 0, ctrSum = 0, ctrCount = 0
    const monthMap = new Map()
    const ctrBuckets = { low: 0, mid: 0, high: 0, hero: 0 }

    for (const r of rows) {
      imp += r.impressions
      clicks += r.totalClicks
      if (r.ctr) { ctrSum += r.ctr; ctrCount++ }

      const key = `${r.year}-${r.month}`
      if (!monthMap.has(key)) {
        monthMap.set(key, { key, month: r.month, year: r.year, label: shortMonth(r.month), impressions: 0, clicks: 0, ctrSum: 0, count: 0 })
      }
      const m = monthMap.get(key)
      m.impressions += r.impressions
      m.clicks += r.totalClicks
      m.ctrSum += r.ctr
      m.count++

      if (r.ctr < 2) ctrBuckets.low++
      else if (r.ctr < 5) ctrBuckets.mid++
      else if (r.ctr < 10) ctrBuckets.high++
      else ctrBuckets.hero++
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
        avgCtr: m.count ? +(m.ctrSum / m.count).toFixed(2) : 0,
      }))

    const topPosts = [...rows]
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 8)
      .map(r => ({
        name: truncate(r.assetName, 46),
        fullName: r.assetName,
        impressions: r.impressions,
        clicks: r.totalClicks,
        ctr: r.ctr,
      }))

    const distribution = [
      { band: '< 2%', count: ctrBuckets.low, color: CHART_COLORS.inkFaint },
      { band: '2–5%', count: ctrBuckets.mid, color: CHART_COLORS.violetSoft },
      { band: '5–10%', count: ctrBuckets.high, color: CHART_COLORS.violet },
      { band: '10%+', count: ctrBuckets.hero, color: CHART_COLORS.coral },
    ]

    return {
      totals: { imp, clicks, avgCtr: ctrCount ? ctrSum / ctrCount : 0, posts: rows.length },
      monthly,
      topPosts,
      distribution,
    }
  }, [rows])

  if (rows.length === 0) {
    return (
      <div className="card py-16 text-center">
        <p className="kicker">Social Posts</p>
        <p className="mt-2 font-display text-2xl text-[color:var(--color-ink)]">No posts match these filters</p>
        <p className="text-sm text-[color:var(--color-ink-mute)] mt-1">Try widening the year or month selection.</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <SectionHeading number="01" title="Headline figures" caption="Reach & engagement at a glance" />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-4 divide-x divide-[color:var(--color-rule-soft)] lg:divide-x">
        <div className="pr-5 lg:pr-6">
          <StatTile label="Posts" accent="ink" value={fmtNumber(totals.posts)} caption="live entries" delay={40} />
        </div>
        <div className="pl-5 lg:pl-6 pr-5 lg:pr-6">
          <StatTile label="Impressions" accent="violet" value={fmtCompact(totals.imp)} caption={fmtNumber(totals.imp) + ' total'} spark={monthly.map(m => m.impressions)} delay={90} />
        </div>
        <div className="pl-5 lg:pl-6 pr-5 lg:pr-6">
          <StatTile label="Clicks" accent="coral" value={fmtCompact(totals.clicks)} caption={fmtNumber(totals.clicks) + ' total'} spark={monthly.map(m => m.clicks)} delay={140} />
        </div>
        <div className="pl-5 lg:pl-6">
          <StatTile label="Avg CTR" accent="moss" value={fmtPct(totals.avgCtr)} caption="per-post weighted" spark={monthly.map(m => m.avgCtr)} delay={190} />
        </div>
      </section>

      <SectionHeading number="02" title="Reach & resonance" caption="Impressions against click-through" />

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel title="Impressions vs average CTR" eyebrow="Monthly" className="xl:col-span-2" delay={220}>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={monthly} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" {...AXIS_PROPS} />
              <YAxis yAxisId="left" {...AXIS_PROPS} tickFormatter={fmtCompact} />
              <YAxis yAxisId="right" orientation="right" {...AXIS_PROPS} tickFormatter={v => `${v}%`} />
              <Tooltip content={<ChartTooltip valueFormatter={fmtNumber} />} cursor={{ fill: 'rgba(20,17,10,0.03)' }} />
              <Legend iconType="square" wrapperStyle={{ paddingTop: 10 }} />
              <Bar yAxisId="left" dataKey="impressions" name="Impressions" fill={CHART_COLORS.violet} radius={[2, 2, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="avgCtr" name="Avg CTR (%)" stroke={CHART_COLORS.coral} strokeWidth={1.75} dot={{ r: 2.5, fill: CHART_COLORS.coral, strokeWidth: 0 }} activeDot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="CTR distribution" eyebrow="Quality buckets" delay={260}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={distribution} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="band" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} allowDecimals={false} />
              <Tooltip content={<ChartTooltip valueFormatter={fmtNumber} />} cursor={{ fill: 'rgba(20,17,10,0.03)' }} />
              <Bar dataKey="count" name="Posts" radius={[2, 2, 0, 0]}>
                {distribution.map(d => <Cell key={d.band} fill={d.color} />)}
                <LabelList dataKey="count" position="top" fill={CHART_COLORS.ink} fontSize={11} fontFamily="DM Sans" fontWeight={500} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-4 text-xs text-[color:var(--color-ink-mute)] leading-relaxed border-t border-[color:var(--color-rule-soft)] pt-3">
            Posts above <span className="text-[color:var(--color-ink)] font-medium">10% CTR</span> are hero content.
            Study them for recurring themes and hooks.
          </p>
        </Panel>
      </section>

      <SectionHeading number="03" title="Top of the fold" caption="Eight posts with the greatest reach" />

      <Panel title="Top posts by impressions" eyebrow="Leaderboard" delay={300}>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={topPosts} layout="vertical" margin={{ top: 5, right: 30, left: 220, bottom: 0 }} barCategoryGap={10}>
            <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
            <XAxis type="number" {...AXIS_PROPS} tickFormatter={fmtCompact} />
            <YAxis dataKey="name" type="category" {...AXIS_PROPS} width={210} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return (
                  <div className="card px-3 py-2 text-xs max-w-xs" style={{ borderRadius: 2 }}>
                    <p className="kicker mb-1">Post</p>
                    <p className="text-[color:var(--color-ink)] font-medium mb-2 leading-snug">{d.fullName}</p>
                    <div className="space-y-1 tabular-nums text-[color:var(--color-ink-soft)]">
                      <p>Impressions · <span className="text-[color:var(--color-ink)] font-display font-semibold" style={{ letterSpacing: '-0.02em' }}>{fmtNumber(d.impressions)}</span></p>
                      <p>Clicks · <span className="text-[color:var(--color-ink)] font-display font-semibold" style={{ letterSpacing: '-0.02em' }}>{fmtNumber(d.clicks)}</span></p>
                      <p>CTR · <span className="text-[color:var(--color-ink)] font-display font-semibold" style={{ letterSpacing: '-0.02em' }}>{fmtPct(d.ctr, 2)}</span></p>
                    </div>
                  </div>
                )
              }}
              cursor={{ fill: 'rgba(20,17,10,0.03)' }}
            />
            <Bar dataKey="impressions" name="Impressions" radius={[0, 2, 2, 0]}>
              {topPosts.map((_, i) => (
                <Cell key={i} fill={i === 0 ? CHART_COLORS.coral : CHART_COLORS.violet} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  )
}
