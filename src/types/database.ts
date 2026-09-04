/** Database-facing types mirror PostgreSQL column names with snake_case keys. */
export type FamilyRole = 'quitter' | 'supporter'

export type EncouragementType =
  | 'heart'
  | 'like'
  | 'clap'
  | 'fire'
  | 'celebrate'
  | 'message'

export interface Profile {
  id: string
  nickname: string
  created_at: string
  updated_at: string
}

export interface Family {
  id: string
  name: string
  invite_code: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface FamilyMember {
  id: string
  family_id: string
  user_id: string
  role: FamilyRole
  joined_at: string
}

export interface SmokingProfile {
  id: string
  user_id: string
  quit_start_date: string
  baseline_daily_cigarettes: number
  cigarettes_per_pack: number
  price_per_pack: number
  created_at: string
  updated_at: string
}

export interface Checkin {
  id: string
  user_id: string
  checkin_date: string
  cigarettes: number
  craving_level: number
  note: string | null
  created_at: string
  updated_at: string
}

export interface Encouragement {
  id: string
  family_id: string
  from_user_id: string
  to_user_id: string
  type: EncouragementType
  message: string | null
  created_at: string
}

