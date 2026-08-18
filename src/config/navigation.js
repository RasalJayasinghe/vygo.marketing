import {
  BookOpen, FileText, FolderKanban, Globe, LayoutGrid, Mail, Megaphone, Mic2, Share2, Video,
} from 'lucide-react'

export const WORKSPACE = [
  { id: 'projects', label: 'Projects', icon: FolderKanban },
]

export const SYSTEMS = [
  { id: 'system-webinars', label: 'Webinars', icon: Video },
]

export const DASHBOARDS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'social', label: 'Social Posts', icon: Share2 },
  { id: 'edm', label: 'EDMs', icon: Mail },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'forms', label: 'Forms', icon: FileText },
  { id: 'pages', label: 'Landing pages', icon: Globe },
  { id: 'webinar', label: 'Webinars', icon: Video },
  { id: 'podcast', label: 'Podcasts', icon: Mic2 },
]

export const TOOLS = [
  { id: 'tool-podcast', label: 'Podcast repurposer', icon: Mic2 },
  { id: 'tool-skills', label: 'Skills', icon: BookOpen },
]

export const PAGE_META = {
  projects: {
    section: 'Workspace',
    crumb: 'Projects',
    title: 'Projects',
    description: 'Every webinar and campaign in one place — to-do lists, progress, and what happened when.',
  },
  overview: { section: 'Metrics & Analytics', crumb: 'Performance Marketing overview', title: 'Performance Marketing overview' },
  social: { section: 'Metrics & Analytics', crumb: 'Social Posts', title: 'Social Posts' },
  edm: { section: 'Metrics & Analytics', crumb: 'EDMs', title: 'EDMs' },
  campaigns: { section: 'Metrics & Analytics', crumb: 'Campaigns', title: 'HubSpot campaigns' },
  forms: { section: 'Metrics & Analytics', crumb: 'Forms', title: 'Forms' },
  pages: { section: 'Metrics & Analytics', crumb: 'Landing pages', title: 'Landing pages' },
  webinar: { section: 'Metrics & Analytics', crumb: 'Webinars', title: 'Webinars' },
  podcast: { section: 'Metrics & Analytics', crumb: 'Podcasts', title: 'Podcasts' },
  'tool-podcast': {
    section: 'Tools',
    crumb: 'Podcast repurposer',
    title: 'Podcast repurposer',
    description: 'Extract one sharp idea from a transcript for LinkedIn and Spotify.',
  },
  'tool-skills': {
    section: 'Tools',
    crumb: 'Skills',
    title: 'Marketing skills library',
    description: 'Voice profiles and playbooks the team can copy into an email, or reuse as an agent skill in Cursor/Claude.',
  },
  'system-webinars': {
    section: 'Systems',
    crumb: 'Webinars',
    title: 'Webinar projects',
    description: 'Track every webinar from first meeting through guest chase, speaker sign-off, promo, and wrap.',
  },
}

export function isToolTab(tab) {
  return tab.startsWith('tool-')
}

export function isSystemTab(tab) {
  return tab.startsWith('system-')
}

// Only the Google Sheet / HubSpot dashboards use the year + month filters and
// the live-sync chrome.
export function isDashboardTab(tab) {
  return DASHBOARDS.some(item => item.id === tab)
}
