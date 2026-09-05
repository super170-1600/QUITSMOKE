/** Database-facing types mirror PostgreSQL column names with snake_case keys. */
export type FamilyRole = 'quitter' | 'supporter'

/** UUID on Supabase and decimal bigint serialization on CloudBase. */
export type UserId = string

export type EncouragementType =
  | 'heart'
  | 'like'
  | 'clap'
  | 'fire'
  | 'celebrate'
  | 'message'

export type FamilyMessageType = 'text' | 'system_checkin' | 'system_milestone'

export interface Profile {
  id: UserId
  nickname: string
  created_at: string
  updated_at: string
}

export interface Family {
  id: string
  name: string
  invite_code: string
  created_by: UserId
  created_at: string
  updated_at: string
}

export interface FamilyMember {
  id: string
  family_id: string
  user_id: UserId
  role: FamilyRole
  joined_at: string
}

export interface SmokingProfile {
  id: string
  user_id: UserId
  quit_start_date: string
  baseline_daily_cigarettes: number
  cigarettes_per_pack: number
  price_per_pack: number
  created_at: string
  updated_at: string
}

export interface Checkin {
  id: string
  user_id: UserId
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
  from_user_id: UserId
  to_user_id: UserId
  type: EncouragementType
  message: string | null
  created_at: string
}

export interface FamilyMessage {
  id: string
  family_id: string
  sender_id: UserId | null
  type: FamilyMessageType
  content: string
  event_key: string | null
  created_at: string
}
