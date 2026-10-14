import type { Summary } from './types'

// Candidate sources are not an approved medical milestone configuration.
// No thresholds are enabled until both source review and evidence contract exist.
export const recoveryCandidates = [
  { publisher: 'CDC', url: 'https://www.cdc.gov/tobacco/about/benefits-of-quitting.html', status: 'pending-review' },
  { publisher: 'WHO', url: 'https://www.who.int/news-room/questions-and-answers/item/tobacco-health-benefits-of-smoking-cessation', status: 'pending-review' },
] as const

export function recoveryStatus(): Summary['recovery'] {
  return { reachedIds: [], sourceVersion: 'pending-review-v1', eligibility: 'unknown', reason: '参考配置与持续无烟依据尚未确认' }
}
