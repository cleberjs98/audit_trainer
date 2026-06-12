export type AuditStatus = 'draft' | 'in_progress' | 'completed' | 'archived'

export type AuditScoreBand = 'excellent' | 'good' | 'needs_focus' | 'critical'

// null = N/A (question skipped or not applicable)
export type QuestionScore = 0 | 1 | 2 | 3 | 4 | 5 | null

export interface ChecklistQuestion {
  id: string
  sectionId: string
  text: string
  maxScore: number
  isRequired: boolean
  orderIndex: number
}

export interface ChecklistSection {
  id: string
  title: string
  description: string
  orderIndex: number
  questions: ChecklistQuestion[]
}

export interface AuditAnswer {
  id: string
  auditId: string
  questionId: string
  score: QuestionScore
  comment: string
  isCritical: boolean
  updatedAt: string
}

export interface AuditPhoto {
  id: string
  auditId: string
  questionId: string
  storageUrl: string
  caption: string
  uploadedAt: string
}

export interface AuditSectionScore {
  sectionId: string
  sectionTitle: string
  score: number
  maxScore: number
  percentage: number
}

export interface Audit {
  id: string
  storeId: string
  storeName: string
  auditedBy: string
  auditorName: string
  status: AuditStatus
  isLocked: boolean
  visitDate: string
  visitTime: string
  mod: string
  shiftType: string
  trafficLevel: string
  visitType: string
  initialNotes: string
  totalScore: number
  maxScore: number
  percentage: number
  scoreBand: AuditScoreBand
  sections: AuditSectionScore[]
  createdAt: string
  updatedAt: string
  completedAt: string | null
}
