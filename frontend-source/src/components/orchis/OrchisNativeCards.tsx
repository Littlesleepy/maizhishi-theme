import { createContext, useContext, useState } from 'react'
import type { ReactNode, MutableRefObject } from 'react'
import { Link } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ZoomableChart } from '@/components/ui/zoomable-chart'
import type { QuickShortcutDefinition } from '@/routes/home/types'
import type { HomeCardDefinition } from '@/routes/home/HomeCardManager'
import { selectChartTimeSeries, formatChartTimeAxis } from '@/routes/home/statistics-chart-utils'
import { useNews } from '@/routes/home/hooks/useNews'
import { useNewsReadState } from '@/routes/home/hooks/useNewsReadState'
import type { NewsItem } from '@/lib/news-api'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from '@/components/ui/dialog'
import { OrchisNativeChart, OrchisNativeMetrics, useNativeDashboard } from './OrchisNativeCharts'
import { OrchisPanel, OrchisFrame, NativePeriods, compactNative } from './OrchisPrimitives'
import { nativeDailyRows } from './native-daily'

export interface NativeHomeBusiness {
  chatDraft: string
  setChatDraft: (value: string) => void
  chatDraftRevision: MutableRefObject<number>
  chatPending: boolean
  setChatPending: (value: boolean) => void
  shortcuts: QuickShortcutDefinition[]
  customizeShortcuts: () => void
  storage: {
    available: boolean
    loading: boolean
    size: number
    files: number
    records: number
    tables: number
    details: { key: string; label: string; size: number; detail: string }[]
  }
  hitokoto: { hitokoto: string; from?: string | null } | null
  hitokotoLoading: boolean
}
export const NativeHomeContext = createContext<NativeHomeBusiness | null>(null)
function useNativeBusiness() {
  const value = useContext(NativeHomeContext)
  if (!value) throw new Error('Native home business provider missing')
  return value
}
const formatBytes = (n: number) =>
  n >= 1048576
    ? `${(n / 1048576).toFixed(1)} MB`
    : n >= 1024
      ? `${(n / 1024).toFixed(1)} KB`
      : `${n} B`

