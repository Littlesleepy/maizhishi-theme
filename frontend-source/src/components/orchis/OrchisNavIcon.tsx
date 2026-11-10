import { useId } from 'react'

import type { MenuIcon } from '@/components/layout/types'

interface NativeMenuGlyph {
  file: string
  size: readonly [number, number]
  bounds: readonly [number, number, number, number]
  visibleSize: number
  alphaGain?: number
}

// Native sprites stay untouched. Bounds align visible ink; gain balances translucent game glyphs.
const GLYPHS: Record<string, NativeMenuGlyph> = {
  '/': {
    file: 'utx_icon_footer_home_normal.png',
    size: [128, 128],
    bounds: [25, 26, 108, 107],
    visibleSize: 24,
    alphaGain: 3.3,
  },
  '/chat': {
    file: 'utx_ic_mtv_message.png',
    size: [40, 40],
    bounds: [7, 9, 34, 30],
    visibleSize: 22,
  },
  '/config/bot': {
    file: 'icon_other_config.png',
    size: [29, 26],
    bounds: [1, 1, 29, 26],
    visibleSize: 23,
    alphaGain: 1.1,
  },
  '/config/model': {
    file: 'utx_ic_deck.png',
    size: [64, 64],
    bounds: [8, 14, 56, 50],
    visibleSize: 24,
  },
  '/adapter-management': {
    file: 'utx_ic_link_card.png',
    size: [64, 64],
    bounds: [8, 6, 57, 59],
    visibleSize: 23,
  },
  '/resource/learning': {
    file: 'utx_ic_input.png',
    size: [64, 64],
    bounds: [15, 16, 48, 48],
    visibleSize: 22,
  },
  '/resource/knowledge-base': {
    file: 'utx_icon_footer_solo_normal.png',
    size: [128, 128],
    bounds: [24, 30, 108, 101],
    visibleSize: 24,
    alphaGain: 4.75,
  },
  '/plugin-config': {
    file: 'utx_ic_puzzle.png',
    size: [78, 78],
    bounds: [7, 7, 68, 67],
    visibleSize: 23,
  },
  '/plugins': {
    file: 'utx_icon_footer_shop_normal.png',
    size: [128, 128],
    bounds: [25, 31, 107, 103],
    visibleSize: 24,
    alphaGain: 4.7,
  },
  '/config/prompts': {
    file: 'utx_ic_log.png',
    size: [78, 78],
    bounds: [4, 4, 75, 75],
    visibleSize: 23,
  },
  '/data-transfer': {
    file: 'icon_other_code.png',
    size: [30, 28],
    bounds: [0, 1, 29, 28],
    visibleSize: 23,
    alphaGain: 1.2,
  },
  '/agent': {
    file: 'utx_ic_official_user.png',
    size: [48, 48],
    bounds: [8, 7, 41, 42],
    visibleSize: 23,
  },
  '/manage': {
    file: 'utx_ic_menu.png',
    size: [78, 78],
    bounds: [5, 15, 75, 64],
    visibleSize: 23,
  },
  '/logs': {
    file: 'utx_ic_desc.png',
    size: [64, 64],
    bounds: [11, 6, 54, 55],
    visibleSize: 23,
  },
  '/statistics': {
    file: 'utx_ic_cost_graph.png',
    size: [42, 42],
    bounds: [0, 0, 42, 42],
    visibleSize: 23,
  },
  '/settings': {
    file: 'icon_other_config.png',
    size: [29, 26],
    bounds: [1, 1, 29, 26],
    visibleSize: 23,
    alphaGain: 1.1,
  },
}

interface OrchisNavIconProps {
  path: string
  fallback: MenuIcon
}

export function OrchisNavIcon({ path, fallback: Fallback }: OrchisNavIconProps) {
  const filterId = `orchis-menu-alpha-${useId()}`
  const glyph = GLYPHS[path]
  if (!glyph) {
    // Optional desktop and extension entries keep their meaning in the same size/color treatment.
    return (
      <span className="orchis-nav-icon" aria-hidden="true" data-orchis-nav-icon={path}>
        <Fallback className="orchis-nav-fallback" size={23} />
      </span>
    )
  }

  const [left, top, right, bottom] = glyph.bounds
  const scale = glyph.visibleSize / Math.max(right - left, bottom - top)
  const mask = `url('/themes/orchis/native/assets/menu/${glyph.file}')`

  return (
    <span
      className="orchis-nav-icon"
      aria-hidden="true"
      data-orchis-nav-icon={path}
      style={
        glyph.alphaGain
          ? { filter: `url("#${filterId}") var(--orchis-nav-effect, opacity(1))` }
          : undefined
      }
    >
      {glyph.alphaGain && (
        <svg className="orchis-nav-filter" width="0" height="0" aria-hidden="true">
          <defs>
            <filter
              id={filterId}
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
              colorInterpolationFilters="sRGB"
            >
              <feComponentTransfer>
                <feFuncA type="linear" slope={glyph.alphaGain} />
              </feComponentTransfer>
            </filter>
          </defs>
        </svg>
      )}
      <span
        className="orchis-nav-glyph"
        data-orchis-native-glyph={glyph.file}
        style={{
          width: glyph.size[0] * scale,
          height: glyph.size[1] * scale,
          left: 14 - ((left + right) / 2) * scale,
          top: 14 - ((top + bottom) / 2) * scale,
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />
    </span>
  )
}
