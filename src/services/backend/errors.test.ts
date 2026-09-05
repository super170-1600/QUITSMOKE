import { describe, expect, it } from 'vitest'
import { toBackendError } from './errors'

describe('CloudBase auth error mapping', () => {
  it('maps missing users and bad passwords without exposing backend text', () => {
    expect(toBackendError({ code: 'user_not_found' }, { authIdentifier: '用户名' }).message)
      .toBe('用户名不存在，请检查后重试。')
    expect(toBackendError({ code: 'invalid_username_or_password' }, { authIdentifier: '用户名' }).message)
      .toBe('用户名或密码不正确，请重新输入。')
  })

  it('maps registered usernames, network failures, and RLS denial', () => {
    expect(toBackendError({ code: 'username_already_exists' }, { authIdentifier: '用户名' }).message)
      .toContain('用户名已注册')
    expect(toBackendError({ code: 'invalid_password' }, { authIdentifier: '用户名' }).message)
      .toContain('用户名或密码不正确')
    expect(toBackendError(new Error('Failed to fetch')).message).toContain('网络连接失败')
    expect(toBackendError({ code: '42501', message: 'row-level security policy rejected' }).message)
      .toContain('没有权限')
  })

  it('explains the CloudBase username-only registration limitation', () => {
    expect(toBackendError({ code: 'missing_required_param' }, { authIdentifier: '用户名' }).message)
      .toContain('不支持仅用用户名和密码')
  })
})
