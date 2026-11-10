import { animate, motion, useMotionValue, usePresence, useReducedMotion } from 'motion/react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

export const ORCHIS_CHIBI_SRC = '/themes/orchis/native/assets/orchis-chibi.png'

interface OrchisTopbarMascotProps {
  label: string
  onExpand: () => void
}

/** The full transparent original hangs upside down and slides into view from the page edge. */
export function OrchisTopbarMascot({ label, onExpand }: OrchisTopbarMascotProps) {
  const reduceMotion = useReducedMotion()
  const [isPresent, safeToRemove] = usePresence()
  const removeAfterExit = useRef(safeToRemove)
  const offset = useMotionValue(reduceMotion ? 0 : -96)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const exiting = useRef(false)
  const entryFinished = useRef(false)
  const hoverArmed = useRef(false)
  const [entered, setEntered] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [frozenPose, setFrozenPose] = useState<string | null>(null)

  const freezePose = useCallback(() => {
    if (!imageRef.current) return
    const matrix = new DOMMatrixReadOnly(getComputedStyle(imageRef.current).transform)
    // Keep positive angles so a reversed exit returns along the same short rotation path.
    const angle = ((Math.atan2(matrix.b, matrix.a) * 180) / Math.PI + 360) % 360
    setFrozenPose(`translate(${matrix.e}px, ${matrix.f}px) rotate(${angle}deg)`)
  }, [])

  const finishEntry = useCallback(() => {
    if (exiting.current) return
    entryFinished.current = true
    // Collapse now sits below the mascot: a stationary pointer must leave before revealing it.
    hoverArmed.current = !buttonRef.current?.matches(':hover')
    setEntered(true)
  }, [])

  useLayoutEffect(() => {
    // Presence callbacks change when the header rerenders; keep timing independent of them.
    removeAfterExit.current = safeToRemove
  }, [safeToRemove])

  useLayoutEffect(() => {
    let cancelled = false
    if (isPresent) {
      exiting.current = false
      entryFinished.current = false
      hoverArmed.current = false
      setEntered(false)
      setHovered(false)
      setFrozenPose(null)
    } else {
      if (!exiting.current) freezePose()
      exiting.current = true
      entryFinished.current = false
      hoverArmed.current = false
    }

    const playback = animate(offset, isPresent ? 0 : -96, {
      delay: isPresent && !reduceMotion ? 0.08 : 0,
      duration: reduceMotion ? 0 : isPresent ? 0.45 : 0.26,
      ease: isPresent ? [0.22, 1, 0.36, 1] : [0.4, 0, 1, 1],
    })
    void playback.then(() => {
      if (cancelled) return
      if (isPresent) finishEntry()
      else removeAfterExit.current?.()
    })
    return () => {
      cancelled = true
      playback.stop()
    }
  }, [isPresent, reduceMotion, offset, freezePose, finishEntry])

  const expand = () => {
    if (!isPresent || exiting.current) return
    freezePose()
    exiting.current = true
    onExpand()
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      data-dashboard-topbar-toggle="true"
      data-topbar-mascot-toggle="true"
      data-orchis-entry-complete={entered ? 'true' : 'false'}
      data-orchis-peek-hovered={hovered ? 'true' : undefined}
      data-orchis-exiting={isPresent ? undefined : 'true'}
      disabled={!isPresent}
      aria-hidden={isPresent ? undefined : true}
      aria-label={label}
      aria-expanded="false"
      title={label}
      onClick={expand}
      onPointerEnter={() => {
        if (!exiting.current && entryFinished.current && hoverArmed.current) setHovered(true)
      }}
      onPointerLeave={() => {
        if (exiting.current) return
        hoverArmed.current = true
        setHovered(false)
      }}
      className="orchis-topbar-toggle bg-foreground/70 relative z-10 h-2 w-24 transition-shadow"
    >
      <motion.span className="orchis-topbar-mascot" aria-hidden="true" style={{ y: offset }}>
        <span className="orchis-peek-window">
          <img
            ref={imageRef}
            src={ORCHIS_CHIBI_SRC}
            alt=""
            width={96}
            height={96}
            draggable={false}
            style={frozenPose ? { transform: frozenPose, transition: 'none' } : undefined}
          />
        </span>
      </motion.span>
      <span className="sr-only">{label}</span>
    </button>
  )
}
