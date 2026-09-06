// Cast bigint identities before JSON decoding; String(number) is too late.
export const SMOKING_PROFILE_COLUMNS = 'id, user_id::text, quit_start_date, baseline_daily_cigarettes, cigarettes_per_pack, price_per_pack, created_at, updated_at'
export const CHECKIN_COLUMNS = 'id, user_id::text, checkin_date, cigarettes, craving_level, note, created_at, updated_at'
