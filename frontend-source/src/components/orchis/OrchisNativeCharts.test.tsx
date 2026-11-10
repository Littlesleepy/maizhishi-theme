import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import type { DashboardData, TimeSeriesData } from '@/routes/home/types'
import { OrchisNativeChart, OrchisNativeMetrics } from './OrchisNativeCharts'
const source = vi.hoisted(() => ({
  data: null as DashboardData | null,
  range: 24,
  setRange: vi.fn(),
  fetch: vi.fn(),
}))
vi.mock('@/routes/home/hooks/useDashboardData', () => ({
  useDashboardData: () => ({
    dashboardData: source.data,
    timeRange: source.range,
    setTimeRange: source.setRange,
    fetchDashboardData: source.fetch,
    error: null,
    loading: false,
  }),
}))
const row = (i: number): TimeSeriesData => ({
  timestamp: new Date(2026, 10, 8, i).toISOString(),
  requests: i + 1,
  tokens: 100,
  input_tokens: 70,
  output_tokens: 30,
  cost: 0.01,
  online_seconds: 3600,
  cache_hit_tokens: 0,
  cache_miss_tokens: 0,
})
const fixture = (): DashboardData => ({
  hourly_data: Array.from({ length: 12 }, (_, i) => row(i)),
  daily_data: [],
  model_stats: [],
  recent_activity: [],
  summary: {
    total_requests: 78,
    total_messages: 170,
    total_replies: 80,
    total_tokens: 1200,
    input_tokens: 840,
    output_tokens: 360,
    total_cost: 0.12,
    avg_response_time: 1.2,
    online_time: 43200,
    cache_hit_rate: null,
    cache_hit_tokens: 0,
    cache_miss_tokens: 0,
    chat_cache_hit_tokens: 0,
    chat_cache_miss_tokens: 0,
    chat_cache_hit_rate: null,
    cost_per_hour: 0.01,
    tokens_per_hour: 100,
  },
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})
describe('native charts use real dashboard data', () => {
  it('updates the visible freshness time on the current successful data refresh', () => {
    vi.useFakeTimers()
    const first = new Date(2026, 10, 8, 12, 0, 0)
    vi.setSystemTime(first)
    source.data = fixture()
    const view = render(<OrchisNativeMetrics />)
    expect(view.container.querySelector('time')).toHaveTextContent(
      first.toLocaleTimeString('zh-CN', { hour12: false })
    )
    const second = new Date(2026, 10, 8, 12, 5, 0)
    vi.setSystemTime(second)
    source.data = fixture()
    view.rerender(<OrchisNativeMetrics />)
    expect(view.container.querySelector('time')).toHaveTextContent(
      second.toLocaleTimeString('zh-CN', { hour12: false })
    )
  })
  it('zooms and resets the actual request samples and retains original range selection', () => {
    source.data = fixture()
    render(<OrchisNativeChart kind="requests" />)
    const plot = screen.getByRole('img', { name: '请求趋势折线图' })
    expect(within(plot).getAllByRole('button')).toHaveLength(12)
    fireEvent.click(screen.getByRole('button', { name: '放大请求趋势图表' }))
    expect(within(plot).getAllByRole('button')).toHaveLength(6)
    fireEvent.click(screen.getByRole('button', { name: '重置请求趋势图表范围' }))
    expect(within(plot).getAllByRole('button')).toHaveLength(12)
    fireEvent.click(screen.getByRole('button', { name: '7天' }))
    expect(source.setRange).toHaveBeenCalledWith(168)
  })
  it('keeps supplementary stats and represents unknown cache without fabricating a percent', () => {
    source.data = fixture()
    render(<OrchisNativeMetrics />)
    expect(screen.getByText('—')).toBeInTheDocument()
    fireEvent.click(screen.getByText('统计详情'))
    expect(screen.getByText('平均响应')).toBeInTheDocument()
    expect(screen.getByText('处理消息')).toBeInTheDocument()
    expect(screen.getByText('已回复')).toBeInTheDocument()
    expect(screen.getByText('170')).toBeInTheDocument()
  })
  it('shows empty data rather than a decorative fake graph', () => {
    source.data = null
    render(<OrchisNativeChart kind="tokens" />)
    expect(screen.getByRole('status')).toHaveTextContent('当前范围没有统计记录')
    expect(
      screen.queryByRole('img', { name: '输入与输出 Token 堆叠柱状图' })
    ).not.toBeInTheDocument()
  })
})
