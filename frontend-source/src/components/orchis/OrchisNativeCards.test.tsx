import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { afterEach, it, expect, vi } from 'vitest'
import { Settings } from 'lucide-react'
import {
  NativeHomeContext,
  renderOrchisNativeCard,
  type NativeHomeBusiness,
} from './OrchisNativeCards'
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    search,
    hash,
    children,
  }: {
    to: string
    search?: object
    hash?: string
    children: React.ReactNode
  }) => (
    <a href={to} data-search={JSON.stringify(search)} data-hash={hash}>
      {children}
    </a>
  ),
}))
vi.mock('./OrchisNativeCharts', () => ({
  OrchisNativeChart: () => null,
  OrchisNativeMetrics: () => null,
  useNativeDashboard: () => ({
    dashboardData: {
      daily_data: [],
      hourly_data: [
        {
          timestamp: '2026-11-08T15:30:00',
          requests: 2,
          tokens: 20,
          input_tokens: 10,
          output_tokens: 10,
          cost: 0.01,
        },
      ],
    },
    timeRange: 24,
    setTimeRange: () => {},
  }),
}))
vi.mock('recharts', () => {
  const Wrap = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  return {
    ResponsiveContainer: Wrap,
    BarChart: Wrap,
    Bar: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    YAxis: () => null,
    XAxis: ({ tickFormatter }: { tickFormatter: (v: string) => string }) => (
      <span data-testid="daily-time-tick">{tickFormatter('2026-11-08T15:30:00')}</span>
    ),
  }
})
afterEach(cleanup)
it('passes shortcut pathname, query and hash separately to the original router', () => {
  const business: NativeHomeBusiness = {
    chatPending: false,
    setChatPending: () => {},
    chatDraft: '',
    setChatDraft: () => {},
    chatDraftRevision: { current: 0 },
    customizeShortcuts: () => {},
    hitokoto: null,
    hitokotoLoading: false,
    storage: {
      available: false,
      loading: false,
      size: 0,
      files: 0,
      records: 0,
      tables: 0,
      details: [],
    },
    shortcuts: [
      {
        id: 'settings',
        label: '外观入口',
        category: 'config',
        description: '外观设置',
        href: '/settings?tab=appearance#colors',
        icon: Settings,
      },
    ],
  }
  render(
    <NativeHomeContext.Provider value={business}>
      {renderOrchisNativeCard({
        id: 'builtin:quick-actions',
        title: '快捷操作',
        source: 'builtin',
        render: () => null,
      })}
    </NativeHomeContext.Provider>
  )
  const link = screen.getByRole('link', { name: '外观入口' })
  expect(link).toHaveAttribute('href', '/settings')
  expect(JSON.parse(link.getAttribute('data-search') || '{}')).toEqual({ tab: 'appearance' })
  expect(link).toHaveAttribute('data-hash', 'colors')
})
it('retains hour and minute labels in the original 24h daily chart view', () => {
  render(
    <>
      {renderOrchisNativeCard({
        id: 'builtin:daily-statistics',
        title: '每日统计',
        source: 'builtin',
        render: () => null,
      })}
    </>
  )
  fireEvent.click(screen.getByRole('button', { name: '图表 ↔' }))
  expect(screen.getByTestId('daily-time-tick')).toHaveTextContent('15:30')
})
