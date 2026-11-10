import type { DashboardStyle } from './tokens'

export type WebUIStyleConfigValue = 0 | 1 | 2 | 3

const configValues: Record<DashboardStyle, WebUIStyleConfigValue> = {
  modern: 0,
  'future-retro': 1,
  millennium: 2,
  orchis: 3,
}

export function dashboardStyleToConfigValue(style: DashboardStyle): WebUIStyleConfigValue {
  return configValues[style]
}

export function configValueToDashboardStyle(value: unknown): DashboardStyle {
  const numeric = Number(value)
  if (numeric === 3) return 'orchis'
  if (numeric === 2) return 'millennium'
  return numeric === 1 ? 'future-retro' : 'modern'
}
