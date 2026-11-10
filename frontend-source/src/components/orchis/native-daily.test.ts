import { it, expect } from 'vitest'
import type { TimeSeriesData } from '@/routes/home/types'
import { nativeDailyRows } from './native-daily'
it('uses backend daily rows and aggregates actual hourly totals when none are supplied', () => {
  const row = (timestamp: string, requests: number): TimeSeriesData => ({
    timestamp,
    requests,
    tokens: requests * 10,
    input_tokens: requests * 8,
    output_tokens: requests * 2,
    cost: requests * 0.01,
    online_seconds: 3600,
    cache_hit_tokens: requests * 4,
    cache_miss_tokens: requests * 4,
  })
  const daily = [row('2026-11-08T00:00:00', 12)]
  expect(nativeDailyRows({ daily_data: daily, hourly_data: [] })).toBe(daily)
  const actual = nativeDailyRows({
    daily_data: [],
    hourly_data: [row('2026-11-09T01:00:00', 2), row('2026-11-09T02:00:00', 3)],
  })
  expect(actual).toHaveLength(1)
  expect(actual[0]).toMatchObject({
    requests: 5,
    tokens: 50,
    input_tokens: 40,
    output_tokens: 10,
    cost: 0.05,
    online_seconds: 7200,
  })
  expect(nativeDailyRows(null)).toEqual([])
})
