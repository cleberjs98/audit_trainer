import type { UserRole } from '@/types/user'

export type TeamManageRole = Exclude<UserRole, 'leader'>
export type InvitationRole = UserRole
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export type TeamActionState = {
  status: 'idle' | 'success' | 'error'
  message: string
  manualInviteLink?: string
}

export const initialTeamActionState: TeamActionState = {
  status: 'idle',
  message: '',
}

export type TeamScopeOption = {
  id: string
  label: string
  areaId?: string
}

export type PendingInvitation = {
  id: string
  email: string
  role: InvitationRole
  status: InvitationStatus
  expiresAt: string
  createdAt: string
  scopeLabel: string
  invitedByLabel: string
}
