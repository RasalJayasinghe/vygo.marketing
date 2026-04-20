export const CHART_COLORS = {
  violet: '#4d22d1',
  violetDeep: '#2d0fa3',
  violetSoft: '#b79fff',
  coral: '#d85a2e',
  coralDeep: '#a83f18',
  coralSoft: '#e9a385',
  moss: '#5d7047',
  mossSoft: '#8ea07a',
  ink: '#15141a',
  inkMute: '#6f6c79',
  inkFaint: '#a6a2ac',
  rule: '#e6e0d0',
}

export const CATEGORY_COLORS = {
  'Social Post': CHART_COLORS.violet,
  EDM: CHART_COLORS.coral,
  Webinar: CHART_COLORS.moss,
}

export const AXIS_PROPS = {
  tick: { fontSize: 10, fill: CHART_COLORS.inkMute, fontFamily: 'DM Sans' },
  stroke: 'transparent',
  tickLine: false,
  axisLine: false,
}

export const GRID_PROPS = {
  strokeDasharray: '0',
  stroke: '#efeadc',
  vertical: false,
}

export const CURSOR_PROPS = {
  stroke: '#c9c3b2',
  strokeWidth: 1,
  strokeDasharray: '2 4',
}
