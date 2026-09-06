import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createMySmokingProfile, getMySmokingProfile, getSmokingProfileByUserId, updateMySmokingProfile } from './smokingProfile'
import { createCheckin, getCheckinByDate, getCheckinsBetween, getCheckinsForUserBetween, getRecentCheckins, getTodayCheckin, updateCheckin } from './checkin'
import { replaceMyDevCheckins, upsertMyDevCheckin } from './devTools'

const state = vi.hoisted(() => ({ database: null as unknown }))
const userId = '2096133324830961665'
vi.mock('@/services/backend', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/services/backend')>(),
  getBackendDatabase: () => state.database,
  getAuthenticatedUserId: async () => '2096133324830961665',
}))
const profile = { quit_start_date: '2026-09-01', baseline_daily_cigarettes: 20, cigarettes_per_pack: 20, price_per_pack: 25.5 }
const checkin = { checkin_date: '2026-09-06', cigarettes: 2, craving_level: 3, note: null }

beforeEach(() => {
  vi.stubEnv('VITE_ENABLE_DEV_TOOLS', 'true')
  state.database = createClient('https://example.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input))
        const isProfile = url.pathname.endsWith('/smoking_profiles')
        const fields = isProfile ? profile : checkin
        const select = url.searchParams.get('select') ?? ''
        const idJson = select.includes('user_id::text') ? JSON.stringify(userId) : userId
        const row = `{"user_id":${idJson},"id":"row-uuid","created_at":"2026-09-06","updated_at":"2026-09-06",${JSON.stringify(fields).slice(1)}`
        const single = new Headers(init?.headers).get('accept')?.includes('pgrst.object')
        return new Response(single ? row : `[${row}]`, { status: init?.method === 'POST' ? 201 : 200 })
      },
    },
  })
})
afterEach(() => vi.unstubAllEnvs())

describe('smoking summary and checkin bigint identities', () => {
  it.each([
    ['own profile', () => getMySmokingProfile()],
    ['family profile', () => getSmokingProfileByUserId(userId)],
    ['create profile', () => createMySmokingProfile(profile)],
    ['update profile', () => updateMySmokingProfile(profile)],
  ] as const)('%s preserves ID and numeric statistics', async (_name, request) => {
    expect(await request()).toMatchObject({ user_id: userId, ...profile })
  })

  it.each([
    ['today', () => getTodayCheckin()],
    ['date', () => getCheckinByDate(checkin.checkin_date)],
    ['recent', () => getRecentCheckins()],
    ['own trend', () => getCheckinsBetween('2026-09-01', '2026-09-06')],
    ['family trend', () => getCheckinsForUserBetween(userId, '2026-09-01', '2026-09-06')],
    ['create', () => createCheckin(checkin)],
    ['update', () => updateCheckin('row-uuid', checkin)],
    ['dev upsert', () => upsertMyDevCheckin(checkin)],
    ['dev batch', () => replaceMyDevCheckins('2026-09-01', '2026-09-06', [checkin])],
  ] as const)('%s preserves ID and checkin values', async (_name, request) => {
    const result = await request()
    const row = Array.isArray(result) ? result[0] : result
    expect(row).toMatchObject({ user_id: userId, ...checkin })
  })
})
