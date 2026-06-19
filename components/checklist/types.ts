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

export type AuditEvidence = {
  id: string
  auditId: string
  storeId: string
  questionId: string | null
  auditAnswerId: string | null
  filePath: string
  fileName: string | null
  mimeType: string | null
  fileSizeBytes: number | null
  caption: string | null
  createdAt: string
  signedUrl: string | null
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
  evidence: AuditEvidence[]
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

export type AuditPersonType = 'team_member' | 'barista' | 'mod'

export type AuditPeopleValues = {
  teamMemberName: string
  baristaName: string
  modName: string
}

export type MissingAuditPersonRequirement = {
  personType: AuditPersonType
  label: string
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
    isCriticalFlag: boolean
  }
}

export type MissingCommentRequirement = {
  questionId: string
  displayNumber: number | null
  questionText: string
  reason: 'low_score' | 'critical_issue' | 'bonus_awarded'
}

export type MissingRequiredPhotoRequirement = {
  questionId: string
  displayNumber: number | null
  questionText: string
}

export type CompleteAuditState = {
  status: 'idle' | 'success' | 'error'
  message: string
  missingCommentRequirements?: MissingCommentRequirement[]
  missingPeopleFields?: MissingAuditPersonRequirement[]
  missingRequiredPhotos?: MissingRequiredPhotoRequirement[]
}

export type SaveAuditPeopleState = {
  status: 'idle' | 'success' | 'error'
  message: string
  people?: AuditPeopleValues
}

export type AuditEvidenceActionState = {
  status: 'idle' | 'success' | 'error'
  message: string
  evidence?: AuditEvidence
  evidenceId?: string
}

export type DeleteAuditState = {
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

export const initialSaveAuditPeopleState: SaveAuditPeopleState = {
  status: 'idle',
  message: '',
}

export const initialAuditEvidenceActionState: AuditEvidenceActionState = {
  status: 'idle',
  message: '',
}

export const initialDeleteAuditState: DeleteAuditState = {
  status: 'idle',
  message: '',
}
