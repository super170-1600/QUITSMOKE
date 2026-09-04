export interface Checkin {
  id: string
  userId: string
  date: string
  cigarettes: number
  cravingLevel: number
  note?: string | null
  createdAt: string
  updatedAt: string
}
