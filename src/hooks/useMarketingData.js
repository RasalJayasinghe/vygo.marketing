import { useEffect, useMemo, useRef, useState } from 'react'
import Papa from 'papaparse'

const MONTHS_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRjoTHipQXX-v17OZCOVsgJEXKrpnEVrCsalmIn72uInoJNbK_QnW2jqKZFY-16bDyr8G3ZzrXu8oSw/pub?output=csv'
const NUMERIC_CLEANUP = /[,%\s]/g
const AUTO_REFRESH_MS = 60_000

function parseNum(val) {
  if (val === undefined || val === null || val === '') return 0
  const n = parseFloat(String(val).replace(NUMERIC_CLEANUP, ''))
  return Number.isFinite(n) ? n : 0
}

function parseOpensField(raw) {
  if (!raw) return { opens: 0, sent: 0 }
  const str = String(raw).trim()
  if (str.includes('/')) {
    const [a, b] = str.split('/')
    return { opens: parseNum(a), sent: parseNum(b) }
  }
  return { opens: parseNum(str), sent: 0 }
}

function normaliseAssetType(raw) {
  const v = String(raw || '').trim().toLowerCase()
  if (!v) return ''
  if (v.startsWith('social')) return 'Social Post'
  if (v === 'edm' || v.includes('email')) return 'EDM'
  if (v.startsWith('webinar')) return 'Webinar'
  return raw.trim()
}

function mapRow(row) {
  const norm = {}
  Object.keys(row).forEach(k => { norm[k.trim()] = row[k] })

  const year = String(norm['Year'] || '').trim()
  const month = String(norm['Month'] || '').trim()
  const assetType = normaliseAssetType(norm['Asset Type'])
  const assetName = String(norm['Asset Name / Topic'] || norm['Asset Name/Topic'] || norm['Asset Name'] || norm['Topic'] || '').trim()

  if (!assetType && !assetName) return null
  if (!month && !assetName) return null

  const { opens: parsedOpens, sent: parsedSent } = parseOpensField(norm['Total Opens'])
  const totalDelivered = parseNum(norm['Total Delivered']) || parsedSent

  return {
    year,
    month,
    assetType,
    assetName,
    impressions: parseNum(norm['Impressions']),
    totalClicks: parseNum(norm['Total Clicks']),
    totalOpens: parsedOpens,
    totalDelivered,
    ctr: parseNum(norm['CTR (%)'] ?? norm['CTR']),
    registrations: parseNum(norm['Registrations']),
    attendees: parseNum(norm['Attendees']),
    notes: String(norm['Notes'] || '').trim(),
  }
}

export function useMarketingData() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    function fetchData(showLoading = true) {
      if (showLoading) setLoading(true)
      Papa.parse(`${CSV_URL}&t=${Date.now()}`, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (cancelled) return
          const parsed = results.data.map(mapRow).filter(Boolean)
          setData(parsed)
          setError(null)
          setLoading(false)
          setLastUpdated(new Date())
        },
        error: (err) => {
          if (cancelled) return
          setError(err.message || 'Failed to fetch data')
          setLoading(false)
        },
      })
    }

    fetchData(true)
    timerRef.current = setInterval(() => fetchData(false), AUTO_REFRESH_MS)

    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return { data, loading, error, lastUpdated }
}

export function filterData(data, year, month) {
  if (year === 'All' && month === 'All') return data
  return data.filter(row => {
    if (year !== 'All' && row.year !== year) return false
    if (month !== 'All' && row.month !== month) return false
    return true
  })
}

export function getYears(data) {
  const years = [...new Set(data.map(r => r.year).filter(Boolean))].sort()
  return ['All', ...years]
}

export function getMonths(data, year) {
  const rows = year === 'All' ? data : data.filter(r => r.year === year)
  const months = [...new Set(rows.map(r => r.month).filter(Boolean))]
  months.sort((a, b) => {
    const ai = MONTHS_ORDER.indexOf(a)
    const bi = MONTHS_ORDER.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
  return ['All', ...months]
}

export function sortMonths(monthsIn) {
  return [...monthsIn].sort((a, b) => {
    const ai = MONTHS_ORDER.indexOf(a)
    const bi = MONTHS_ORDER.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
}

export { MONTHS_ORDER }

export function useFilterState(data) {
  const [year, setYear] = useState('All')
  const [month, setMonth] = useState('All')

  const years = useMemo(() => getYears(data), [data])
  const months = useMemo(() => getMonths(data, year), [data, year])

  useEffect(() => {
    if (year !== 'All' && !years.includes(year)) setYear('All')
  }, [years, year])

  function updateYear(next) {
    setYear(next)
    setMonth('All')
  }

  return { year, month, years, months, setYear: updateYear, setMonth }
}
