import { useMemo } from 'react'
import { MetricCard, EmptyState } from '@/components/MetricCard.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx'
import { Card } from '@/components/ui/card.jsx'
import { fmtNumber } from '@/components/format.js'

export default function Forms({ data }) {
  const rows = useMemo(
    () => [...data.filter(r => r.assetType === 'Form')].sort((a, b) => String(b.year).localeCompare(String(a.year))),
    [data]
  )

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No HubSpot forms yet"
        message="Forms will appear here once the service key includes the forms scope and HUBSPOT_TOKEN is recopied."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard icon="registrations" label="Forms" value={fmtNumber(rows.length)} />
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Form</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Month</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={`${r.assetName}-${i}`}>
                <TableCell className="max-w-[420px] truncate font-medium">{r.assetName}</TableCell>
                <TableCell className="tabular-nums">{r.year || '—'}</TableCell>
                <TableCell>{r.month || '—'}</TableCell>
                <TableCell className="max-w-[360px] truncate text-muted-foreground">{r.notes || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
