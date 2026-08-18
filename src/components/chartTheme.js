export const CHART_COLORS = {
  blue: '#0160f7',
  blueDeep: '#0148c4',
  blueSoft: '#dbe8ff',
  sky: '#00a2ff',
  skyLight: '#5cb8e6',
  ink: '#0b1020',
  mute: '#6b7385',
}

export const CATEGORY_COLORS = {
  'Social Post': CHART_COLORS.blue,
  EDM: CHART_COLORS.sky,
  Webinar: CHART_COLORS.blueDeep,
  Podcast: CHART_COLORS.skyLight,
}

export const AXIS_PROPS = {
  tick: { fontSize: 11, fill: '#6b7385', fontFamily: 'DM Sans' },
  stroke: 'transparent',
  tickLine: false,
  axisLine: false,
}

export const GRID_PROPS = {
  strokeDasharray: '0',
  stroke: '#f1f3f7',
  vertical: false,
}

export const CURSOR_PROPS = {
  stroke: '#c9cdd7',
  strokeWidth: 1,
}
