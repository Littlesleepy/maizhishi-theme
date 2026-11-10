import { useContext, useEffect, useRef } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { ThemeProviderContext } from '@/lib/theme-context'
import { createOrchisEvolution, createOrchisEvolutionAudio } from './native-evolution'
import type { EvolutionController } from './native-evolution'

/** The existing theme provider stays authoritative; this gesture supplies the visual transition. */
export function OrchisEvolutionButton({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useContext(ThemeProviderContext)
  const pathname = useRouterState({ select: state => state.location.pathname })
  const button = useRef<HTMLButtonElement>(null)
  const active = useRef<{ display: HTMLElement; controller: EvolutionController } | null>(null)
  const sound = useRef<ReturnType<typeof createOrchisEvolutionAudio> | null>(null)
  const intended = useRef<string | null>(null)
  const evolved = resolvedTheme === 'dark'
  useEffect(() => {
    const clear = () => {
      active.current?.controller.dispose()
      active.current = null
      sound.current?.dispose()
      sound.current = null
      intended.current = null
    }
    window.addEventListener('orchis:hero-unmounted', clear)
    return () => { window.removeEventListener('orchis:hero-unmounted', clear); clear() }
  }, [pathname])
  useEffect(() => {
    if (intended.current && intended.current !== resolvedTheme) {
      active.current?.controller.cancel()
      sound.current?.stop()
      intended.current = null
    }
  }, [resolvedTheme])
  const switchTheme = () => {
    if (!button.current || button.current.disabled) return
    const next = evolved ? 'light' : 'dark'
    if (!sound.current) {
      const audio = new Audio('/themes/orchis/native/assets/audio/card-preview-evolve.wav')
      audio.preload = 'auto'
      sound.current = createOrchisEvolutionAudio(audio)
    }
    void sound.current.play()
    const display = document.querySelector<HTMLElement>('[data-orchis-character-display]')
    if (active.current?.display !== display) {
      active.current?.controller.dispose()
      active.current = display ? { display, controller:createOrchisEvolution(display,button.current) } : null
    }
    intended.current = next
    const commit = () => setTheme(next)
    if (active.current) void active.current.controller.play(commit)
    else commit()
  }
  return <button ref={button} type="button" className={`orchis-evolution-toggle ${className}`}
    aria-label={evolved ? '返回进化前立绘，切换为浅色模式' : '进化立绘，切换为深色模式'}
    aria-pressed={evolved} onClick={switchTheme}>{evolved ? '返回' : '进化'}</button>
}
