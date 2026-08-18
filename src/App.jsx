import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { filterData, useFilterState } from './hooks/useMarketingData.js'
import { useDashboardData } from './hooks/useDashboardData.js'
import { isDashboardTab } from './config/navigation.js'
import AppShell from './components/AppShell.jsx'
import { Card, CardContent } from './components/ui/card.jsx'

const Overview = lazy(() => import('./tabs/Overview.jsx'))
const SocialPosts = lazy(() => import('./tabs/SocialPosts.jsx'))
const EDMs = lazy(() => import('./tabs/EDMs.jsx'))
const Campaigns = lazy(() => import('./tabs/Campaigns.jsx'))
const Forms = lazy(() => import('./tabs/Forms.jsx'))
const LandingPages = lazy(() => import('./tabs/LandingPages.jsx'))
const Webinars = lazy(() => import('./tabs/Webinars.jsx'))
const Podcasts = lazy(() => import('./tabs/Podcasts.jsx'))
const PodcastRepurposer = lazy(() => import('./tools/PodcastRepurposer.jsx'))
const Skills = lazy(() => import('./tools/Skills.jsx'))
const WebinarWorkflow = lazy(() => import('./systems/WebinarWorkflow.jsx'))
const ProjectsBoard = lazy(() => import('./projects/ProjectsBoard.jsx'))

export default function App() {
  const [tab, setTab] = useState('overview')
  const [workflowProjectId, setWorkflowProjectId] = useState(null)
  const { data, loading, error, warning, lastUpdated } = useDashboardData()
  const { year, month, years, months, setYear, setMonth } = useFilterState(data)
  const filtered = useMemo(() => filterData(data, year, month), [data, year, month])
  const isDashboard = isDashboardTab(tab)

  const openWorkflow = useCallback((projectId) => {
    setWorkflowProjectId(projectId)
    setTab('system-webinars')
  }, [])

  const clearWorkflowProject = useCallback(() => setWorkflowProjectId(null), [])

  return (
    <AppShell
      tab={tab}
      onTabChange={setTab}
      years={years}
      months={months}
      year={year}
      month={month}
      onYear={setYear}
      onMonth={setMonth}
      lastUpdated={lastUpdated}
      loading={loading && data.length === 0}
    >
      {isDashboard && error && (
        <Card className="mb-5 border-[#f6c9c9] bg-[#fdf2f2]">
          <CardContent className="py-4">
            <p className="text-sm font-semibold text-destructive">Connection error</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}
      {isDashboard && !error && warning && (
        <Card className="mb-5 border-[#f7dcae] bg-[#fef8ec]">
          <CardContent className="py-4">
            <p className="text-sm font-semibold text-foreground">HubSpot connected with limited scopes</p>
            <p className="mt-1 text-sm text-muted-foreground">{warning}</p>
          </CardContent>
        </Card>
      )}

      {isDashboard && loading && data.length === 0 && (
        <div className="grid min-h-[320px] place-items-center">
          <p className="text-sm text-muted-foreground">Syncing live data…</p>
        </div>
      )}

      <Suspense fallback={<div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>}>
        {tab === 'tool-podcast' && <PodcastRepurposer />}
        {tab === 'tool-skills' && <Skills />}
        {tab === 'projects' && <ProjectsBoard onOpenWorkflow={openWorkflow} />}
        {tab === 'system-webinars' && (
          <WebinarWorkflow
            initialProjectId={workflowProjectId}
            onConsumeInitialProject={clearWorkflowProject}
          />
        )}

        {isDashboard && data.length > 0 && (
          <>
            {tab === 'overview' && <Overview data={filtered} />}
            {tab === 'social' && <SocialPosts data={filtered} />}
            {tab === 'edm' && <EDMs data={filtered} />}
            {tab === 'campaigns' && <Campaigns data={filtered} />}
            {tab === 'forms' && <Forms data={filtered} />}
            {tab === 'pages' && <LandingPages data={filtered} />}
            {tab === 'webinar' && <Webinars data={filtered} />}
            {tab === 'podcast' && <Podcasts data={filtered} />}
          </>
        )}
      </Suspense>
    </AppShell>
  )
}
