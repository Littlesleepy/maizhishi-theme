import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ZoomableChart } from '@/components/ui/zoomable-chart'
import { useDashboardData } from '@/routes/home/hooks/useDashboardData'
import { selectChartTimeSeries } from '@/routes/home/statistics-chart-utils'
import { NativePeriods, OrchisPanel, OrchisIcon, compactNative } from './OrchisPrimitives'

export function useNativeDashboard() {
  const state = useDashboardData()
  useEffect(() => {
    void state.fetchDashboardData()
  }, [state.fetchDashboardData])
  return state
}
export function OrchisNativeMetrics() {
  const { dashboardData: data, error, loading, timeRange, setTimeRange } = useNativeDashboard()
  const [updated, setUpdated] = useState(() => new Date())
  useEffect(() => {
    if (data) setUpdated(new Date())
  }, [data])
  const s = data?.summary
  const entries = s
    ? [
        ['trend', '总请求数', compactNative(s.total_requests), ''],
        ['tokens', 'Token 消耗', compactNative(s.total_tokens), ''],
        ['cost', '总花费', `¥${s.total_cost.toFixed(2)}`, ''],
        [
          'cache',
          '缓存命中',
          s.cache_hit_rate === null ? '—' : String(Math.round(s.cache_hit_rate * 100)),
          '%',
        ],
        ['uptime', '在线时长', (s.online_time / 3600).toFixed(1), 'h'],
      ]
    : []
  return (
    <section className="card stats-card wide" data-frame="hud" aria-label="统计概览">
      <h2 className="visually-hidden">统计概览</h2>
      {!s ? (
        <p className="detail-note" role="status">
          {loading ? '正在读取统计…' : error || '暂无统计'}
        </p>
      ) : (
        <>
          <div className="stats-strip">
            {entries.map(([icon, label, value, unit]) => (
              <div className="stat" key={label}>
                <span className="stat-label">
                  <OrchisIcon name={icon} />
                  {label}
                </span>
                <strong>
                  {value}
                  <small>{value === '—' ? '' : unit}</small>
                </strong>
              </div>
            ))}
          </div>
          <div className="stats-foot">
            <span>
              <i className="status-led" /> 数据更新于{' '}
              <time>{updated.toLocaleTimeString('zh-CN', { hour12: false })}</time>
            </span>
            <details className="native-stat-details">
              <summary>统计详情</summary>
              <div className="native-detail-popover">
                <dl>
                  {[
                    ['平均响应', `${s.avg_response_time.toFixed(2)}s`],
                    ['处理消息', s.total_messages],
                    ['已回复', s.total_replies],
                    ['输入 Token', s.input_tokens],
                    ['输出 Token', s.output_tokens],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v.toLocaleString()}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </details>
            <details className="native-stat-range">
              <summary>
                {timeRange === 24 ? '24 小时' : timeRange === 168 ? '7 天' : '30 天'}概况
              </summary>
              <NativePeriods hours={timeRange} onChange={setTimeRange} label="统计概况时间范围" />
            </details>
          </div>
        </>
      )}
    </section>
  )
}

type Kind = 'requests' | 'tokens' | 'cost'
export function OrchisNativeChart({ kind }: { kind: Kind }) {
  const { dashboardData: data, error, loading, timeRange, setTimeRange } = useNativeDashboard()
  const [range, setRange] = useState<[number, number | null]>([0, null])
  const [hover, setHover] = useState<number | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const host = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 640, height: 220, font: 11 })
  useLayoutEffect(() => {
    const element = host.current
    if (!element) return
    const read = () => {
      const style = getComputedStyle(element)
      setSize({
        width: element.clientWidth || 640,
        height: parseFloat(style.getPropertyValue('--chart-height')) || 220,
        font: parseFloat(style.getPropertyValue('--chart-font')) || 11,
      })
    }
    read()
    const observer = new ResizeObserver(read)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const title = kind === 'requests' ? '请求趋势' : kind === 'tokens' ? 'Token 消耗' : '花费趋势'
  const all = data ? selectChartTimeSeries(data, timeRange) : []
  const start = Math.min(range[0], Math.max(0, all.length - 1)),
    end = Math.min(range[1] ?? all.length - 1, all.length - 1)
  const rows = all.slice(start, end + 1)
  const value = (r: (typeof rows)[number]) =>
    kind === 'tokens' ? r.input_tokens + r.output_tokens : kind === 'requests' ? r.requests : r.cost
  const maxRaw = Math.max(0, ...rows.map(value)) * 1.15
  const maximum = Math.max(
    kind === 'tokens' ? 20000 : kind === 'cost' ? 0.01 : 20,
    kind === 'tokens'
      ? Math.ceil(maxRaw / 20000) * 20000
      : kind === 'cost'
        ? Math.ceil(maxRaw * 100) / 100
        : Math.ceil(maxRaw / 20) * 20
  )
  const { width: W, height: H, font } = size,
    left = Math.ceil(font * 4.2),
    right = 14,
    top = 22,
    bottom = Math.ceil(font + 17),
    pw = Math.max(1, W - left - right),
    ph = Math.max(1, H - top - bottom)
  const x = (i: number) => left + ((i + 0.5) * pw) / Math.max(1, rows.length),
    y = (v: number) => top + ph - (v / maximum) * ph
  const stamp = (r: (typeof rows)[number]) =>
    new Date(r.timestamp).toLocaleString(
      'zh-CN',
      timeRange === 24
        ? { hour: '2-digit', minute: '2-digit', hour12: false }
        : { month: 'numeric', day: 'numeric' }
    )
  const points = rows.map((r, i) => `${x(i)},${y(value(r))}`).join(' ')
  const ticks = Math.min(rows.length, Math.max(2, Math.floor(pw / 86)))
  const indexes = [
    ...new Set(
      Array.from({ length: ticks }, (_, i) =>
        Math.round((i * (rows.length - 1)) / Math.max(1, ticks - 1))
      )
    ),
  ]
  const total = data
    ? kind === 'requests'
      ? data.summary.total_requests
      : kind === 'tokens'
        ? data.summary.total_tokens
        : data.summary.total_cost
    : 0
  return (
    <OrchisPanel
      family="panel"
      className="chart-card"
      title={title}
      icon={kind === 'requests' ? 'trend' : kind === 'tokens' ? 'tokens' : 'cost'}
      actions={
        <NativePeriods
          hours={timeRange}
          label={`${title}时间范围`}
          onChange={(hours) => {
            setRange([0, null])
            setHover(null)
            setResetKey((k) => k + 1)
            setTimeRange(hours)
          }}
        />
      }
    >
      <div className="chart-caption">
        <b>{kind === 'cost' ? `¥${total.toFixed(2)}` : compactNative(total)}</b>
        <span>{kind === 'requests' ? '次请求' : kind === 'tokens' ? 'Tokens' : '估算花费'}</span>
        {kind === 'tokens' && (
          <div className="chart-legend">
            <span>
              <i className="input-color" />
              输入
            </span>
            <span>
              <i className="output-color" />
              输出
            </span>
          </div>
        )}
      </div>
      <div className={`chart-wrap ${kind === 'cost' ? 'compact-chart' : ''}`} ref={host}>
        {(loading && !data) || (error && !data) || !rows.length ? (
          <div className="chart-plot empty-row" role="status">
            {loading ? '正在读取…' : error || '当前范围没有统计记录'}
          </div>
        ) : (
          <ZoomableChart
            aria-label={`${title}，支持手势缩放`}
            className="chart-plot"
            resetKey={resetKey}
          >
            <svg
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label={kind === 'tokens' ? '输入与输出 Token 堆叠柱状图' : `${title}折线图`}
            >
              {[0, 1, 2, 3].map((i) => {
                const v = (maximum * i) / 3,
                  yy = y(v)
                return (
                  <g key={i}>
                    <line className="chart-grid" x1={left} x2={W - right} y1={yy} y2={yy} />
                    <text className="chart-axis" x={left - 7} y={yy + 3} textAnchor="end">
                      {kind === 'tokens'
                        ? `${Math.round(v / 1000)}K`
                        : kind === 'cost'
                          ? `¥${v.toFixed(2)}`
                          : Math.round(v)}
                    </text>
                  </g>
                )
              })}
              {kind === 'tokens' ? (
                rows.map((r, i) => {
                  const w = Math.max(3, (pw / rows.length) * 0.62),
                    a = y(r.input_tokens + r.output_tokens),
                    b = y(r.input_tokens)
                  return (
                    <g key={r.timestamp}>
                      <rect
                        className="chart-input"
                        x={x(i) - w / 2}
                        y={b}
                        width={w}
                        height={top + ph - b}
                        rx=".5"
                      />
                      <rect
                        className="chart-output"
                        x={x(i) - w / 2}
                        y={a}
                        width={w}
                        height={b - a}
                        rx=".5"
                      />
                    </g>
                  )
                })
              ) : (
                <>
                  <polygon
                    className="chart-area"
                    points={`${x(0)},${top + ph} ${points} ${x(rows.length - 1)},${top + ph}`}
                  />
                  <polyline
                    className={`chart-line ${kind === 'cost' ? 'cost-line' : ''}`}
                    points={points}
                  />
                </>
              )}
              {indexes.map((i) => (
                <text className="chart-axis" key={i} x={x(i)} y={H - 6} textAnchor="middle">
                  {stamp(rows[i])}
                </text>
              ))}
              {rows.map((r, i) => (
                <rect
                  className="chart-hit"
                  key={r.timestamp}
                  x={left + (i * pw) / rows.length}
                  y={top}
                  width={pw / rows.length}
                  height={ph}
                  tabIndex={0}
                  role="button"
                  aria-label={`${stamp(r)}，${kind === 'tokens' ? `输入${r.input_tokens}，输出${r.output_tokens}` : value(r)}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                />
              ))}
            </svg>
          </ZoomableChart>
        )}
        {hover !== null && rows[hover] && (
          <div className="chart-tooltip">
            <strong>{stamp(rows[hover])}</strong>
            <span>
              {kind === 'tokens'
                ? `输入 ${rows[hover].input_tokens.toLocaleString()} / 输出 ${rows[hover].output_tokens.toLocaleString()}`
                : value(rows[hover]).toLocaleString()}
            </span>
          </div>
        )}
        <div className="zoom-tools" role="group" aria-label={`${title}图表工具`}>
          <span className="chart-range">
            {rows.length ? `${stamp(rows[0])} — ${stamp(rows[rows.length - 1])}` : '—'}
          </span>
          <button
            type="button"
            disabled={rows.length <= 3}
            aria-label={`放大${title}图表`}
            onClick={() => {
              const span = Math.max(3, Math.floor(rows.length / 2)),
                a = start + Math.floor((rows.length - span) / 2)
              setRange([a, a + span - 1])
              setHover(null)
            }}
          >
            ＋ 放大
          </button>
          <button
            type="button"
            aria-label={`重置${title}图表范围`}
            onClick={() => {
              setRange([0, null])
              setHover(null)
              setResetKey((k) => k + 1)
            }}
          >
            ↺ 重置
          </button>
        </div>
      </div>
    </OrchisPanel>
  )
}
