import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ThemeProviderContext, type ThemeProviderState } from '@/lib/theme-context'
import { OrchisEvolutionButton } from './OrchisEvolutionButton'

const mocks = vi.hoisted(() => ({
  dispose: vi.fn(),
  audioDispose: vi.fn(),
  play: vi.fn(() => new Promise<boolean>(() => {})),
}))
vi.mock('@tanstack/react-router', () => ({ useRouterState: () => '/' }))
vi.mock('./native-evolution', () => ({
  createOrchisEvolution: () => ({ play: mocks.play, dispose: mocks.dispose, cancel: vi.fn() }),
  createOrchisEvolutionAudio: () => ({ play: vi.fn(), stop: vi.fn(), dispose: mocks.audioDispose }),
}))
describe('hero removal during a transition', () => {
  it('disposes the controller and sound without committing a stale theme change', () => {
    const setTheme = vi.fn()
    const display = document.createElement('div')
    display.setAttribute('data-orchis-character-display', '')
    document.body.append(display)
    const context = { resolvedTheme: 'light', setTheme } as unknown as ThemeProviderState
    const page = render(
      <ThemeProviderContext.Provider value={context}>
        <OrchisEvolutionButton />
      </ThemeProviderContext.Provider>
    )
    fireEvent.click(screen.getByRole('button', { name: '进化立绘，切换为深色模式' }))
    fireEvent(window, new Event('orchis:hero-unmounted'))
    expect(mocks.dispose).toHaveBeenCalledOnce()
    expect(mocks.audioDispose).toHaveBeenCalledOnce()
    expect(setTheme).not.toHaveBeenCalled()
    page.unmount()
    display.remove()
    expect(mocks.dispose).toHaveBeenCalledOnce()
  })
})
