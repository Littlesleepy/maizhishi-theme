import { useContext, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { MessageSquare } from 'lucide-react'
import { ThemeProviderContext } from '@/lib/theme-context'

const assets = '/themes/orchis/native/assets'
export function OrchisHero() {
  const { resolvedTheme } = useContext(ThemeProviderContext)
  useEffect(
    () => () => {
      window.dispatchEvent(new Event('orchis:hero-unmounted'))
    },
    []
  )
  return (
    <section className="character-card" data-frame="display" aria-label="奥契丝与洛伊德">
      <div
        className="character-display"
        data-orchis-character-display
        data-evolution={resolvedTheme === 'dark' ? 'evolved' : 'base'}
      >
        <div className="character-picture">
          <img
            src={`${assets}/orchis-${resolvedTheme === 'light' ? 'day' : 'night'}.jpg`}
            alt={`奥契丝与洛伊德，${resolvedTheme === 'light' ? '进化前日景' : '进化后月夜'}原画`}
          />
          <div className="scene-vignette" />
          <div className="character-caption">
            <span className="character-kicker">
              <img src={`${assets}/hd/utx_icon_class_nemesis.png`} alt="超越者徽记" />
              SHADOWVERSE · WORLDS BEYOND
            </span>
            <h2 className="orchis-hero-title">
              <span>循着银线，</span>
              <span>与你再次相逢</span>
            </h2>
            <span className="orchis-name">ORCHIS</span>
          </div>
          <small className="art-credit">© Cygames, Inc.</small>
        </div>
        <img
          className="character-display-frame"
          src={`${assets}/hd/ui_card_base_card_frame.png`}
          alt=""
          aria-hidden="true"
        />
      </div>
      <div className="character-chapter" aria-hidden="true">
        <span>人偶与心</span>
        <i />
        <small>ORCHIS &amp; LLOYD</small>
      </div>
      <div className="character-action">
        <Link to="/chat" className="game-button continue-button">
          <MessageSquare size={15} />
          <span>继续对话</span>
          <b>→</b>
        </Link>
      </div>
    </section>
  )
}
