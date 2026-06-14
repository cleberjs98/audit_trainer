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

