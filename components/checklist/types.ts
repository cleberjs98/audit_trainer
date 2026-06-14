export type AuditStatus = 'draft' | 'in_progress' | 'completed' | 'archived'

export type ChecklistStore = {
  id: string
  name: string
  code: string
  areaId: string
}

export type ChecklistAudit = {
  id: string
  storeId: string
  status: AuditStatus
  isLocked: boolean
  visitDate: string
  visitTime: string
  mod: string | null
  shiftType: string
  trafficLevel: string
  visitType: string
  totalScore: number
  maxScore: number
  percentage: number
  store: ChecklistStore
}

export type ChecklistAnswer = {
  id: string
  auditId: string
  questionId: string
  score: number | null
  maxScore: number
  isNa: boolean
  comment: string | null
  isCriticalFlag: boolean
}

export type ChecklistQuestion = {
  id: string
  sectionId: string
  questionText: string
  questionDescription: string | null
  maxScore: number
  isRequired: boolean
  isCritical: boolean
  orderIndex: number
  answer: ChecklistAnswer | null
}

export type ChecklistSection = {
  id: string
  title: string
  description: string | null
  orderIndex: number
  questions: ChecklistQuestion[]
}

export type ScorePreview = {
  totalScore: number
  maxScore: number
  percentage: number | null
  answeredCount: number
}
