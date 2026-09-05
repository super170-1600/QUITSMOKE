import { addLocalDays, differenceInLocalCalendarDays, getLocalDateString, parseLocalDate } from '@/utils/date'

export interface SupporterActivitySummary {
  today: number
  recent7Days: number
  activeDays: number
  latestAt: string | null
}

export interface SupporterActivityDay {
  date: string
  weekday: string
  count: number
  isToday: boolean
}

export function summarizeSupporterActivity(items: { createdAt: string }[], today = getLocalDateString()): SupporterActivitySummary {
  const relevant = items.filter((item) => {
    const date = getLocalDateString(new Date(item.createdAt))
    const difference = differenceInLocalCalendarDays(today, date)
    return difference >= 0
  })
  const activeDates = new Set(relevant.map((item) => getLocalDateString(new Date(item.createdAt))))
  return {
    today: relevant.filter((item) => getLocalDateString(new Date(item.createdAt)) === today).length,
    recent7Days: relevant.filter((item) => differenceInLocalCalendarDays(today, getLocalDateString(new Date(item.createdAt))) < 7).length,
    activeDays: activeDates.size,
    latestAt: relevant[0]?.createdAt ?? null,
  }
}

export function buildSupporterActivityWeek(
  items: { createdAt: string }[],
  today = getLocalDateString(),
): SupporterActivityDay[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    const date = getLocalDateString(new Date(item.createdAt))
    counts.set(date, (counts.get(date) ?? 0) + 1)
  }
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return Array.from({ length: 7 }, (_, index) => {
    const date = addLocalDays(today, index - 6)
    return {
      date,
      weekday: weekdays[parseLocalDate(date).getDay()] ?? '',
      count: counts.get(date) ?? 0,
      isToday: date === today,
    }
  })
}
