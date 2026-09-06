const USER_ID_PATTERN = /^\d+$/

export function normalizeUserId(value: unknown): string {
  if (typeof value === 'string') {
    const normalized = value.trim()
    if (!normalized) throw new Error('用户 ID 为空。')
    return normalized
  }

  if (typeof value === 'bigint') return value.toString()

  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new Error('用户 ID 超出安全整数范围，请以字符串返回，避免精度丢失。')
    }
    return String(value)
  }

  throw new Error('无法识别用户 ID。')
}

export function normalizeNullableUserId(value: unknown): string | null {
  return value === null || value === undefined ? null : normalizeUserId(value)
}

export function isCloudBaseNumericUserId(value: string): boolean {
  return USER_ID_PATTERN.test(value)
}

export function normalizeUserIdFields<T extends object>(
  value: T,
  fields: readonly string[],
): T {
  const normalized = { ...(value as unknown as Record<string, unknown>) }
  for (const field of fields) {
    normalized[field] = normalizeNullableUserId(normalized[field])
  }
  return normalized as T
}
