import { useMemo } from 'react'
import { useMarketingData } from './useMarketingData.js'
import { useHubSpotData } from './useHubSpotData.js'

const HUBSPOT_ENABLED = import.meta.env.VITE_HUBSPOT_ENABLED === 'true'
// Webinars, social, and podcasts always come from the master sheet.
const SHEET_OWNED_TYPES = new Set(['Webinar', 'Social Post', 'Podcast'])

export function useDashboardData() {
  const sheet = useMarketingData()
  const hubspot = useHubSpotData({ enabled: HUBSPOT_ENABLED })

  const data = useMemo(() => {
    if (!HUBSPOT_ENABLED) return sheet.data
    const covered = new Set(
      hubspot.data.map(r => r.assetType).filter(type => type && !SHEET_OWNED_TYPES.has(type))
    )
    const sheetRest = sheet.data.filter(r => !covered.has(r.assetType))
    return [...hubspot.data.filter(r => !SHEET_OWNED_TYPES.has(r.assetType)), ...sheetRest]
  }, [sheet.data, hubspot.data])

  const lastUpdated = HUBSPOT_ENABLED
    ? [sheet.lastUpdated, hubspot.lastUpdated].filter(Boolean).sort((a, b) => b - a)[0] || null
    : sheet.lastUpdated

  return {
    data,
    loading: HUBSPOT_ENABLED ? (sheet.loading && sheet.data.length === 0) : sheet.loading,
    error: sheet.error,
    warning: HUBSPOT_ENABLED ? hubspot.warning : null,
    lastUpdated,
    source: HUBSPOT_ENABLED ? 'hubspot+sheet' : 'sheet',
  }
}
