import { useMemo } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { MetricCard, ChartCard, EmptyState } from '@/components/MetricCard.jsx'
import ChartTooltip from '@/components/ChartTooltip.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { Card } from '@/components/ui/card.jsx'
import { AXIS_PROPS, CHART_COLORS, GRID_PROPS } from '@/components/chartTheme.js'
import { fmtCompact, fmtNumber, fmtPct, shortMonth } from '@/components/format.js'
import { MONTHS_ORDER } from '@/hooks/useMarketingData.js'

function sortByMonthKey(a, b) {
  return MONTHS_ORDER.indexOf(a.monthFull) - MONTHS_ORDER.indexOf(b.monthFull)
}

export default function Overview({ data }) {
  const { totals, trend, bySource } = useMemo(() => {
    let imp = 0, clicks = 0, delivered = 0, opens = 0, regs = 0, atts = 0, ctrSum = 0, ctrCount = 0
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
        monthMap.set(yk, { monthFull: mk, year: r.year, label: shortMonth(mk), impressions: 0, clicks: 0, opens: 0, registrations: 0 })
      }
      const mb = monthMap.get(yk)
      mb.impressions += r.impressions
      mb.clicks += r.totalClicks
      mb.opens += r.totalOpens
      mb.registrations += r.registrations

      const t = r.assetType || 'Other'
      if (!typeAggMap.has(t)) typeAggMap.set(t, { type: t, records: 0, impressions: 0, clicks: 0, opens: 0, registrations: 0, delivered: 0 })
      const ta = typeAggMap.get(t)
      ta.records += 1
      ta.impressions += r.impressions
      ta.clicks += r.totalClicks
      ta.opens += r.totalOpens
      ta.registrations += r.registrations
      ta.delivered += r.totalDelivered
    }

    const trend = [...monthMap.values()].sort((a, b) => {
      if (a.year !== b.year) return String(a.year).localeCompare(String(b.year))
      return sortByMonthKey(a, b)
    })

    const bySource = ['Social Post', 'EDM', 'Campaign', 'Form', 'Landing Page', 'Webinar', 'Podcast']
      .map(cat => typeAggMap.get(cat))
      .filter(Boolean)

    return {
      totals: { imp, clicks, delivered, opens, regs, atts, avgCtr: ctrCount ? ctrSum / ctrCount : 0 },
      trend,
      bySource,
    }
  }, [data])

  if (data.length === 0) {
    return <EmptyState title="No data in this range" message="Try widening the year or month filter." />
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard icon="impressions" label="Impressions" value={fmtCompact(totals.imp)} hint={fmtNumber(totals.imp)} />
        <MetricCard icon="clicks" label="Clicks" value={fmtCompact(totals.clicks)} hint={`${fmtPct(totals.avgCtr)} avg CTR`} />
        <MetricCard icon="opens" label="Opens" value={fmtCompact(totals.opens)} hint={`${fmtCompact(totals.delivered)} delivered`} />
        <MetricCard icon="registrations" label="Registrations" value={fmtCompact(totals.regs)} />
        <MetricCard icon="default" label="Attendees" value={fmtCompact(totals.atts)} />
        <MetricCard icon="default" label="Avg CTR" value={fmtPct(totals.avgCtr)} />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <ChartCard title="Impressions over time">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="g-imp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.blue} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} tickFormatter={fmtCompact} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="impressions" name="Impressions" stroke={CHART_COLORS.blue} strokeWidth={2} fill="url(#g-imp)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Clicks by channel">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={bySource} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="type" {...AXIS_PROPS} />
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
              <TableHead>Channel</TableHead>
              <TableHead className="text-right">Records</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">Opens</TableHead>
              <TableHead className="text-right">Registrations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bySource.map(row => (
              <TableRow key={row.type}>
                <TableCell className="font-medium">{row.type}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNumber(row.records)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNumber(row.impressions)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNumber(row.clicks)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNumber(row.opens)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNumber(row.registrations)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
