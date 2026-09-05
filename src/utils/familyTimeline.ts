import type { EncouragementModel, FamilyMessageModel, FamilyTimelineItem } from '@/types/domain'
import { getReactionEmoji } from '@/utils/encouragement'

export function buildFamilyTimeline(
  messages: FamilyMessageModel[],
  encouragements: EncouragementModel[],
): FamilyTimelineItem[] {
  const messageItems: FamilyTimelineItem[] = messages.map((item) => item.type === 'text'
    ? {
        id: `message:${item.id}`,
        kind: 'text',
        senderId: item.senderId ?? '',
        senderNickname: item.senderNickname,
        content: item.content,
        createdAt: item.createdAt,
        toUserId: null,
      }
    : {
        id: `message:${item.id}`,
        kind: 'system',
        content: item.content,
        createdAt: item.createdAt,
      })

  const encouragementItems: FamilyTimelineItem[] = encouragements.map((item) => ({
    id: `encouragement:${item.id}`,
    kind: item.type === 'message' ? 'text' : 'reaction',
    senderId: item.fromUserId,
    senderNickname: item.fromNickname,
    content: item.type === 'message' ? item.message : getReactionEmoji(item.type),
    createdAt: item.createdAt,
    toUserId: item.toUserId,
  }))

  return [...messageItems, ...encouragementItems]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .slice(-100)
}
