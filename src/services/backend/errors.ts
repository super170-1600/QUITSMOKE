export type BackendErrorKind =
  | 'authentication'
  | 'conflict'
  | 'network'
  | 'not_found'
  | 'permission'
  | 'validation'
  | 'unknown'

interface ErrorDetails {
  code: string
  message: string
  details: string
  hint: string
  status: string
  category: string
}

export class BackendError extends Error {
  readonly code: string
  readonly kind: BackendErrorKind
  readonly original: unknown
  readonly details: string
  readonly hint: string

  constructor(
    message: string,
    options: {
      code?: string
      kind: BackendErrorKind
      original: unknown
      details?: string
      hint?: string
    },
  ) {
    super(message)
    this.name = 'BackendError'
    this.code = options.code ?? ''
    this.kind = options.kind
    this.original = options.original
    this.details = options.details ?? ''
    this.hint = options.hint ?? ''
  }
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : ''
}

function getErrorDetails(error: unknown): ErrorDetails {
  if (error instanceof BackendError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      status: '',
      category: error.kind,
    }
  }

  if (error instanceof Error) {
    const record = error as unknown as Record<string, unknown>
    return {
      code: readString(record, 'code') || readString(record, 'errorCode'),
      message: error.message,
      details: readString(record, 'details') || readString(record, 'error_description'),
      hint: readString(record, 'hint') || readString(record, 'helpMessage'),
      status: readString(record, 'status') || readString(record, 'statusCode'),
      category: readString(record, 'category'),
    }
  }

  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>
    return {
      code: readString(record, 'code') || readString(record, 'errorCode'),
      message: readString(record, 'message') || readString(record, 'error_description'),
      details: readString(record, 'details'),
      hint: readString(record, 'hint') || readString(record, 'helpMessage'),
      status: readString(record, 'status') || readString(record, 'statusCode'),
      category: readString(record, 'category'),
    }
  }

  return { code: '', message: '', details: '', hint: '', status: '', category: '' }
}

function includesAny(value: string, candidates: readonly string[]) {
  return candidates.some((candidate) => value.includes(candidate))
}

export function toBackendError(
  error: unknown,
  options: { authIdentifier?: '邮箱' | '用户名'; operation?: string } = {},
): BackendError {
  if (error instanceof BackendError) return error

  const details = getErrorDetails(error)
  const searchable = [
    details.code,
    details.message,
    details.details,
    details.status,
    details.category,
  ].join(' ').toLowerCase()
  const identifier = options.authIdentifier ?? '账号'

  let kind: BackendErrorKind = 'unknown'
  let friendlyMessage = options.operation
    ? `${options.operation}未完成，请稍后再试。`
    : '操作未完成，请稍后再试。'

  if (includesAny(searchable, ['user_not_found', 'user not found', 'username not found'])) {
    kind = 'authentication'
    friendlyMessage = `${identifier}不存在，请检查后重试。`
  } else if (includesAny(searchable, [
    'invalid_username_or_password',
    'invalid_credentials',
    'invalid login credentials',
    'invalid_password',
    'wrong_password',
    'invalid password',
    'password error',
  ])) {
    kind = 'authentication'
    friendlyMessage = `${identifier}或密码不正确，请重新输入。`
  } else if (includesAny(searchable, [
    'already_exists',
    'already registered',
    'already exists',
    'user already',
    'username registered',
    'username_already_exists',
    '23505',
  ])) {
    kind = 'conflict'
    friendlyMessage = `${identifier}已注册，或者该数据已经存在。`
  } else if (
    options.authIdentifier === '用户名'
    && includesAny(searchable, ['missing_required_param', 'registration_not_supported'])
  ) {
    kind = 'authentication'
    friendlyMessage = 'CloudBase 不支持仅用用户名和密码在网页端直接注册，请联系家庭管理员创建账号。'
  } else if (includesAny(searchable, [
    'failed to fetch',
    'network',
    'timeout',
    'timed out',
    'unavailable',
    'unreachable',
    'econn',
  ])) {
    kind = 'network'
    friendlyMessage = '网络连接失败，请检查网络后重试。'
  } else if (includesAny(searchable, [
    '42501',
    '403',
    'permission_denied',
    'permission denied',
    'row-level security',
    'rls',
    'unauthorized',
    'unauthenticated',
  ])) {
    kind = 'permission'
    friendlyMessage = '当前账号没有权限执行此操作，请重新登录后重试。'
  } else if (includesAny(searchable, ['pgrst116', 'not_found', 'not found', 'no rows', '404'])) {
    kind = 'not_found'
    friendlyMessage = '没有找到需要的数据。'
  } else if (includesAny(searchable, [
    'invalid_argument',
    'invalid argument',
    'validation',
    'check constraint',
    '22023',
    '23514',
  ])) {
    kind = 'validation'
    friendlyMessage = '填写的信息不符合要求，请检查后重试。'
  } else if (includesAny(searchable, [
    'registration_not_supported',
    'provider_not_enabled',
    'login_method_disabled',
    'login_type_disabled',
  ])) {
    kind = 'authentication'
    friendlyMessage = '当前环境尚未开放网页注册，请检查 CloudBase 登录方式配置。'
  }

  return new BackendError(friendlyMessage, {
    code: details.code,
    kind,
    original: error,
    details: details.details,
    hint: details.hint,
  })
}

export async function runBackendRequest<T extends { error: unknown }>(
  request: PromiseLike<T>,
  operation: string,
): Promise<T> {
  try {
    const response = await request
    if (response.error) throw toBackendError(response.error, { operation })
    return response
  } catch (error: unknown) {
    throw toBackendError(error, { operation })
  }
}

export function getBackendErrorDiagnostics(error: unknown) {
  const backendError = toBackendError(error)
  const originalDetails = getErrorDetails(backendError.original)
  return {
    message: originalDetails.message || backendError.message,
    code: originalDetails.code || backendError.code,
    details: originalDetails.details || backendError.details,
    hint: originalDetails.hint || backendError.hint,
  }
}
