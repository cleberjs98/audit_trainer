import type { AuditScoreBand, AuditStatus } from '@/types/audit'

export type ActionPriority = 'low' | 'medium' | 'high'
export type ActionItemStatus = 'open' | 'in_progress' | 'completed'
export type ActionPlanStatus = 'open' | 'in_progress' | 'completed'

export type ActionPlanActionState = {
  status: 'idle' | 'success' | 'error'
  message: string
  actionPlanId?: string
}

export type ActionPlanItemPayload = {
  actionDescription: string
  owner: string
  priority: ActionPriority
  dueDate: string
  successMeasure: string
  status: ActionItemStatus
}

export type ActionPlanListItem = {
  id: string
  auditId: string
  storeName: string
  storeCode: string
  auditVisitDate: string
  auditCompletedAt: string | null
  auditTotalScore: number
  auditMaxScore: number
  auditScoreBand: AuditScoreBand | null
  auditStatus: AuditStatus
  status: ActionPlanStatus
  focusArea: string | null
  summary: string | null
  generatedByAi: boolean
  itemCount: number
  completedItemCount: number
  createdAt: string
  updatedAt: string
}

export type ActionPlanDetailItem = {
  id: string
  actionPlanId: string
  actionDescription: string
  owner: string | null
  priority: ActionPriority
  dueDate: string | null
  successMeasure: string | null
  status: ActionItemStatus
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ActionPlanDetailData = {
  id: string
  auditId: string
  storeId: string
  storeName: string
  storeCode: string
  auditVisitDate: string
  auditCompletedAt: string | null
  auditTotalScore: number
  auditMaxScore: number
  auditPercentage: number
  auditScoreBand: AuditScoreBand | null
  auditStatus: AuditStatus
  status: ActionPlanStatus
  focusArea: string | null
  summary: string | null
  generatedByAi: boolean
  createdAt: string
  updatedAt: string
  items: ActionPlanDetailItem[]
}

export const initialActionPlanActionState: ActionPlanActionState = {
  status: 'idle',
  message: '',
}
