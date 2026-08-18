import { useEffect, useState } from 'react'
import {
  HelpCircle, Home, Menu, PanelLeftClose, RefreshCw, Search, X,
} from 'lucide-react'
import { DASHBOARDS, PAGE_META, SYSTEMS, TOOLS, WORKSPACE, isDashboardTab } from '@/config/navigation.js'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Select } from '@/components/ui/select.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { cn } from '@/lib/utils'

function formatTimeAgo(date) {
  if (!date) return 'syncing…'
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 8) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

function isDesktop() {
  return window.matchMedia('(min-width: 768px)').matches
}

export default function AppShell({
  tab,
  onTabChange,
  years,
  months,
  year,
  month,
  onYear,
  onMonth,
  lastUpdated,
  loading,
  children,
}) {
  const [, tick] = useState(0)
  const [query, setQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const meta = PAGE_META[tab] || PAGE_META.overview
  const showFilters = isDashboardTab(tab)

  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 15_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setSidebarOpen(isDesktop())
  }, [])

  useEffect(() => {
    if (!sidebarOpen) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarOpen])

  useEffect(() => {
    if (sidebarOpen && !isDesktop()) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  const normalizedQuery = query.trim().toLowerCase()
  const visibleDashboards = DASHBOARDS.filter(item =>
    !normalizedQuery || item.label.toLowerCase().includes(normalizedQuery)
  )
  const visibleTools = TOOLS.filter(item =>
    !normalizedQuery || item.label.toLowerCase().includes(normalizedQuery)
  )
  const visibleSystems = SYSTEMS.filter(item =>
    !normalizedQuery || item.label.toLowerCase().includes(normalizedQuery)
  )
  const visibleWorkspace = WORKSPACE.filter(item =>
    !normalizedQuery || item.label.toLowerCase().includes(normalizedQuery)
  )

  const selectTab = (id) => {
    onTabChange(id)
    if (!isDesktop()) setSidebarOpen(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-brand-gradient z-50 flex h-14 items-center justify-between px-4 text-white lg:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(open => !open)}
            className="text-white/85 hover:bg-white/15 hover:text-white"
          >
            {sidebarOpen ? <PanelLeftClose /> : <Menu />}
          </Button>
          <img
            src="/brand/vygo-wordmark-white.png"
            alt="Vygo"
            className="h-[22px] w-auto select-none"
          />
          <span className="h-5 w-px bg-white/30" aria-hidden="true" />
          <span className="text-[15px] font-medium tracking-tight">Marketing Hub</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-white/85 hover:bg-white/15 hover:text-white">
            <Search />
          </Button>
          <Button variant="ghost" size="icon" className="text-white/85 hover:bg-white/15 hover:text-white">
            <HelpCircle />
          </Button>
          <div className="ml-1 flex items-center gap-2 pl-2">
            <span className="grid size-7 place-items-center rounded-full bg-white/20 text-[11px] font-medium text-white ring-1 ring-white/30">VM</span>
            <span className="hidden text-[12px] text-white/90 sm:block">Vygo Marketing</span>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 top-14 z-30 bg-black/35 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={cn(
            'z-40 flex w-[248px] shrink-0 flex-col border-r border-border bg-white transition-transform duration-200 ease-out',
            'fixed inset-x-auto bottom-0 left-0 top-14 md:static md:top-auto md:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
          )}
        >
          <div className="flex items-center gap-2 p-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search"
                className="h-8 bg-muted/70 pl-8"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
              className="size-8 shrink-0 text-muted-foreground md:hidden"
            >
              <X className="size-4" />
            </Button>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 pb-4">
            <NavItem icon={Home} label="Home" active={tab === 'overview'} onClick={() => selectTab('overview')} />
            {visibleWorkspace.map(item => (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={tab === item.id}
                onClick={() => selectTab(item.id)}
              />
            ))}

            {visibleDashboards.length > 0 && (
              <>
                <p className="mt-4 mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Metrics & Analytics</p>
                {visibleDashboards.map(item => (
                  <NavItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={tab === item.id}
                    onClick={() => selectTab(item.id)}
                  />
                ))}
              </>
            )}

            {visibleTools.length > 0 && (
              <>
                <p className="mt-4 mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tools</p>
                {visibleTools.map(item => (
                  <NavItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={tab === item.id}
                    onClick={() => selectTab(item.id)}
                  />
                ))}
              </>
            )}

            {visibleSystems.length > 0 && (
              <>
                <p className="mt-4 mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Systems</p>
                {visibleSystems.map(item => (
                  <NavItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={tab === item.id}
                    onClick={() => selectTab(item.id)}
                  />
                ))}
              </>
            )}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-border bg-white px-5 py-4 lg:px-7">
            <p className="text-[12px] text-muted-foreground">
              Home <span className="mx-1.5 text-[#c9cdd7]">›</span>
              {meta.section} <span className="mx-1.5 text-[#c9cdd7]">›</span>
              <span className="text-foreground">{meta.crumb}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-[26px] font-semibold tracking-tight text-foreground">{meta.title}</h1>
                {meta.description && (
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{meta.description}</p>
                )}
              </div>
              {showFilters && (
                <Button size="sm">Share</Button>
              )}
            </div>
            {showFilters && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select value={year} onChange={e => onYear(e.target.value)}>
                  {years.map(y => <option key={y} value={y}>{y === 'All' ? 'All years' : y}</option>)}
                </Select>
                <Select value={month} onChange={e => onMonth(e.target.value)}>
                  {months.map(m => <option key={m} value={m}>{m === 'All' ? 'All months' : m}</option>)}
                </Select>
                <span className="ml-1 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
                  Refreshed {formatTimeAgo(lastUpdated)}
                </span>
                <Badge variant="live">{loading ? 'Syncing' : 'Live'}</Badge>
              </div>
            )}
          </div>

          <main className="flex-1 overflow-y-auto p-5 lg:p-7">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2 py-[7px] text-left text-[13px]',
        active ? 'bg-brand-soft font-medium text-brand' : 'text-foreground hover:bg-muted'
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.7} />
      {label}
    </button>
  )
}
