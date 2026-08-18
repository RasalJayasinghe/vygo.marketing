import { useEffect, useState } from 'react'
import {
  Database, FolderOpen, HelpCircle, Home, RefreshCw, Search,
} from 'lucide-react'
import { DASHBOARDS, PAGE_META, SYSTEMS, TOOLS, isSystemTab, isToolTab } from '@/config/navigation.js'
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
  const meta = PAGE_META[tab] || PAGE_META.overview
  const showFilters = !isToolTab(tab) && !isSystemTab(tab)

  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 15_000)
    return () => clearInterval(id)
  }, [])

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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="z-20 flex h-12 items-center justify-between bg-forest px-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-sm bg-white/10 text-[11px] font-bold tracking-tight">V</span>
            <span className="text-[15px] font-semibold tracking-tight">Vygo</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-white/80 hover:bg-white/10 hover:text-white">
            <Search />
          </Button>
          <Button variant="ghost" size="icon" className="text-white/80 hover:bg-white/10 hover:text-white">
            <HelpCircle />
          </Button>
          <div className="ml-1 flex items-center gap-2 pl-2">
            <span className="grid size-7 place-items-center rounded-full bg-[#c9a36a] text-[11px] font-semibold text-forest">VM</span>
            <span className="hidden text-[12px] sm:block">Vygo Marketing</span>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[248px] shrink-0 border-r border-border bg-white md:flex md:flex-col">
          <div className="p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search"
                className="h-8 bg-muted/70 pl-8"
              />
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 pb-4">
            <NavItem icon={Home} label="Home" active={tab === 'overview'} onClick={() => onTabChange('overview')} />

            {visibleDashboards.length > 0 && (
              <>
                <p className="mt-4 mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Dashboards</p>
                {visibleDashboards.map(item => (
                  <NavItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={tab === item.id}
                    onClick={() => onTabChange(item.id)}
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
                    onClick={() => onTabChange(item.id)}
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
                    onClick={() => onTabChange(item.id)}
                  />
                ))}
              </>
            )}

            {!normalizedQuery && (
              <>
                <p className="mt-4 mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Connect</p>
                <NavItem icon={Database} label="Data sources" muted />
                <NavItem icon={FolderOpen} label="Master sheet" muted />
              </>
            )}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-border bg-white px-5 py-4 lg:px-7">
            <p className="text-[12px] text-muted-foreground">
              Home <span className="mx-1.5 text-[#c5ccd6]">›</span>
              {meta.section} <span className="mx-1.5 text-[#c5ccd6]">›</span>
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
            <div className="mt-3 flex flex-col gap-2 md:hidden">
              <div className="flex gap-1 overflow-x-auto scroll-slim">
                {DASHBOARDS.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      'shrink-0 rounded-md px-2.5 py-1.5 text-[12px] font-medium',
                      tab === item.id ? 'bg-coral-soft text-coral' : 'text-muted-foreground'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 overflow-x-auto scroll-slim">
                {TOOLS.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      'shrink-0 rounded-md px-2.5 py-1.5 text-[12px] font-medium',
                      tab === item.id ? 'bg-coral-soft text-coral' : 'text-muted-foreground'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <main className="flex-1 overflow-y-auto p-5 lg:p-7">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

function NavItem({ icon: Icon, label, active, muted, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2 py-[7px] text-left text-[13px]',
        active && 'bg-coral-soft font-medium text-coral',
        !active && !muted && 'text-foreground hover:bg-muted',
        muted && 'cursor-default text-muted-foreground'
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.7} />
      {label}
    </button>
  )
}
