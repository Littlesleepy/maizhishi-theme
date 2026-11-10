import type { ReactNode } from 'react'

const images: Record<string, string> = {
  home: 'glyph-home',
  chat: 'utx_ic_mtv_message',
  model: 'utx_ic_deck',
  adapter: 'utx_ic_link_card',
  book: 'glyph-solo',
  plugin: 'utx_ic_puzzle',
  market: 'glyph-shop',
  log: 'utx_ic_log',
  prompt: 'utx_ic_input',
  news: 'utx_ic_information',
  cache: 'utx_ic_change',
}
const lines: Record<string, string> = {
  trend: 'M3 3v18h18M6 15l5-5 4 3 6-8',
  tokens: 'M4 17h4v4H4v-4Zm6-6h4v10h-4V11Zm6-8h4v18h-4V3ZM4 14V9m6-1V5',
  cost: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM8 6l4 6 4-6M8 12h8m-8 4h8m-4-4v7',
  uptime: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4v6l4 3',
  storage: 'M3 7h18v14H3V7Zm-1-4h20v4H2V3Zm7 9h6',
  settings:
    'M9 3h6l1 3 3 1 2 3-2 2v3l2 2-2 3-3-1-2 2H9l-1-3-3-1-2-3 2-2v-3L3 8l2-3 3 1 1-3Z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  database: 'M3 6c0-4 18-4 18 0s-18 4-18 0Zm0 0v6c0 4 18 4 18 0V6M3 12v6c0 4 18 4 18 0v-6',
  distribution: 'M12 2v10h10A10 10 0 0 0 12 2Zm-4 1a10 10 0 1 0 13 13H8V3Z',
  spark: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z',
  daily: 'M4 5h16v16H4V5Zm3-3v6m10-6v6M4 10h16m-12 4h2m4 0h2m-8 4h2m4 0h2',
}
export function OrchisIcon({ name }: { name: string }) {
  return images[name] ? (
    <img
      className={`game-icon ${images[name].startsWith('glyph-') ? 'footer-icon' : ''}`}
      src={`/themes/orchis/native/assets/hd/${images[name]}.png`}
      alt=""
      aria-hidden="true"
    />
  ) : (
    <svg className="semantic-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={lines[name] || lines.settings} />
    </svg>
  )
}
export type FrameFamily = 'panel' | 'table' | 'utility' | 'story'
export function OrchisFrame({ family }: { family: FrameFamily }) {
  return (
    <>
      <i className={`frame-layer frame-${family}`} aria-hidden="true" />
      {family === 'panel' && <i className="frame-markers" aria-hidden="true" />}
    </>
  )
}
export function OrchisPanel({
  family = 'utility',
  title,
  icon,
  actions,
  children,
  className = '',
}: {
  family?: FrameFamily
  title: string
  icon?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`card ${className}`} data-frame={family}>
      <OrchisFrame family={family} />
      <div className="card-heading">
        <h2>
          {icon && <OrchisIcon name={icon} />} {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  )
}
export function NativePeriods({
  hours,
  onChange,
  label,
}: {
  hours: number
  onChange: (value: number) => void
  label: string
}) {
  return (
    <div className="periods" aria-label={label}>
      {[
        [24, '24小时'],
        [168, '7天'],
        [720, '30天'],
      ].map(([value, text]) => (
        <button
          type="button"
          key={value}
          className={hours === value ? 'active' : ''}
          aria-pressed={hours === value}
          onClick={() => onChange(Number(value))}
        >
          {text}
        </button>
      ))}
    </div>
  )
}
export function compactNative(value: number) {
  return value >= 1e6
    ? `${(value / 1e6).toFixed(2)}M`
    : value >= 1000
      ? `${(value / 1000).toFixed(2)}K`
      : value.toLocaleString('zh-CN')
}
