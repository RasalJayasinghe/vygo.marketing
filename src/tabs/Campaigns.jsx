import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MetricCard, ChartCard, EmptyState } from '@/components/MetricCard.jsx'
import ChartTooltip from '@/components/ChartTooltip.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Card } from '@/components/ui/card.jsx'
import { AXIS_PROPS, CHART_COLORS, GRID_PROPS } from '@/components/chartTheme.js'
import { fmtNumber, shortMonth } from '@/components/format.js'
import { MONTHS_ORDER } from '@/hooks/useMarketingData.js'

function statusLabel(value) {
  if (!value) return '—'
  return String(value).replaceAll('_', ' ')
}

export default function Campaigns({ data }) {
  const rows = useMemo(() => data.filter(r => r.assetType === 'Campaign'), [data])
  const { totals, monthly, table } = useMemo(() => {
    const monthMap = new Map()
    const statusMap = new Map()
    for (const r of rows) {
      const key = `${r.year}-${r.month}`
      if (!monthMap.has(key)) monthMap.set(key, { month: r.month, year: r.year, label: shortMonth(r.month) || r.year || '—', campaigns: 0 })
      monthMap.get(key).campaigns += 1
      const status = statusLabel(r.campaignStatus)
      statusMap.set(status, (statusMap.get(status) || 0) + 1)
    }
    const monthly = [...monthMap.values()]
      .sort((a, b) => a.year !== b.year ? String(a.year).localeCompare(String(b.year)) : MONTHS_ORDER.indexOf(a.month) - MONTHS_ORDER.indexOf(b.month))
    const table = [...rows].sort((a, b) => String(b.startDate || b.year).localeCompare(String(a.startDate || a.year)))
    return {
      totals: { count: rows.length, withDates: rows.filter(r => r.startDate).length, statuses: statusMap.size },
      monthly,
      table,
    }
  }, [rows])

  if (rows.length === 0) {
    return <EmptyState title="No HubSpot campaigns in this range" message="Try widening the year or month filter." />
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MetricCard icon="default" label="Campaigns" value={fmtNumber(totals.count)} />
        <MetricCard icon="default" label="Dated" value={fmtNumber(totals.withDates)} hint="Have a start date" />
        <MetricCard icon="default" label="Statuses" value={fmtNumber(totals.statuses)} />
      </div>
      <ChartCard title="Campaigns started">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="label" {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="campaigns" name="Campaigns" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>UTM</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.map((r, i) => (
              <TableRow key={`${r.assetName}-${i}`}>
                <TableCell className="max-w-[320px] truncate font-medium">{r.assetName}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{r.startDate || '—'}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{r.endDate || '—'}</TableCell>
                <TableCell>
                  {r.campaignStatus
                    ? <Badge>{statusLabel(r.campaignStatus)}</Badge>
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="max-w-[180px] truncate text-muted-foreground">{r.utm || '—'}</TableCell>
                <TableCell className="max-w-[280px] truncate text-muted-foreground">{r.notes || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
