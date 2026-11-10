import { describe, expect, it, vi } from 'vitest'
import type { HomeCardDefinition } from '@/routes/home/HomeCardManager'
import { extendOrchisHomeCards } from './home-cards'

describe('Orchis home retains the full original registry', () => {
  it('preserves all 13 original card objects, optional modules and action callbacks', () => {
    const ids = [
      'bot-status',
      'quick-actions',
      'stats-overview',
      'news',
      'prompt-cache',
      'request-trend',
      'token-trend',
      'cost-trend',
      'model-distribution',
      'model-details',
      'daily-statistics',
      'storage',
      'hitokoto',
    ]
    const cards: HomeCardDefinition[] = ids.map((id, index) => ({
      id: `builtin:${id}`,
      title: id,
      source: 'builtin',
      render: vi.fn(),
      onEdit: vi.fn(),
      defaultHidden: index > 6 && index < 11,
    }))
    const original = [...cards]
    const additions: HomeCardDefinition[] = ['hero', 'quick-chat', 'activity'].map((id) => ({
      id: `orchis:${id}`,
      title: id,
      source: 'builtin',
      render: vi.fn(),
    }))
    const extended = extendOrchisHomeCards(cards, additions)
    expect(extended).toHaveLength(16)
    expect(extended[0]).toBe(additions[0])
    for (const card of cards) expect(extended.find((item) => item.id === card.id)).toBe(card)
    expect(extended.find((item) => item.id === 'builtin:quick-actions')?.onEdit).toBe(
      cards[1].onEdit
    )
    expect(cards).toEqual(original)
  })
})
