import { describe, expect, it } from 'vitest'
import { normalizeNullableUserId, normalizeUserId, normalizeUserIdFields } from './userId'

describe('user id normalization', () => {
  it('keeps string ids unchanged after trimming', () => {
    expect(normalizeUserId('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(normalizeUserId('12345678901234567890')).toBe('12345678901234567890')
    expect(normalizeUserId(' 12345678901234567890 ')).toBe('12345678901234567890')
    expect(normalizeNullableUserId(null)).toBeNull()
  })

  it('serializes bigint and safe integer adapter values', () => {
    expect(normalizeUserId(9007199254740993n)).toBe('9007199254740993')
    expect(normalizeUserId(12345)).toBe('12345')
    expect(normalizeUserId(Number.MAX_SAFE_INTEGER)).toBe(String(Number.MAX_SAFE_INTEGER))
  })

  it.each([Number('2096133324830961665'), Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, 1.5])('rejects unsafe numeric ID %s', (value) => {
    expect(() => normalizeUserId(value)).toThrow('安全整数')
  })

  it('normalizes only declared user id fields and preserves business UUIDs', () => {
    const row = normalizeUserIdFields(
      { id: 'message-uuid', family_id: 'family-uuid', sender_id: 42 },
      ['sender_id'],
    )
    expect(row).toEqual({ id: 'message-uuid', family_id: 'family-uuid', sender_id: '42' })
  })
})
