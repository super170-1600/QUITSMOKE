export type HubFaceId = 'checkin' | 'progress' | 'achievements' | 'reserved' | 'support' | 'profile'

/** Stable IDs describe geometry, not a new business permission system. */
export const hubModules = [
  { id: 'checkin', label: '每日打卡', normal: [0, 0, 1], enabled: true },
  { id: 'progress', label: '戒烟数据', normal: [1, 0, 0], enabled: true },
  { id: 'achievements', label: '成就收藏', normal: [0, 1, 0], enabled: true },
  { id: 'reserved', label: '', normal: [0, 0, -1], enabled: false },
  { id: 'support', label: '共生星图', normal: [-1, 0, 0], enabled: true },
  { id: 'profile', label: '个人中心', normal: [0, -1, 0], enabled: true },
] as const
