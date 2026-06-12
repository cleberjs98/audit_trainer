import type { AuditScoreBand } from './audit'

export type ActionPlanPriority = 'high' | 'medium' | 'low'

export type ActionPlanItemStatus = 'open' | 'in_progress' | 'completed'

export interface ActionPlanItem {
  id: string
  actionPlanId: string
  description: string
  priority: ActionPlanPriority
  status: ActionPlanItemStatus
  dueDate: string | null
  assignedTo: string | null
  completedAt: string | null
}

export interface ActionPlan {
  id: string
  auditId: string
  storeId: string
  items: ActionPlanItem[]
  createdAt: string
  updatedAt: string
}

export interface ReportSection {
  title: string
  whatWentWell: string[]
  whatNeedsImprovement: string[]
  focusArea: string | null
}

export interface Report {
  id: string
  auditId: string
  storeId: string
  storeName: string
  auditDate: string
  auditorName: string
  totalScore: number
  maxScore: number
  percentage: number
  scoreBand: AuditScoreBand
  sections: ReportSection[]
  priorityFocus: string[]
  aiNarrative: string | null
  actionPlan: ActionPlan | null
  generatedAt: string | null
  exportedAt: string | null
}

export type ReportExportFormat = 'pdf' | 'json'
