import { describe, expect, it } from 'vitest'
import { getFriendlyAuthError } from '@/utils/authError'

describe('getFriendlyAuthError', () => {
  it('maps common Supabase auth errors to friendly messages', () => {
    expect(getFriendlyAuthError(new Error('Invalid login credentials'))).toContain('邮箱或密码')
    expect(getFriendlyAuthError(new Error('Email not confirmed'))).toContain('验证邮件')
    expect(getFriendlyAuthError(new Error('User already registered'))).toContain('已经注册')
    expect(getFriendlyAuthError(new Error('Email rate limit exceeded'))).toContain('稍后再试')
  })

  it('keeps an actionable unknown error and handles non-errors', () => {
    expect(getFriendlyAuthError(new Error('Network request failed'))).toContain('网络连接失败')
    expect(getFriendlyAuthError(null)).toBe('操作未完成，请稍后再试。')
  })
})
