/** Native default composition yields to the existing free grid after customization. */
export function isNativeHomeLayout(
  order: string[],
  defaults: string[],
  visible: string[],
  widths: Record<string, unknown>,
  rowModes: Record<string, unknown>
): boolean {
  return order.join('\0') === defaults.join('\0') &&
    Object.keys(widths).length === 0 && Object.keys(rowModes).length === 0 &&
    ['orchis:hero', 'builtin:bot-status', 'builtin:stats-overview', 'builtin:request-trend',
      'builtin:token-trend', 'orchis:activity', 'orchis:quick-chat'].every(id => visible.includes(id))
}
