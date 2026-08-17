import { useMemo } from 'react'
import { MetricCard, EmptyState } from '@/components/MetricCard.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { Card } from '@/components/ui/card.jsx'
import { fmtCompact, fmtNumber } from '@/components/format.js'

export default function LandingPages({ data }) {
  const rows = useMemo(
    () => [...data.filter(r => r.assetType === 'Landing Page')].sort((a, b) => b.impressions - a.impressions),
    [data]
  )
  const views = rows.reduce((n, r) => n + r.impressions, 0)

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No HubSpot landing pages yet"
        message="Landing pages will appear here once the service key includes the content scope and HUBSPOT_TOKEN is recopied."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard icon="default" label="Landing pages" value={fmtNumber(rows.length)} />
        <MetricCard icon="impressions" label="Page views" value={fmtCompact(views)} />
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              <TableHead>URL</TableHead>
              <TableHead className="text-right">Views</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={`${r.assetName}-${i}`}>
                <TableCell className="max-w-[320px] truncate font-medium">{r.assetName}</TableCell>
                <TableCell className="max-w-[360px] truncate text-muted-foreground">{r.url || r.notes || '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtNumber(r.impressions)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
