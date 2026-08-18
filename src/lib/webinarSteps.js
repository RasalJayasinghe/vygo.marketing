// Plain step metadata shared by the webinar system and the projects board.
// Kept free of components so the projects board can stay in the main bundle
// while WebinarWorkflow remains lazy-loaded.
export const WEBINAR_STEPS = [
  { id: 'edm', label: 'EDM creation', short: 'EDMs' },
  { id: 'future-campus', label: 'Future Campus email to Jayson', short: 'Email Jayson' },
  { id: 'zoom', label: 'Zoom event & guest invites', short: 'Zoom event' },
  { id: 'chase', label: 'Chase Joel / Lyndon', short: 'Chase Joel' },
  { id: 'guest-response', label: 'Guest response', short: 'Guest confirms' },
  { id: 'brief', label: 'Brief & questions', short: 'Brief' },
]

export function stepIndex(id) {
  return WEBINAR_STEPS.findIndex(s => s.id === id)
}
