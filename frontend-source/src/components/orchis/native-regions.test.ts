import { describe, it, expect } from 'vitest'
import {
  nativeRegion,
  nativeSpan,
  normalizeNativeRegions,
  packNativeRows,
  migrateNativeOrder,
} from './native-regions'
describe('native regions retain customized cards', () => {
  it('packs widths without losing order or plugins', () => {
    const items = [
      { id: 'builtin:stats-overview', span: 3 },
      { id: 'plugin:a', span: 2 },
      { id: 'plugin:b', span: 2 },
      { id: 'x', span: 1 },
    ]
    expect(packNativeRows(items, 3).map((row) => row.map((i) => i.id))).toEqual([
      ['builtin:stats-overview'],
      ['plugin:a'],
      ['plugin:b', 'x'],
    ])
    expect(nativeSpan('plugin:a', 4, 'wide')).toBe(3)
    expect(nativeSpan('builtin:stats-overview', 1)).toBe(1)
    expect(nativeRegion('plugin:a')).toBe('secondary')
    expect(nativeRegion('orchis:hero', { 'orchis:hero': 'main' })).toBe('main')
    expect(normalizeNativeRegions({ 'plugin:a': 'main', bad: 'else' })).toEqual({
      'plugin:a': 'main',
    })
  })
  it('migrates only the untouched previous native order, preserving user order', () => {
    const old = [
      'orchis:hero',
      'builtin:bot-status',
      'builtin:quick-actions',
      'builtin:storage',
      'builtin:stats-overview',
      'builtin:prompt-cache',
      'builtin:request-trend',
      'builtin:token-trend',
      'orchis:quick-chat',
      'orchis:activity',
      'builtin:news',
      'builtin:hitokoto',
      'builtin:cost-trend',
      'builtin:model-distribution',
      'builtin:model-details',
      'builtin:daily-statistics',
    ]
    expect(migrateNativeOrder(old).slice(8, 12)).toEqual([
      'orchis:activity',
      'orchis:quick-chat',
      'builtin:news',
      'builtin:cost-trend',
    ])
    expect(migrateNativeOrder([...old].reverse())).toEqual([...old].reverse())
  })
})
