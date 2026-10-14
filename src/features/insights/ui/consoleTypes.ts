export interface ConsoleModule {
  id: string
  label: string
  summary: string
  unit?: string
  accent: string
  accessibilityLabel: string
  detail: string
  shape: 'timeline' | 'spectrum' | 'columns' | 'path'
  values: (number | null)[]
  secondary?: { label: string; value: number }[]
}
