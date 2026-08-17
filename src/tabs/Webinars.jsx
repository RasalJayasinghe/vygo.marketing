import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MetricCard, ChartCard, EmptyState } from '@/components/MetricCard.jsx'
import ChartTooltip from '@/components/ChartTooltip.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { Card } from '@/components/ui/card.jsx'
import { AXIS_PROPS, CHART_COLORS, GRID_PROPS } from '@/components/chartTheme.js'
import { fmtCompact, fmtNumber, fmtPct, shortMonth } from '@/components/format.js'
import { MONTHS_ORDER } from '@/hooks/useMarketingData.js'

function sortWebinars(a, b) {
  if (a.year !== b.year) return String(b.year).localeCompare(String(a.year))
  const mi = MONTHS_ORDER.indexOf(a.month) - MONTHS_ORDER.indexOf(b.month)
  if (mi) return mi > 0 ? -1 : 1
  return (b.registrations || 0) - (a.registrations || 0)
}

export default function Webinars({ data }) {
  const rows = useMemo(
    () => data.filter(r => r.assetType === 'Webinar' && r.assetName).sort(sortWebinars),
    [data]
  )
  const { totals, monthly } = useMemo(() => {
    let regs = 0, atts = 0, imp = 0, clicks = 0
    const monthMap = new Map()
    for (const r of rows) {
      regs += r.registrations
      atts += r.attendees
      imp += r.impressions
      clicks += r.totalClicks
      const key = `${r.year}-${r.month}`
      if (!monthMap.has(key)) monthMap.set(key, { month: r.month, year: r.year, label: `${shortMonth(r.month)} ${String(r.year).slice(2)}`, registrations: 0, attendees: 0, noShow: 0 })
      const m = monthMap.get(key)
      m.registrations += r.registrations
      m.attendees += r.attendees
      m.noShow += Math.max(r.registrations - r.attendees, 0)
    }
    const monthly = [...monthMap.values()].sort((a, b) => a.year !== b.year ? String(a.year).localeCompare(String(b.year)) : MONTHS_ORDER.indexOf(a.month) - MONTHS_ORDER.indexOf(b.month))
    return { totals: { regs, atts, imp, clicks, attendRate: regs ? (atts / regs) * 100 : 0, count: rows.length }, monthly }
  }, [rows])

  if (rows.length === 0) return <EmptyState title="No webinars in this range" message="Try widening the year or month filter." />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard icon="default" label="Webinars" value={fmtNumber(totals.count)} />
        <MetricCard icon="registrations" label="Registrations" value={fmtCompact(totals.regs)} />
        <MetricCard icon="default" label="Attendees" value={fmtCompact(totals.atts)} />
        <MetricCard icon="default" label="Attend rate" value={fmtPct(totals.attendRate)} />
        <MetricCard icon="impressions" label="Impressions" value={fmtCompact(totals.imp)} />
      </div>
      <ChartCard title="Registrations vs attendees">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="label" {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} tickFormatter={fmtCompact} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="registrations" name="Registrations" fill={CHART_COLORS.blueSoft} radius={[4, 4, 0, 0]} />
            <Bar dataKey="attendees" name="Attendees" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Webinar</TableHead>
              <TableHead>When</TableHead>
              <TableHead className="text-right">Registrations</TableHead>
              <TableHead className="text-right">Attendees</TableHead>
              <TableHead className="text-right">Attend rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={`${r.year}-${r.month}-${r.assetName}-${i}`}>
                <TableCell className="max-w-[480px] truncate font-medium">{r.assetName}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{[r.month, r.year].filter(Boolean).join(' ') || '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNumber(r.registrations)}</TableCell>
                <TableCell className="text-right tabular-nums">{r.attendees ? fmtNumber(r.attendees) : '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{r.registrations ? fmtPct((r.attendees / r.registrations) * 100) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
