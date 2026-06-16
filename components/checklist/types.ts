export type AuditStatus = 'draft' | 'in_progress' | 'completed' | 'archived'
export type AuditScoreBand = 'excellent' | 'good' | 'needs_focus' | 'critical'
export type QuestionScoringGroup = 'core' | 'bonus'
export type QuestionResponseType = 'score' | 'boolean_score'

export type PretBonusScore = {
  total_score?: number | string | null
  max_score?: number | string | null
  answered?: boolean | null
}

export type PretSectionScores = {
  scoring_model_version?: string
  bonus?: PretBonusScore | null
}

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
  scoreBand: AuditScoreBand | null
  sectionScores: PretSectionScores | null
  scoringModelVersion: string
  completedAt: string | null
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
  scoringGroup: QuestionScoringGroup
  responseType: QuestionResponseType
  requiredForCompletion: boolean
  displayNumber: number | null
  scoringModelVersion: string
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
  coreScore: number
  coreMaxScore: number
  corePercentage: number | null
  bonusScore: number
  bonusMaxScore: number
  combinedLabel: string
  percentage: number | null
  answeredCount: number
}

export type SaveAnswerState = {
  status: 'idle' | 'success' | 'error'
  message: string
  answer?: {
    questionId: string
    score: number | null
    maxScore: number
    isNa: boolean
    comment: string | null
  }
}

export type CompleteAuditState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

export const initialSaveAnswerState: SaveAnswerState = {
  status: 'idle',
  message: '',
}

export const initialCompleteAuditState: CompleteAuditState = {
  status: 'idle',
  message: '',
}
