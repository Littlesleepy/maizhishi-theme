import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowDownUp, RefreshCw } from 'lucide-react'
import { OrchisFrame, OrchisIcon } from './OrchisPrimitives'
import type { RecentActivity } from '@/routes/home/types'

type Props = {
  activities: RecentActivity[]
  loading: boolean
  error: string | null
  onRefresh: () => void
}
export function OrchisActivity({ activities, loading, error, onRefresh }: Props) {
  const [model, setModel] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState<'timestamp' | 'tokens'>('timestamp')
  const [descending, setDescending] = useState(true)
  const rows = useMemo(
    () =>
      activities
        .filter((item) => (!model || item.model === model) && (!status || item.status === status))
        .sort((a, b) => {
          const difference =
            sort === 'tokens'
              ? a.tokens - b.tokens
              : new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          return descending ? -difference : difference
        }),
    [activities, model, status, sort, descending]
  )
  const toggleSort = (next: typeof sort) => {
    setDescending(next === sort ? !descending : true)
    setSort(next)
  }
  return (
    <section className="card activity-card" data-frame="table">
      <OrchisFrame family="table" />
      <div className="card-heading">
        <h2>
          <OrchisIcon name="log" />
          最近活动
        </h2>
        <div className="flex items-center gap-3">
          <button aria-label="刷新活动" disabled={loading} onClick={onRefresh}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link to="/logs" className="text-button">
            完整日志 ↗
          </Link>
        </div>
      </div>

      <div className="table-tools">
        <select
          aria-label="筛选模型"
          value={model}
          onChange={(event) => setModel(event.target.value)}
        >
          <option value="">全部模型</option>
          {[...new Set(activities.map((item) => item.model))].map((name) => (
            <option key={name}>{name}</option>
          ))}
          {model && !activities.some((item) => item.model === model) && (
            <option value={model}>{model}（当前无记录）</option>
          )}
        </select>
        <select
          aria-label="筛选状态"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">全部状态</option>
          {[...new Set(activities.map((item) => item.status))].map((value) => (
            <option key={value} value={value}>
              {value === 'success' ? '成功' : value === 'error' ? '失败' : value}
            </option>
          ))}
          {status && !activities.some((item) => item.status === status) && (
            <option value={status}>
              {status === 'error' ? '失败' : status === 'success' ? '成功' : status}（当前无记录）
            </option>
          )}
        </select>
        <button
          className="text-button"
          type="button"
          onClick={() => {
            setModel('')
            setStatus('')
            setSort('timestamp')
            setDescending(true)
          }}
        >
          重置
        </button>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
      <div className="table-scroll">
        <table aria-label="最近活动记录">
          <thead>
            <tr>
              <th
                aria-sort={
                  sort === 'timestamp' ? (descending ? 'descending' : 'ascending') : 'none'
                }
              >
                <button className="sort-button" onClick={() => toggleSort('timestamp')}>
                  时间 <ArrowDownUp size={12} />
                </button>
              </th>
              <th>模型／类型</th>
              <th
                aria-sort={sort === 'tokens' ? (descending ? 'descending' : 'ascending') : 'none'}
              >
                <button className="sort-button" onClick={() => toggleSort('tokens')}>
                  Token <ArrowDownUp size={12} />
                </button>
              </th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, index) => (
              <tr key={`${item.timestamp}-${index}`}>
                <td>
                  <time dateTime={item.timestamp}>
                    {new Date(item.timestamp).toLocaleString('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </time>
                </td>
                <td>
                  <span>{item.model}</span>
                  <small>{item.request_type}</small>
                </td>
                <td>
                  {item.tokens.toLocaleString('zh-CN')}
                  <small className="token-detail">
                    输入 {item.input_tokens.toLocaleString('zh-CN')} / 输出{' '}
                    {item.output_tokens.toLocaleString('zh-CN')}
                  </small>
                </td>
                <td>
                  <span
                    className={`activity-status ${item.status === 'success' ? 'success' : item.status === 'error' ? 'error' : ''}`}
                  >
                    {item.status === 'success'
                      ? '成功'
                      : item.status === 'error'
                        ? '失败'
                        : item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="text-muted-foreground py-6 text-center text-xs">
            {loading
              ? '正在加载活动…'
              : error
                ? '活动暂不可用'
                : activities.length
                  ? '没有符合条件的记录'
                  : '暂无请求活动'}
          </p>
        )}
      </div>
      <div className="card-foot">
        <span>显示 {rows.length} / {activities.length} 条</span>
      </div>
    </section>
  )
}
