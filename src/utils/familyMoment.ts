import type { EncouragementModel, FamilyMessageModel } from '@/types/domain'
import { getReactionEmoji } from '@/utils/encouragement'

export interface FamilySupportMoment {
  id: string
  fromNickname: string
  content: string
  createdAt: string
  kind: 'message' | 'reaction'
}

export function selectLatestFamilySupport(
  messages: FamilyMessageModel[],
  encouragements: EncouragementModel[],
  currentUserId: string,
): FamilySupportMoment | null {
  const messageMoments: FamilySupportMoment[] = messages
    .filter((item) => item.type === 'text' && item.senderId && item.senderId !== currentUserId)
    .map((item) => ({
      id: `message:${item.id}`,
      fromNickname: item.senderNickname,
      content: item.content,
      createdAt: item.createdAt,
      kind: 'message',
    }))

  const encouragementMoments: FamilySupportMoment[] = encouragements
    .filter((item) => item.toUserId === currentUserId && item.fromUserId !== currentUserId)
    .map((item) => ({
      id: `encouragement:${item.id}`,
      fromNickname: item.fromNickname,
      content: item.type === 'message'
        ? item.message
        : `${getReactionEmoji(item.type)} 给你送来一个鼓励`,
      createdAt: item.createdAt,
      kind: item.type === 'message' ? 'message' : 'reaction',
    }))

  return [...messageMoments, ...encouragementMoments]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null
}
