import { useMemo } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MetricCard, ChartCard, EmptyState } from '@/components/MetricCard.jsx'
import ChartTooltip from '@/components/ChartTooltip.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { Card } from '@/components/ui/card.jsx'
import { AXIS_PROPS, CHART_COLORS, GRID_PROPS } from '@/components/chartTheme.js'
import { fmtCompact, fmtNumber, fmtPct, shortMonth } from '@/components/format.js'
import { MONTHS_ORDER } from '@/hooks/useMarketingData.js'

export default function SocialPosts({ data }) {
  const rows = useMemo(() => data.filter(r => r.assetType === 'Social Post'), [data])
  const { totals, monthly, topPosts } = useMemo(() => {
    let imp = 0, clicks = 0, ctrSum = 0, ctrCount = 0
    const monthMap = new Map()
    for (const r of rows) {
      imp += r.impressions
      clicks += r.totalClicks
      if (r.ctr) { ctrSum += r.ctr; ctrCount++ }
      const key = `${r.year}-${r.month}`
      if (!monthMap.has(key)) monthMap.set(key, { month: r.month, year: r.year, label: shortMonth(r.month), impressions: 0, clicks: 0 })
      const m = monthMap.get(key)
      m.impressions += r.impressions
      m.clicks += r.totalClicks
    }
    const monthly = [...monthMap.values()].sort((a, b) => {
      if (a.year !== b.year) return String(a.year).localeCompare(String(b.year))
      return MONTHS_ORDER.indexOf(a.month) - MONTHS_ORDER.indexOf(b.month)
    })
    const topPosts = [...rows].sort((a, b) => b.impressions - a.impressions).slice(0, 10)
    return { totals: { imp, clicks, avgCtr: ctrCount ? ctrSum / ctrCount : 0, posts: rows.length }, monthly, topPosts }
  }, [rows])

  if (rows.length === 0) return <EmptyState title="No social posts in this range" message="Try widening the year or month filter." />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard icon="default" label="Posts" value={fmtNumber(totals.posts)} />
        <MetricCard icon="impressions" label="Impressions" value={fmtCompact(totals.imp)} hint={fmtNumber(totals.imp)} />
        <MetricCard icon="clicks" label="Clicks" value={fmtCompact(totals.clicks)} />
        <MetricCard icon="default" label="Avg CTR" value={fmtPct(totals.avgCtr)} />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ChartCard title="Impressions over time">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} tickFormatter={fmtCompact} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="impressions" name="Impressions" stroke={CHART_COLORS.blue} strokeWidth={2} fill={CHART_COLORS.blueSoft} fillOpacity={0.35} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Clicks over time">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} tickFormatter={fmtCompact} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="clicks" name="Clicks" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Post</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">CTR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topPosts.map((r, i) => (
              <TableRow key={`${r.assetName}-${i}`}>
                <TableCell className="max-w-[420px] truncate font-medium">{r.assetName || 'Untitled post'}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNumber(r.impressions)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNumber(r.totalClicks)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtPct(r.ctr, 2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
