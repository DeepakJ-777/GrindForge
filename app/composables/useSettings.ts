export interface GrindSettings {
  timezone: string
  theme: 'light' | 'dark'
  notifyDaily: boolean
  notifyWeekly: boolean
  reminderHour: number
}

export const DEFAULT_GRIND_SETTINGS: GrindSettings = {
  timezone: 'Asia/Kolkata',
  theme: 'light',
  notifyDaily: true,
  notifyWeekly: false,
  reminderHour: 19,
}

export function useSettings() {
  return useState<GrindSettings>('grind:settings', () => ({ ...DEFAULT_GRIND_SETTINGS }))
}
