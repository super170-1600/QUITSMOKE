import type { FamilyMemberModel } from '@/types/domain'

export function resolveSelectedQuitter(
  members: FamilyMemberModel[],
  requestedUserId?: string,
) {
  const quitters = members.filter((member) => member.role === 'quitter')
  return quitters.find((member) => member.userId === requestedUserId) ?? quitters[0]
}
