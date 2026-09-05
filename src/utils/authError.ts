export function getFriendlyAuthError(error: unknown) {
  const original = error instanceof Error ? error.message : ''
  const normalized = original.toLowerCase()
  if (normalized.includes('invalid login credentials')) return '邮箱或密码不正确，请重新输入。'
  if (normalized.includes('email not confirmed')) return '请先打开验证邮件完成邮箱确认。'
  if (normalized.includes('user already registered')) return '这个邮箱已经注册，可以直接登录。'
  if (normalized.includes('password') && (normalized.includes('characters') || normalized.includes('weak'))) return '密码强度不足，请设置更安全的密码。'
  if (normalized.includes('rate limit') || normalized.includes('too many')) return '尝试次数较多，请稍后再试。'
  return original || '操作未完成，请稍后再试。'
}
