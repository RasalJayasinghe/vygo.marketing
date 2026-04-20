export function fmtCompact(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, '') + 'M'
  if (abs >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, '') + 'K'
  return String(Math.round(n))
}

export function fmtNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return Math.round(n).toLocaleString('en-US')
}

export function fmtPct(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return `${n.toFixed(digits)}%`
}

export function shortMonth(m) {
  if (!m) return ''
  return m.slice(0, 3)
}

export function truncate(str, n) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n - 1).trimEnd() + '…' : str
}
