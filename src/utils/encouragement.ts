import type { ReactionType } from '@/api/encouragement'

const reactionEmoji: Record<ReactionType, string> = {
  heart: '❤️',
  like: '👍',
  clap: '👏',
  fire: '🔥',
  celebrate: '🎉',
}

export function getReactionEmoji(type: ReactionType) {
  return reactionEmoji[type]
}

export function normalizeEncouragementMessage(message: string) {
  const normalized = message.trim()
  return normalized.length > 0 && normalized.length <= 200 ? normalized : null
}