function NativeShortcuts({ card }: { card: HomeCardDefinition }) {
  const b = useNativeBusiness()
  const content = (s: QuickShortcutDefinition) => (
    <>
      <s.icon size={19} />
      {s.label}
      {s.badge && <small className="shortcut-badge">{s.badge}</small>}
    </>
  )
  return (
    <OrchisPanel
      title="快捷操作"
      icon="spark"
      actions={
        <button className="text-button" type="button" onClick={card.onEdit}>
          自定义 ↗
        </button>
      }
    >
      <div className="quick-grid">
        {b.shortcuts.map((s) =>
          s.href ? (
            s.external ? (
              <a
                className="native-quick-link"
                key={s.id}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {content(s)}
              </a>
            ) : (
              (() => {
                const target = new URL(s.href, window.location.origin)
                return (
                  <Link
                    className="native-quick-link"
                    key={s.id}
                    to={target.pathname}
                    search={Object.fromEntries(target.searchParams)}
                    hash={target.hash.slice(1)}
                  >
                    {content(s)}
                  </Link>
                )
              })()
            )
          ) : (
            <button type="button" key={s.id} onClick={s.action} disabled={s.disabled}>
              {content(s)}
            </button>
          )
        )}
        {!b.shortcuts.length && (
          <button type="button" onClick={b.customizeShortcuts}>
            添加快捷入口
          </button>
        )}
      </div>
    </OrchisPanel>
  )
}
function NativeStorage() {
  const s = useNativeBusiness().storage,
    [mode, setMode] = useState<'size' | 'count'>('size')
  return (
    <OrchisPanel
      title="存储管理"
      icon="storage"
      actions={
        <Link className="text-button" to="/data-transfer" hash="local-cache">
          管理 ↗
        </Link>
      }
    >
      <div className="storage-total">
        <b>
          {s.available
            ? mode === 'size'
              ? formatBytes(s.size)
              : `${s.files} 文件`
            : s.loading
              ? '读取中…'
              : '—'}
        </b>
        <small>
          <button
            type="button"
            className="text-button"
            aria-label="切换存储信息显示方式"
            onClick={() => setMode(mode === 'size' ? 'count' : 'size')}
          >
            {mode === 'size' ? '已用空间 · 数量 ↔' : `记录 ${s.records} · 表 ${s.tables} · 大小 ↔`}
          </button>
        </small>
      </div>
      {s.available ? (
        <>
          <div className="storage-bars">
            {s.details.map((d) => (
              <i key={d.key} style={{ width: `${s.size ? (d.size / s.size) * 100 : 0}%` }} />
            ))}
          </div>
          <div className="storage-details">
            {s.details.map((d) => (
              <span key={d.key}>
                ● {d.label}
                <b>{mode === 'size' ? formatBytes(d.size) : d.detail}</b>
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="detail-note">{s.loading ? '正在读取本地存储信息' : '暂时无法获取存储信息'}</p>
      )}
    </OrchisPanel>
  )
}
function NativeCache() {
  const state = useNativeDashboard(),
    s = state.dashboardData?.summary,
    [group, setGroup] = useState<'all' | 'chat'>('all')
  const rate = s ? (group === 'all' ? s.cache_hit_rate : s.chat_cache_hit_rate) : null
  const total = s
    ? group === 'all'
      ? s.cache_hit_tokens + s.cache_miss_tokens
      : s.chat_cache_hit_tokens + s.chat_cache_miss_tokens
    : 0
  return (
    <OrchisPanel
      title="Prompt 缓存"
      icon="cache"
      actions={
        <NativePeriods
          hours={state.timeRange}
          onChange={state.setTimeRange}
          label="缓存统计时间范围"
        />
      }
    >
      <div className="cache-overview">
        <div>
          <small>
            <select
              aria-label="缓存统计口径"
              value={group}
              onChange={(e) => setGroup(e.target.value as 'all' | 'chat')}
            >
              <option value="all">全部请求命中率</option>
              <option value="chat">聊天请求命中率</option>
            </select>
          </small>
          <strong>
            {rate === null ? '—' : (rate * 100).toFixed(2)}
            <span>{rate === null ? '' : '%'}</span>
          </strong>
          <div className="meter">
            <i style={{ width: `${(rate ?? 0) * 100}%` }} />
          </div>
          <p>
            {s
              ? `参与统计 ${compactNative(total)} Token`
              : state.loading
                ? '正在读取…'
                : state.error || '暂无统计'}
          </p>
        </div>
        <div className="cache-seal">
          {rate === null ? '—' : Math.round(rate * 100)}
          <small>HIT RATE</small>
        </div>
      </div>
    </OrchisPanel>
  )
}
function NativeDistribution() {
  const state = useNativeDashboard(),
    [basis, setBasis] = useState<'cost' | 'requests'>('cost'),
    models = state.dashboardData?.model_stats ?? []
  const values = models.map((m) => (basis === 'cost' ? m.total_cost : m.request_count)),
    sum = values.reduce((a, b) => a + b, 0)
  let offset = 0
  const colors = ['var(--blue-strong)', 'var(--violet)', '#a58a9b', '#bdad7f', '#8ab6a8']
  const gradient = values
    .map((v, i) => {
      const start = offset
      offset += sum ? (v / sum) * 100 : 0
      return `${colors[i % colors.length]} ${start}% ${offset}%`
    })
    .join(',')
  return (
    <OrchisPanel
      title="模型分布"
      icon="distribution"
      actions={
        <NativePeriods
          hours={state.timeRange}
          onChange={state.setTimeRange}
          label="模型分布时间范围"
        />
      }
    >
      <div className="native-distribution-controls">
        <button
          type="button"
          className="text-button"
          onClick={() => setBasis(basis === 'cost' ? 'requests' : 'cost')}
        >
          {basis === 'cost' ? '花费占比' : '请求占比'} ↔
        </button>
      </div>
      <div className="distribution">
        <div
          className="donut"
          style={{ background: sum ? `conic-gradient(${gradient})` : 'var(--surface-soft)' }}
        >
          <span>
            {basis === 'cost' ? `¥${sum.toFixed(2)}` : compactNative(sum)}
            <small>{basis === 'cost' ? '总花费' : '总请求'}</small>
          </span>
        </div>
        <div className="distribution-legend">
          {models.map((m, i) => (
            <span key={m.model_name}>
              <i style={{ background: colors[i % colors.length] }} />
              <span className="native-model-name" title={m.model_name}>
                {m.model_name}
              </span>
              <b>{sum ? `${Math.round((values[i] / sum) * 100)}%` : '—'}</b>
            </span>
          ))}
        </div>
      </div>
      {!models.length && (
        <p className="detail-note">
          {state.loading ? '正在读取…' : state.error || '当前范围暂无模型数据'}
        </p>
      )}
    </OrchisPanel>
  )
}
function NativeModels() {
  const state = useNativeDashboard()
  return (
    <OrchisPanel
      family="table"
      title="模型详情"
      icon="model"
      actions={
        <NativePeriods
          hours={state.timeRange}
          onChange={state.setTimeRange}
          label="模型详情时间范围"
        />
      }
    >
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {['模型', '请求数', '输入 Token', '输出 Token', '缓存命中', '平均响应', '花费'].map(
                (t) => (
                  <th key={t}>{t}</th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {state.dashboardData?.model_stats.map((m) => (
              <tr key={m.model_name}>
                <td>{m.model_name}</td>
                <td>{m.request_count.toLocaleString()}</td>
                <td>{compactNative(m.input_tokens)}</td>
                <td>{compactNative(m.output_tokens)}</td>
                <td>
                  {m.cache_hit_rate === null ? '—' : `${(m.cache_hit_rate * 100).toFixed(2)}%`}
                </td>
                <td>{m.avg_response_time.toFixed(2)}s</td>
                <td>¥{m.total_cost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card-foot">
        <span>{state.error || ''}</span>
        <Link to="/config/model" className="text-button">
          模型管理 ↗
        </Link>
      </div>
    </OrchisPanel>
  )
}
function NativeDaily() {
  const state = useNativeDashboard(),
    [chart, setChart] = useState(false),
    rows = nativeDailyRows(state.dashboardData)
  const plot = state.dashboardData
    ? selectChartTimeSeries(state.dashboardData, state.timeRange)
    : []
  const exportRows = () => {
    const csv =
      '\uFEFF日期,请求,输入Token,输出Token,花费\r\n' +
      rows
        .map((r) =>
          [
            new Date(r.timestamp).toISOString(),
            r.requests,
            r.input_tokens,
            r.output_tokens,
            r.cost,
          ].join(',')
        )
        .join('\r\n')
    const u = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = u
    a.download = 'maibot-daily.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(u), 1000)
  }
  return (
    <OrchisPanel
      family="table"
      title="每日统计"
      icon="daily"
      actions={
        <button className="text-button" type="button" onClick={exportRows}>
          导出 ↓
        </button>
      }
    >
      <div className="native-daily-tools">
        <NativePeriods
          hours={state.timeRange}
          onChange={state.setTimeRange}
          label="每日统计时间范围"
        />
        <button className="text-button" type="button" onClick={() => setChart(!chart)}>
          {chart ? '表格' : '图表'} ↔
        </button>
      </div>
      {chart ? (
        <>
          <ZoomableChart aria-label="每日请求与花费双轴图" className="native-daily-chart">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={plot}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(v) => formatChartTimeAxis(v, 'zh-CN', state.timeRange)}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="requests" name="请求数" fill="var(--blue-strong)" />
                <Bar yAxisId="right" dataKey="cost" name="花费" fill="var(--violet)" />
              </BarChart>
            </ResponsiveContainer>
          </ZoomableChart>
          <div className="native-daily-legend">
            ■ 请求数　<span>■ 花费</span>
          </div>
        </>
      ) : (
        <div className="table-scroll native-daily-table">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>请求</th>
                <th>Token</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.timestamp}>
                  <td>
                    {new Date(r.timestamp).toLocaleDateString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                    })}
                  </td>
                  <td>{r.requests.toLocaleString()}</td>
                  <td>{compactNative(r.tokens)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!rows.length && (
        <p className="detail-note">
          {state.loading ? '正在读取…' : state.error || '当前范围暂无数据'}
        </p>
      )}
    </OrchisPanel>
  )
}
function NativeNews() {
  const { news, isNewsLoading, newsError, fetchNews } = useNews(),
    { isUnread, markRead } = useNewsReadState(),
    [selected, setSelected] = useState<NewsItem | null>(null)
  const open = (item: NewsItem) => {
    markRead(item)
    setSelected(item)
  }
  const pluginId = selected?.url.startsWith('/plugins?')
    ? new URLSearchParams(selected.url.split('?')[1]).get('pluginId')
    : null
  return (
    <>
      <OrchisPanel
        family="story"
        title="资讯"
        icon="news"
        className="news-card"
        actions={
          <button
            type="button"
            className="text-button"
            disabled={isNewsLoading}
            onClick={() => void fetchNews(true)}
          >
            刷新 ↻
          </button>
        }
      >
        {news?.[0] ? (
          <button className="news-item" type="button" onClick={() => open(news[0])}>
            <span>MAIBOT</span>
            <div>
              <h3>
                {news[0].pinned ? '置顶 · ' : ''}
                {news[0].title}
                {isUnread(news[0]) ? ' · 未读' : ''}
              </h3>
              <p>{news[0].summary}</p>
            </div>
            <b>↗</b>
          </button>
        ) : (
          <p className="detail-note">{isNewsLoading ? '正在读取资讯…' : newsError || '暂无资讯'}</p>
        )}
        <div className="news-list">
          {news?.slice(1).map((n) => (
            <button key={n.id} type="button" onClick={() => open(n)}>
              {n.pinned ? '置顶 · ' : ''}
              {n.title}
              {isUnread(n) ? ' · 未读' : ''}
              <span>
                {new Date(n.published_at).toLocaleDateString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                })}
              </span>
            </button>
          ))}
        </div>
      </OrchisPanel>
      <Dialog open={selected !== null} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogDescription>
              {selected?.source} · {selected?.published_at}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {selected && (
              <>
                <MarkdownRenderer content={selected.content || selected.summary} />
                {selected.url &&
                  (pluginId ? (
                    <Link to="/plugins" search={{ pluginId }}>
                      打开插件 ↗
                    </Link>
                  ) : (
                    <a href={selected.url} target="_blank" rel="noopener noreferrer">
                      打开链接 ↗
                    </a>
                  ))}
              </>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  )
}
function NativeQuote({ card }: { card: HomeCardDefinition }) {
  const b = useNativeBusiness()
  const [open, setOpen] = useState(false)
  const text = b.hitokoto?.hitokoto ?? ''
  const source = b.hitokoto?.from ?? ''
  return (
    <>
      <section className="card inline-quote-card" data-frame="utility" aria-label="一言">
        <OrchisFrame family="utility" />
        <button
          type="button"
          className="inline-quote-read"
          aria-label="查看完整一言"
          disabled={b.hitokotoLoading || !text}
          onClick={() => setOpen(true)}
        >
          <span className="inline-quote-text">
            {b.hitokotoLoading ? '正在读取…' : text ? `“${text}”` : '暂无一言'}
          </span>
          {source && <span className="inline-quote-source">— {source}</span>}
        </button>
        <button
          type="button"
          className="inline-quote-edit"
          aria-label="编辑一言"
          title="编辑一言"
          onClick={card.onEdit}
        >
          <Pencil size={16} />
        </button>
      </section>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>一言</DialogTitle>
            <DialogDescription>{source ? `来源：${source}` : '一言全文'}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <blockquote className="text-base leading-loose break-words whitespace-pre-wrap">
              {text}
            </blockquote>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  )
}
export function renderOrchisNativeCard(card: HomeCardDefinition): ReactNode {
  switch (card.id) {
    case 'builtin:stats-overview':
      return <OrchisNativeMetrics />
    case 'builtin:request-trend':
      return <OrchisNativeChart kind="requests" />
    case 'builtin:token-trend':
      return <OrchisNativeChart kind="tokens" />
    case 'builtin:cost-trend':
      return <OrchisNativeChart kind="cost" />
    case 'builtin:quick-actions':
      return <NativeShortcuts card={card} />
    case 'builtin:storage':
      return <NativeStorage />
    case 'builtin:prompt-cache':
      return <NativeCache />
    case 'builtin:model-distribution':
      return <NativeDistribution />
    case 'builtin:model-details':
      return <NativeModels />
    case 'builtin:daily-statistics':
      return <NativeDaily />
    case 'builtin:news':
      return <NativeNews />
    case 'builtin:hitokoto':
      return <NativeQuote card={card} />
    default:
      return card.render()
  }
}
