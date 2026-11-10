import type { DashboardData, TimeSeriesData } from '@/routes/home/types'
/** Prefer server daily buckets; a 24h response may contain hourly buckets only. */
export function nativeDailyRows(
  data: Pick<DashboardData, 'daily_data' | 'hourly_data'> | null
): TimeSeriesData[] {
  if (!data) return []
  if (data.daily_data.length) return data.daily_data
  const days = new Map<string, TimeSeriesData>()
  for (const point of data.hourly_data) {
    const date = new Date(point.timestamp)
    if (!Number.isFinite(date.getTime())) continue
    date.setHours(0, 0, 0, 0)
    const key = date.toISOString(),
      previous = days.get(key)
    if (!previous) {
      days.set(key, { ...point, timestamp: key })
      continue
    }
    for (const field of [
      'requests',
      'tokens',
      'input_tokens',
      'output_tokens',
      'cost',
      'online_seconds',
      'cache_hit_tokens',
      'cache_miss_tokens',
    ] as const)
      previous[field] += point[field]
  }
  return [...days.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}
