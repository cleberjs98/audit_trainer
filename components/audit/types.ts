import type { UserRole } from '@/types/user'

export type StartAuditStoreOption = {
  id: string
  name: string
  code: string
  areaName: string
}

export type StartAuditProfile = {
  role: UserRole
  areaId: string | null
  storeId: string | null
}

export type StartAuditState = {
  status: 'idle' | 'success' | 'error'
  message: string
  auditId?: string
}

export const initialStartAuditState: StartAuditState = {
  status: 'idle',
  message: '',
}
