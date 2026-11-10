import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RecentActivity } from '@/routes/home/types'
import { OrchisActivity } from './OrchisActivity'
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

const activity = (
  model: string,
  tokens: number,
  status: string,
  timestamp: string
): RecentActivity => ({
  model,
  tokens,
  status,
  timestamp,
  request_type: 'reply',
  input_tokens: tokens - 1,
  output_tokens: 1,
  cost: 0,
  time_cost: 1,
  cache_hit_tokens: 0,
  cache_miss_tokens: 0,
})
const items = [
  activity('Alpha', 20, 'success', '2026-11-08T10:00:00'),
  activity('Beta', 90, 'error', '2026-11-08T11:00:00'),
]
describe('Orchis activity table', () => {
  it('shows selected filters explicitly when refresh removes their matching options', () => {
    const props = { loading: false, error: null, onRefresh: vi.fn() }
    const { rerender } = render(<OrchisActivity activities={items} {...props} />)
    fireEvent.change(screen.getByLabelText('筛选模型'), { target: { value: 'Beta' } })
    fireEvent.change(screen.getByLabelText('筛选状态'), { target: { value: 'error' } })
    rerender(<OrchisActivity activities={[items[0]]} {...props} />)
    expect(screen.getByLabelText('筛选模型')).toHaveValue('Beta')
    expect(screen.getByRole('option', { name: 'Beta（当前无记录）' })).toBeInTheDocument()
    expect(screen.getByLabelText('筛选状态')).toHaveValue('error')
    expect(screen.getByRole('option', { name: '失败（当前无记录）' })).toBeInTheDocument()
  })
  it('sorts and filters loaded records without discarding the original data', () => {
    render(<OrchisActivity activities={items} loading={false} error={null} onRefresh={vi.fn()} />)
    expect(within(screen.getAllByRole('row')[1]).getByText('Beta')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Token/ }))
    expect(within(screen.getAllByRole('row')[1]).getByText('Beta')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Token/ }))
    expect(within(screen.getAllByRole('row')[1]).getByText('Alpha')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('筛选模型'), { target: { value: 'Beta' } })
    expect(within(screen.getByRole('table')).queryByText('Alpha')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('筛选状态'), { target: { value: 'success' } })
    expect(screen.getByText('没有符合条件的记录')).toBeInTheDocument()
    expect(items).toHaveLength(2)
  })
  it('shows a retryable error instead of invented records', () => {
    const retry = vi.fn()
    render(
      <OrchisActivity activities={[]} loading={false} error="统计暂不可用" onRefresh={retry} />
    )
    expect(screen.getByRole('alert')).toHaveTextContent('统计暂不可用')
    fireEvent.click(screen.getByRole('button', { name: '刷新活动' }))
    expect(retry).toHaveBeenCalledOnce()
  })
})
