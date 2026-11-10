import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { nativeRegion, nativeSpan, packNativeRows } from './native-regions'
import type { NativeRegion } from './native-regions'

interface NativeItem {
  id: string
  node: ReactNode
  width?: string
}
export function OrchisHomeGrid({
  items,
  regions,
  rowModes,
  editing,
  onRowMode,
  mainHeader,
  actions,
}: {
  items: NativeItem[]
  regions: Record<string, NativeRegion>
  rowModes: Record<string, 'low' | 'high'>
  editing: boolean
  onRowMode: (key: string) => void
  mainHeader?: ReactNode
  actions?: ReactNode
}) {
  const [width, setWidth] = useState(() => window.innerWidth)
  useEffect(() => {
    const resize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  const render = (region: NativeRegion, index: number) => {
    const columns =
      region === 'companion'
        ? 1
        : region === 'main'
          ? width <= 1050
            ? 1
            : 2
          : width >= 2200
            ? 4
            : width > 1270
              ? 3
              : width > 530
                ? 2
                : 1
    const entries = items
      .filter((i) => nativeRegion(i.id, regions) === region)
      .map((i) => ({ ...i, span: nativeSpan(i.id, columns, i.width) }))
    const rows = packNativeRows(entries, columns),
      modes = new Map<string, { key: string; first: boolean }>()
    rows.forEach((row, i) =>
      row.forEach((item, j) =>
        modes.set(item.id, { key: String(1000 + index * 1000 + i), first: j === 0 })
      )
    )
    const nodes: ReactNode[] = entries.map((item) => {
      const row = modes.get(item.id)!
      return (
        <div
          className="native-slot"
          key={item.id}
          data-native-region={region}
          data-density={rowModes[row.key] ?? 'auto'}
          style={{ gridColumn: `span ${item.span}` }}
        >
          {editing && row.first && (
            <button
              className="native-row-mode quiet-button"
              type="button"
              onClick={() => onRowMode(row.key)}
              aria-label={`调整本行高度：${item.id}`}
            >
              {rowModes[row.key] === 'high' ? '舒展行' : '紧凑行'} ↔
            </button>
          )}
          {item.node}
        </div>
      )
    })
    if (region === 'companion' && actions) {
      const statusIndex = entries.findIndex((item) => item.id === 'builtin:bot-status')
      nodes.splice(
        statusIndex >= 0 ? statusIndex + 1 : nodes.length,
        0,
        <div
          key="orchis:actions"
          className="orchis-status-actions"
          role="group"
          aria-label="主页操作"
        >
          {actions}
        </div>
      )
    }
    return nodes
  }
  const hasCompanion = !!actions || items.some((i) => nativeRegion(i.id, regions) === 'companion')
  return (
    <div className="native-home-grid" data-native-editor={editing}>
      <div
        className="home-layout"
        style={hasCompanion ? undefined : { gridTemplateColumns: 'minmax(0,1fr)' }}
      >
        <div className="native-main-column">
          {mainHeader}
          <div className="main-grid">{render('main', 0)}</div>
        </div>
        {hasCompanion && (
          <aside className="companion" aria-label="奥契丝与运行状态">
            {render('companion', 1)}
          </aside>
        )}
      </div>
      <section className="lower-heading">
        <div>
          <img
            className="section-diamond"
            src="/themes/orchis/native/assets/wb/utx_icon_footer_metaverse_active.png"
            alt=""
          />
          <h2>工作台</h2>
          <span className="section-subtitle">每一份记录，都值得珍藏</span>
        </div>
      </section>
      <div className="secondary-grid">{render('secondary', 2)}</div>
    </div>
  )
}
