import {
  FileText, Globe, LayoutGrid, Mail, Megaphone, Mic2, Share2, Sparkles, Video,
} from 'lucide-react'

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
  { id: 'tool-webinar', label: 'Webinar brief', icon: Sparkles },
  { id: 'tool-podcast', label: 'Podcast repurposer', icon: Mic2 },
]

export const PAGE_META = {
  overview: { section: 'Dashboards', crumb: 'Performance Marketing overview', title: 'Performance Marketing overview' },
  social: { section: 'Dashboards', crumb: 'Social Posts', title: 'Social Posts' },
  edm: { section: 'Dashboards', crumb: 'EDMs', title: 'EDMs' },
  campaigns: { section: 'Dashboards', crumb: 'Campaigns', title: 'HubSpot campaigns' },
  forms: { section: 'Dashboards', crumb: 'Forms', title: 'Forms' },
  pages: { section: 'Dashboards', crumb: 'Landing pages', title: 'Landing pages' },
  webinar: { section: 'Dashboards', crumb: 'Webinars', title: 'Webinars' },
  podcast: { section: 'Dashboards', crumb: 'Podcasts', title: 'Podcasts' },
  'tool-webinar': {
    section: 'Tools',
    crumb: 'Webinar brief',
    title: 'Webinar campaign builder',
    description: 'Turn a topic and speaker details into ready-to-use marketing assets.',
  },
  'tool-podcast': {
    section: 'Tools',
    crumb: 'Podcast repurposer',
    title: 'Podcast repurposer',
    description: 'Extract one sharp idea from a transcript for LinkedIn and Spotify.',
  },
}

export function isToolTab(tab) {
  return tab.startsWith('tool-')
}
