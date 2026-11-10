import { describe, expect, it } from 'vitest'
import { isNativeHomeLayout } from './native-layout'

const order = ['builtin:stats-overview','builtin:request-trend','builtin:token-trend','orchis:activity','orchis:quick-chat','orchis:hero','builtin:bot-status','plugin:example']
describe('native composition respects existing customization', () => {
  it('uses the composition only for the unchanged visible default', () => {
    expect(isNativeHomeLayout(order, order, order, {}, {})).toBe(true)
    expect(isNativeHomeLayout([...order].reverse(), order, order, {}, {})).toBe(false)
    expect(isNativeHomeLayout(order, order, order, { 'builtin:token-trend':'full' }, {})).toBe(false)
    expect(isNativeHomeLayout(order, order, order, {}, { '0':'high' })).toBe(false)
  })
  it('allows optional cards/plugins but falls back when a structural card is hidden', () => {
    expect(isNativeHomeLayout(order, order, order.slice(0,-1), {}, {})).toBe(true)
    expect(isNativeHomeLayout(order, order, order.filter(id=>id!=='orchis:hero'), {}, {})).toBe(false)
  })
})
