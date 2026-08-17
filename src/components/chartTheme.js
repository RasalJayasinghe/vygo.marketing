export const CHART_COLORS = {
  blue: '#4d8dff',
  blueSoft: '#c9ddff',
  green: '#3aa37a',
  coral: '#e35d4a',
  amber: '#d7a13a',
  ink: '#1c2430',
  mute: '#8a93a1',
}

export const CATEGORY_COLORS = {
  'Social Post': CHART_COLORS.blue,
  EDM: CHART_COLORS.coral,
  Webinar: CHART_COLORS.green,
  Podcast: CHART_COLORS.amber,
}

export const AXIS_PROPS = {
  tick: { fontSize: 11, fill: '#8a93a1', fontFamily: 'IBM Plex Sans' },
  stroke: 'transparent',
  tickLine: false,
  axisLine: false,
}

export const GRID_PROPS = {
  strokeDasharray: '0',
  stroke: '#eef1f5',
  vertical: false,
}

export const CURSOR_PROPS = {
  stroke: '#d5dae2',
  strokeWidth: 1,
}
