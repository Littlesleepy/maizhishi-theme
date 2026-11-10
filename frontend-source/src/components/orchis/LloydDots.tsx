import type { CSSProperties } from 'react'

const dots = [
  { x: 22, y: 20, size: 12, delay: 1.6 },
  { x: 54, y: 20, size: 12, delay: 0 },
  { x: 22, y: 42, size: 8, delay: 2.4 },
  { x: 54, y: 42, size: 8, delay: 0.8 },
  { x: 22, y: 64, size: 5, delay: 3.2 },
]
export function LloydDots({
  evolved,
  state,
}: {
  evolved: boolean
  state: 'loading' | 'running' | 'stopped' | 'unknown'
}) {
  return (
    <div
      className={`lloyd-dots ${state === 'running' ? 'scanning' : ''}`}
      aria-hidden="true"
      data-state={state}
      data-evolved={evolved}
    >
      <span className="dot-thread" style={{ left: evolved ? 22 : 54 }} />
      {dots.map(({ x, y, size, delay }, index) => (
        <span
          key={index}
          className="dot"
          style={
            {
              left: evolved ? x : 76 - x,
              top: y,
              width: size,
              height: size,
              animationDelay: `${delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
