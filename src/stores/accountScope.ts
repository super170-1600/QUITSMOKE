const ACCOUNT_STORAGE_PREFIXES = [
  'quit-smoking-auth',
  'quit-smoking-profile',
  'quit-smoking-family:auth',
  'quit-smoking-family:profile',
  'quit-smoking-milestone-seen-',
] as const

let accountScopeRevision = 0

export function captureAccountScope() {
  return accountScopeRevision
}

export function isAccountScopeCurrent(revision: number) {
  return revision === accountScopeRevision
}

export function invalidateAccountScope() {
  accountScopeRevision += 1
}

function clearStorage(storage: Storage | undefined) {
  if (!storage) return
  const keys: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key && ACCOUNT_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) keys.push(key)
  }
  keys.forEach((key) => storage.removeItem(key))
}

export function clearProjectAccountStorage() {
  if (typeof window === 'undefined') return
  clearStorage(window.localStorage)
  clearStorage(window.sessionStorage)
}

export async function resetAccountScopedStores() {
  invalidateAccountScope()
  const [familyModule, smokingModule, encouragementModule, messageModule] = await Promise.all([
    import('@/stores/family'),
    import('@/stores/smoking'),
    import('@/stores/encouragement'),
    import('@/stores/message'),
  ])

  familyModule.useFamilyStore().reset()
  smokingModule.useSmokingStore().reset()
  encouragementModule.useEncouragementStore().reset()
  messageModule.useMessageStore().reset()
}
