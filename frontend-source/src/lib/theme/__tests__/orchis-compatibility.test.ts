import { beforeEach, describe, expect, it } from 'vitest'

import { applyThemePipeline, getComputedTokens } from '../pipeline'
import { exportThemeJSON, importThemeJSON, loadThemeConfig, saveThemePartial } from '../storage'
import { dashboardStyleToConfigValue, configValueToDashboardStyle } from '../style-config'
import {
  DEFAULT_DASHBOARD_STYLE,
  DASHBOARD_STYLES,
  defaultLightTokens,
  defaultBackgroundConfig,
} from '../tokens'
import type { DashboardStyle } from '../tokens'

beforeEach(() => localStorage.clear())

describe('Orchis alongside the built-in themes', () => {
  it('applies independent custom CSS and removes it when returning to other themes', () => {
    const config = {
      ...loadThemeConfig(),
      dashboardStyle: 'orchis' as const,
      styleCustomCSS: {
        orchis: '.orchis-user-style { color: red; }',
        modern: '.modern-user-style { color: blue; }',
      },
    }
    applyThemePipeline(config, false)
    expect(document.getElementById('maibot-custom-css')).toHaveTextContent('.orchis-user-style')
    applyThemePipeline({ ...config, dashboardStyle: 'modern' }, false)
    expect(document.getElementById('maibot-custom-css')).toHaveTextContent('.modern-user-style')
    expect(document.getElementById('maibot-custom-css')).not.toHaveTextContent('.orchis-user-style')
    applyThemePipeline({ ...config, dashboardStyle: 'millennium' }, false)
    expect(document.getElementById('maibot-custom-css')).not.toBeInTheDocument()
  })
  it('keeps all existing identifiers, numeric values and the installation default', () => {
    expect(DASHBOARD_STYLES).toEqual(['modern', 'future-retro', 'millennium', 'orchis'])
    expect(DEFAULT_DASHBOARD_STYLE).toBe('millennium')
    for (const [style, value] of [
      ['modern', 0],
      ['future-retro', 1],
      ['millennium', 2],
      ['orchis', 3],
    ] as const) {
      expect(dashboardStyleToConfigValue(style)).toBe(value)
      expect(configValueToDashboardStyle(value)).toBe(style)
    }
    expect(configValueToDashboardStyle(99)).toBe('modern')
  })

  it('round-trips Orchis and preserves the existing per-theme customizations', () => {
    saveThemePartial({
      dashboardStyle: 'modern',
      styleCustomCSS: {
        modern: '.existing { color: red; }',
        orchis: '.orchis-note { opacity: .9; }',
      },
      styleTokenOverrides: {
        modern: { color: { ...defaultLightTokens.color, primary: '1 2% 3%' } },
        millennium: { layout: { ...defaultLightTokens.layout, 'sidebar-width': '15rem' } },
      },
      styleBackgroundConfig: {
        'future-retro': { page: { ...defaultBackgroundConfig, type: 'none' } },
      },
    })
    const original = loadThemeConfig()
    saveThemePartial({ dashboardStyle: 'orchis' })
    const exported = exportThemeJSON()
    localStorage.clear()
    expect(importThemeJSON(exported)).toEqual({ success: true, errors: [] })
    expect(loadThemeConfig()).toEqual({ ...original, dashboardStyle: 'orchis' })
    for (const style of ['modern', 'future-retro', 'millennium'] as DashboardStyle[]) {
      saveThemePartial({ dashboardStyle: style })
      expect(loadThemeConfig().styleTokenOverrides).toEqual(original.styleTokenOverrides)
      expect(loadThemeConfig().styleBackgroundConfig).toEqual(original.styleBackgroundConfig)
      expect(loadThemeConfig().styleCustomCSS).toEqual(original.styleCustomCSS)
    }
  })

  it('uses its own dark palette without changing the built-in token inputs', () => {
    const config = loadThemeConfig()
    const builtIns = ['modern', 'future-retro', 'millennium'] as const
    const before = builtIns.map((style) =>
      getComputedTokens({ ...config, dashboardStyle: style }, false)
    )
    const orchis = getComputedTokens({ ...config, dashboardStyle: 'orchis' }, true)
    expect(orchis.color.background).toBe('223 33% 10%')
    expect(orchis.color.foreground).toBe('220 28% 92%')
    expect(orchis.layout['sidebar-width']).toBe('13rem')
    expect(getComputedTokens({ ...config, dashboardStyle: 'orchis' }, false).color.background).toBe(
      '222 36% 96%'
    )
    expect(
      builtIns.map((style) => getComputedTokens({ ...config, dashboardStyle: style }, false))
    ).toEqual(before)
    expect(config.dashboardStyle).toBe('millennium')
  })
})
