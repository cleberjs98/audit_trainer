export type AuditStatus = 'draft' | 'in_progress' | 'completed' | 'archived'

export type AuditScoreBand = 'excellent' | 'good' | 'needs_focus' | 'critical'
export type QuestionScoringGroup = 'core' | 'bonus'
export type QuestionResponseType = 'score' | 'boolean_score'

// null = unanswered. N/A is represented separately by isNa.
export type QuestionScore = 0 | 1 | 2 | 3 | 4 | 5 | null

export interface ChecklistQuestion {
  id: string
  sectionId: string
  text: string
  maxScore: number
  isRequired: boolean
  scoringGroup: QuestionScoringGroup
  responseType: QuestionResponseType
  requiredForCompletion: boolean
  displayNumber: number | null
  scoringModelVersion: string
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
  isNa: boolean
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

export interface AuditBonusScore {
  totalScore: number
  maxScore: number
  answered: boolean
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
  scoringModelVersion: string
  bonusScore: AuditBonusScore | null
  sections: AuditSectionScore[]
  createdAt: string
  updatedAt: string
  completedAt: string | null
}
