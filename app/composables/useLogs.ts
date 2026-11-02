export interface LogItem {
  id: string
  logDate: string
  note: string
  tags: string[]
  createdAt: string
}

export interface TagCount {
  tag: string
  count: number
}

export interface Stats {
  currentStreak: number
  longestStreak: number
  totalDays: number
  tagCounts: TagCount[]
}

export interface HeatmapDay {
  date: string
  count: number
}

/** Date helpers kept tiny and UTC-stable. */
export function todayString(timezone = 'Asia/Kolkata'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function formatLogDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00.000Z`)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function relativeDay(iso: string): string {
  const today = todayString()
  if (iso === today) return 'Today'
  const yesterday = new Date(`${today}T00:00:00.000Z`)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  if (iso === yesterday.toISOString().slice(0, 10)) return 'Yesterday'
  return formatLogDate(iso)
}
