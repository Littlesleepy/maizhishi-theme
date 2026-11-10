import { useContext } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeProvider } from '../theme-provider'
import { ThemeProviderContext } from '@/lib/theme-context'
import { getBotConfig, updateBotConfigSection } from '@/lib/config-api'
import { THEME_STORAGE_KEYS, saveThemePartial } from '@/lib/theme/storage'
import { DASHBOARD_STYLES } from '@/lib/theme/tokens'
import type { DashboardStyle } from '@/lib/theme/tokens'

vi.mock('@/lib/config-api', () => ({ getBotConfig: vi.fn(), updateBotConfigSection: vi.fn() }))
vi.mock('@/lib/theme/millennium-font', () => ({
  applyMillenniumFonts: vi.fn(),
  loadMillenniumFont: () => 'departure',
  loadMillenniumCjkFont: () => 'system',
}))

function Controls() {
  const context = useContext(ThemeProviderContext)
  return (
    <>
      {DASHBOARD_STYLES.map((style) => (
        <button key={style} onClick={() => context.updateThemeConfig({ dashboardStyle: style })}>
          {style}
        </button>
      ))}
    </>
  )
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(THEME_STORAGE_KEYS.MODE, 'light')
  vi.mocked(getBotConfig).mockResolvedValue({} as Awaited<ReturnType<typeof getBotConfig>>)
  vi.mocked(updateBotConfigSection).mockResolvedValue(
    {} as Awaited<ReturnType<typeof updateBotConfigSection>>
  )
})
afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('style')
  document.documentElement.removeAttribute('data-dashboard-style')
})

describe('theme selection isolation', () => {
  const styles: DashboardStyle[] = ['modern', 'future-retro', 'millennium', 'orchis']
  for (const origin of styles)
    for (const target of styles.filter((style) => style !== origin)) {
      it(`${origin} → ${target} restores the proper palette and keeps the saved mode`, async () => {
        saveThemePartial({ dashboardStyle: origin })
        render(
          <ThemeProvider>
            <Controls />
          </ThemeProvider>
        )
        await waitFor(() => expect(document.documentElement.dataset.dashboardStyle).toBe(origin))
        fireEvent.click(screen.getByRole('button', { name: target }))
        await waitFor(() => expect(document.documentElement.dataset.dashboardStyle).toBe(target))
        expect(document.documentElement).toHaveClass('light')
        expect(localStorage.getItem(THEME_STORAGE_KEYS.MODE)).toBe('light')
        expect(updateBotConfigSection).toHaveBeenLastCalledWith('webui', {
          webui_style: styles.indexOf(target),
        })
      })
    }
  it('accepts the fourth server value on refresh without falling back to modern', async () => {
    vi.mocked(getBotConfig).mockResolvedValue({ webui: { webui_style: 3 } } as Awaited<
      ReturnType<typeof getBotConfig>
    >)
    render(
      <ThemeProvider>
        <Controls />
      </ThemeProvider>
    )
    await waitFor(() => expect(document.documentElement.dataset.dashboardStyle).toBe('orchis'))
    expect(document.documentElement).toHaveClass('light')
    expect(localStorage.getItem(THEME_STORAGE_KEYS.MODE)).toBe('light')
  })
})
