import { useMemo } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MetricCard, ChartCard, EmptyState } from '@/components/MetricCard.jsx'
import ChartTooltip from '@/components/ChartTooltip.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { Card } from '@/components/ui/card.jsx'
import { AXIS_PROPS, CHART_COLORS, GRID_PROPS } from '@/components/chartTheme.js'
import { fmtCompact, fmtNumber, fmtPct, shortMonth } from '@/components/format.js'
import { MONTHS_ORDER } from '@/hooks/useMarketingData.js'

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
      if (!monthMap.has(key)) monthMap.set(key, { month: r.month, year: r.year, label: shortMonth(r.month), delivered: 0, opens: 0, clicks: 0 })
      const m = monthMap.get(key)
      m.delivered += r.totalDelivered
      m.opens += r.totalOpens
      m.clicks += r.totalClicks
    }
    const monthly = [...monthMap.values()]
      .sort((a, b) => a.year !== b.year ? String(a.year).localeCompare(String(b.year)) : MONTHS_ORDER.indexOf(a.month) - MONTHS_ORDER.indexOf(b.month))
      .map(m => ({ ...m, openRate: m.delivered ? +((m.opens / m.delivered) * 100).toFixed(1) : 0 }))
    const topEdms = [...rows]
      .sort((a, b) => (b.totalDelivered - a.totalDelivered) || (b.totalOpens - a.totalOpens))
      .slice(0, 25)
    const openRate = delivered ? (opens / delivered) * 100 : 0
    return { totals: { delivered, opens, clicks, openRate, avgCtr: ctrCount ? ctrSum / ctrCount : 0, count: rows.length }, monthly, topEdms }
  }, [rows])

  if (rows.length === 0) return <EmptyState title="No EDMs in this range" message="Try widening the year or month filter." />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard icon="default" label="Campaigns" value={fmtNumber(totals.count)} />
        <MetricCard icon="default" label="Delivered" value={fmtCompact(totals.delivered)} hint={fmtNumber(totals.delivered)} />
        <MetricCard icon="opens" label="Opens" value={fmtCompact(totals.opens)} />
        <MetricCard icon="clicks" label="Clicks" value={fmtCompact(totals.clicks)} />
        <MetricCard icon="default" label="Open rate" value={fmtPct(totals.openRate)} />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ChartCard title="Delivered vs opens">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} tickFormatter={fmtCompact} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="delivered" name="Delivered" fill={CHART_COLORS.blueSoft} radius={[4, 4, 0, 0]} />
              <Bar dataKey="opens" name="Opens" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Open rate over time">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} tickFormatter={v => `${v}%`} />
              <Tooltip content={<ChartTooltip suffix="%" valueFormatter={v => (v ?? 0).toFixed(1)} />} />
              <Area type="monotone" dataKey="openRate" name="Open rate" stroke={CHART_COLORS.blue} strokeWidth={2} fill={CHART_COLORS.blueSoft} fillOpacity={0.35} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="text-right">Delivered</TableHead>
              <TableHead className="text-right">Opens</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">Open rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topEdms.map((r, i) => (
              <TableRow key={`${r.assetName}-${i}`}>
                <TableCell className="max-w-[280px] truncate font-medium">{r.assetName || 'Untitled EDM'}</TableCell>
                <TableCell className="max-w-[280px] truncate text-muted-foreground">{r.subject || r.notes || '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNumber(r.totalDelivered)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNumber(r.totalOpens)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNumber(r.totalClicks)}</TableCell>
                <TableCell className="text-right tabular-nums">{r.totalDelivered ? fmtPct((r.totalOpens / r.totalDelivered) * 100) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
