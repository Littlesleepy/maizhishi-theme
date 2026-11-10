export type NativeRegion = 'main' | 'companion' | 'secondary'
export const NATIVE_CARD_ORDER = [
  'orchis:hero',
  'builtin:bot-status',
  'builtin:quick-actions',
  'builtin:storage',
  'builtin:stats-overview',
  'builtin:hitokoto',
  'builtin:prompt-cache',
  'builtin:request-trend',
  'builtin:token-trend',
  'orchis:activity',
  'orchis:quick-chat',
  'builtin:news',
  'builtin:cost-trend',
  'builtin:model-distribution',
  'builtin:model-details',
  'builtin:daily-statistics',
]
const previousOrder = [
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
export function migrateNativeOrder(order: string[]): string[] {
  if (order.length !== previousOrder.length || !order.every((id, i) => id === previousOrder[i])) {
    return order
  }
  // 历史迁移目标保持稳定；单行一言的位置由独立的一次性迁移处理。
  const restored = order.filter(id => id !== 'builtin:hitokoto').map(id =>
    id === 'orchis:quick-chat' ? 'orchis:activity' : id === 'orchis:activity' ? 'orchis:quick-chat' : id
  )
  return [...restored, 'builtin:hitokoto']
}
const regions = new Set(['main', 'companion', 'secondary'])
export function nativeRegion(
  id: string,
  overrides: Record<string, NativeRegion> = {}
): NativeRegion {
  return (
    overrides[id] ??
    (['orchis:hero', 'builtin:bot-status'].includes(id)
      ? 'companion'
      : [
            'builtin:stats-overview',
            'builtin:hitokoto',
            'builtin:request-trend',
            'builtin:token-trend',
            'orchis:activity',
            'orchis:quick-chat',
          ].includes(id)
        ? 'main'
        : 'secondary')
  )
}
export function normalizeNativeRegions(value: unknown): Record<string, NativeRegion> {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(Object.entries(value).filter(([, v]) => regions.has(v))) as Record<
    string,
    NativeRegion
  >
}
export function nativeSpan(id: string, columns: number, width?: string): number {
  if (width) {
    const fraction: Record<string, number> = {
      small: 0.2,
      medium: 0.3,
      large: 0.5,
      wide: 0.7,
      full: 1,
    }
    return Math.max(1, Math.min(columns, Math.ceil((fraction[width] ?? 0.5) * columns)))
  }
  return id === 'builtin:stats-overview' || id === 'builtin:hitokoto'
    ? columns
    : id === 'builtin:model-details'
      ? Math.min(2, columns)
      : 1
}
export function packNativeRows<T extends { id: string; span: number }>(
  items: T[],
  columns: number
): T[][] {
  const rows: T[][] = []
  let used = 0
  for (const item of items) {
    if (!rows.length || used + item.span > columns) {
      rows.push([])
      used = 0
    }
    rows[rows.length - 1].push(item)
    used += item.span
  }
  return rows
}
