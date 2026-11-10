import type { HomeCardDefinition } from '@/routes/home/HomeCardManager'
import { NATIVE_CARD_ORDER } from './native-regions'

export const ORCHIS_HOME_LAYOUT_KEY = 'maibot-orchis-full-home-layout-v1'

/** Keep the original definitions (including render/edit actions and optional cards) intact. */
export function extendOrchisHomeCards(
  cards: HomeCardDefinition[],
  additions: HomeCardDefinition[]
): HomeCardDefinition[] {
  const all = [...cards, ...additions]
  const preferred = NATIVE_CARD_ORDER
  return [
    ...preferred.flatMap((id) => all.filter((card) => card.id === id)),
    ...all.filter((card) => !preferred.includes(card.id)),
  ]
}
