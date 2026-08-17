import { useMemo } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MetricCard, ChartCard, EmptyState } from '@/components/MetricCard.jsx'
import ChartTooltip from '@/components/ChartTooltip.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { Card } from '@/components/ui/card.jsx'
import { AXIS_PROPS, CHART_COLORS, GRID_PROPS } from '@/components/chartTheme.js'
import { fmtCompact, fmtNumber, fmtPct, shortMonth } from '@/components/format.js'
import { MONTHS_ORDER } from '@/hooks/useMarketingData.js'

export default function Podcasts({ data }) {
  const rows = useMemo(() => data.filter(r => r.assetType === 'Podcast'), [data])
  const { totals, monthly, leaderboard } = useMemo(() => {
    let downloads = 0, listens = 0, imp = 0, avgSum = 0, avgCount = 0
    const monthMap = new Map()
    for (const r of rows) {
      downloads += r.downloads
      listens += r.listens
      imp += r.impressions
      if (r.avgConsumption) { avgSum += r.avgConsumption; avgCount++ }
      const key = `${r.year}-${r.month}`
      if (!monthMap.has(key)) monthMap.set(key, { month: r.month, year: r.year, label: shortMonth(r.month), downloads: 0, listens: 0, episodes: 0 })
      const m = monthMap.get(key)
      m.downloads += r.downloads
      m.listens += r.listens
      m.episodes += 1
    }
    const monthly = [...monthMap.values()].sort((a, b) => a.year !== b.year ? String(a.year).localeCompare(String(b.year)) : MONTHS_ORDER.indexOf(a.month) - MONTHS_ORDER.indexOf(b.month))
    const leaderboard = [...rows].filter(r => (r.downloads || r.listens) > 0).sort((a, b) => (b.downloads || b.listens) - (a.downloads || a.listens)).slice(0, 10)
    return { totals: { downloads, listens, imp, avgConsumption: avgCount ? avgSum / avgCount : 0, count: rows.length }, monthly, leaderboard }
  }, [rows])

  if (rows.length === 0) {
    return <EmptyState title="No episodes in this range" message='Add rows tagged "Podcast" to the source sheet, or widen the date filter.' />
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard icon="podcast" label="Episodes" value={fmtNumber(totals.count)} />
        <MetricCard icon="default" label="Downloads" value={fmtCompact(totals.downloads)} />
        <MetricCard icon="default" label="Listens" value={fmtCompact(totals.listens)} />
        <MetricCard icon="default" label="Avg completion" value={fmtPct(totals.avgConsumption)} />
        <MetricCard icon="impressions" label="Impressions" value={fmtCompact(totals.imp)} />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ChartCard title="Downloads over time">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} tickFormatter={fmtCompact} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="downloads" name="Downloads" stroke={CHART_COLORS.blue} strokeWidth={2} fill={CHART_COLORS.blueSoft} fillOpacity={0.35} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Episodes published">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="episodes" name="Episodes" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Episode</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead className="text-right">Downloads</TableHead>
              <TableHead className="text-right">Listens</TableHead>
              <TableHead className="text-right">Completion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.map((r, i) => (
              <TableRow key={`${r.assetName}-${i}`}>
                <TableCell className="max-w-[360px] truncate font-medium">{r.assetName}</TableCell>
                <TableCell className="text-muted-foreground">{r.guestName || '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNumber(r.downloads)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNumber(r.listens)}</TableCell>
                <TableCell className="text-right tabular-nums">{r.avgConsumption ? fmtPct(r.avgConsumption) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
