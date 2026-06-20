import PDFDocument from 'pdfkit'

import { commentRequirementReason } from '@/lib/audits/comment-requirements'
import { isPhotoRequiredQuestion } from '@/lib/audits/photo-requirements'
import { isUserRole, type ProfileRow } from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type AuditRow = {
  id: string
  store_id: string
  audited_by: string
  status: 'draft' | 'in_progress' | 'completed' | 'archived'
  is_locked: boolean
  visit_date: string
  visit_time: string
  total_score: number | string
  max_score: number | string
  percentage: number | string
  score_band: 'excellent' | 'good' | 'needs_focus' | 'critical' | null
  section_scores: {
    bonus?: {
      total_score?: number | string | null
      max_score?: number | string | null
      answered?: boolean | null
    } | null
  } | null
  scoring_model_version: string | null
  completed_at: string | null
}

type StoreRow = {
  id: string
  name: string
  code: string
  area_id: string
}

type QuestionRow = {
  id: string
  question_text: string
  max_score: number | string
  scoring_group: 'core' | 'bonus'
  response_type: 'score' | 'boolean_score'
  display_number: number | null
  order_index: number
}

type AnswerRow = {
  question_id: string
  score: number | string | null
  comment: string | null
  is_critical_flag: boolean
}

type AuditPersonRow = {
  person_type: 'team_member' | 'barista' | 'mod'
  typed_name: string
}

type EvidenceRow = {
  id: string
  question_id: string | null
  file_path: string
  file_name: string | null
}

type ImageEvidence = EvidenceRow & {
  image: Buffer | null
}

type PdfDocument = InstanceType<typeof PDFDocument>

const PAGE_MARGIN = 36
const FOOTER_RESERVED = 34
const CONTENT_WIDTH = 523
const TEXT = '#171A1F'
const GRAPHITE = '#334155'
const GRAPHITE_DARK = '#2F3744'
const MUTED = '#667085'
const BORDER = '#D9DEE7'
const BACKGROUND = '#F4F6F8'
const SURFACE = '#FFFFFF'
const SURFACE_SOFT = '#F8FAFC'
const PRIMARY = '#D11F3A'
const PRIMARY_DARK = '#A9152D'
const PRIMARY_SOFT = '#FDE8EC'
const SUCCESS = '#12B76A'
const SUCCESS_SOFT = '#ECFDF3'
const WARNING = '#F79009'
const WARNING_SOFT = '#FFFAEB'
const DANGER = '#F04438'
const DANGER_SOFT = '#FEF3F2'
const CREAM = '#FFF8EC'

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  return Number(value)
}

function textValue(value: string | null | undefined, fallback = 'Not recorded') {
  const trimmed = value?.trim()

  return trimmed ? trimmed : fallback
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not available'
  }

  return new Intl.DateTimeFormat('en-IE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Dublin',
  }).format(new Date(value))
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not available'
  }

  return new Intl.DateTimeFormat('en-IE', {
    dateStyle: 'medium',
    timeZone: 'Europe/Dublin',
  }).format(new Date(value))
}

function coreScoreLabel(audit: AuditRow) {
  return `${toNumber(audit.total_score)}/${toNumber(audit.max_score)}`
}

function outstandingCardStatus(audit: AuditRow, bonusAnswer?: AnswerRow) {
  const bonusScore =
    bonusAnswer?.score === null || bonusAnswer?.score === undefined
      ? toNumber(audit.section_scores?.bonus?.total_score)
      : toNumber(bonusAnswer.score)

  return bonusScore >= 5 ? 'Achieved' : 'Not achieved'
}

function scoreBandLabel(scoreBand: AuditRow['score_band']) {
  if (!scoreBand) {
    return 'Not available'
  }

  return scoreBand
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function peopleValues(rows: AuditPersonRow[]) {
  const values = {
    teamMember: 'Not recorded',
    barista: 'Not recorded',
    mod: 'Not recorded',
  }

  for (const row of rows) {
    if (row.person_type === 'team_member') {
      values.teamMember = textValue(row.typed_name)
    } else if (row.person_type === 'barista') {
      values.barista = textValue(row.typed_name)
    } else if (row.person_type === 'mod') {
      values.mod = textValue(row.typed_name)
    }
  }

  return values
}

function sanitizeFileName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'audit-report'
  )
}

function questionLabel(question: QuestionRow) {
  return question.scoring_group === 'bonus'
    ? 'Outstanding Card'
    : `Q${question.display_number ?? question.order_index}`
}

function answerScore(answer: AnswerRow | undefined) {
  if (!answer || answer.score === null || answer.score === undefined) {
    return null
  }

  const score = toNumber(answer.score)

  return Number.isFinite(score) ? score : null
}

function hasComment(answer: AnswerRow | undefined) {
  return Boolean(answer?.comment?.trim())
}

function commentRequirement(question: QuestionRow, answer: AnswerRow | undefined) {
  return commentRequirementReason(
    {
      id: question.id,
      questionText: question.question_text,
      displayNumber: question.display_number,
      scoringGroup: question.scoring_group,
      maxScore: toNumber(question.max_score),
    },
    answer
      ? {
          score: answer.score === null ? null : toNumber(answer.score),
          comment: answer.comment,
          isCriticalFlag: answer.is_critical_flag,
        }
      : null
  )
}

function questionStatus(question: QuestionRow, answer: AnswerRow | undefined) {
  if (answer?.is_critical_flag) {
    return { label: 'Critical', fill: DANGER_SOFT, color: DANGER }
  }

  const score = answerScore(answer)

  if (score === null) {
    return { label: 'Not answered', fill: SURFACE_SOFT, color: MUTED }
  }

  if (question.scoring_group === 'bonus') {
    return score === toNumber(question.max_score)
      ? { label: 'Bonus achieved', fill: CREAM, color: GRAPHITE }
      : { label: 'No bonus', fill: SURFACE_SOFT, color: MUTED }
  }

  return score >= toNumber(question.max_score)
    ? { label: 'Pass', fill: SUCCESS_SOFT, color: SUCCESS }
    : { label: 'Attention', fill: WARNING_SOFT, color: WARNING }
}

async function canAccessAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: ProfileRow,
  audit: AuditRow
) {
  if (profile.role === 'admin') {
    return true
  }

  if (profile.role === 'store_manager' || profile.role === 'leader') {
    return Boolean(profile.store_id) && audit.store_id === profile.store_id
  }

  if (profile.role === 'area_manager') {
    if (!profile.area_id) {
      return false
    }

    const { data: store, error } = await supabase
      .from('stores')
      .select('id, area_id')
      .eq('id', audit.store_id)
      .single<StoreRow>()

    return !error && store?.area_id === profile.area_id
  }

  return false
}

function addHeader(doc: PdfDocument, title: string) {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(BACKGROUND)
  doc.rect(0, 0, doc.page.width, 7).fill(GRAPHITE_DARK)
  doc.roundedRect(PAGE_MARGIN, 22, CONTENT_WIDTH, 36, 10).fill(GRAPHITE)
  doc.roundedRect(PAGE_MARGIN, 22, 6, 36, 3).fill(PRIMARY)
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#D9DEE7')
    .text('Audit Trainer', PAGE_MARGIN + 18, 34, { width: 120 })
  doc
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor(SURFACE)
    .text(title, PAGE_MARGIN + 144, 34, {
      width: CONTENT_WIDTH - 162,
      align: 'right',
      lineBreak: false,
    })

  doc.y = 74
}

function usablePageBottom(doc: PdfDocument) {
  return doc.page.height - FOOTER_RESERVED
}

function ensureSpace(doc: PdfDocument, neededHeight: number, title: string) {
  if (doc.y + neededHeight <= usablePageBottom(doc)) {
    return
  }

  doc.addPage()
  addHeader(doc, title)
}

function sectionTitle(doc: PdfDocument, value: string, title: string) {
  ensureSpace(doc, 36, title)
  doc.moveDown(0.25)
  const y = doc.y
  doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, 24, 8).fill(SURFACE)
  doc.roundedRect(PAGE_MARGIN, y, 5, 24, 2).fill(PRIMARY)
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor(TEXT)
    .text(value, PAGE_MARGIN + 14, y + 7, {
      width: CONTENT_WIDTH - 28,
      lineBreak: false,
    })
  doc.y = y + 34
}

function drawBadge(
  doc: PdfDocument,
  label: string,
  x: number,
  y: number,
  fill: string,
  color: string
) {
  const width = Math.max(54, doc.fontSize(8).widthOfString(label) + 16)

  doc.roundedRect(x, y, width, 18, 9).fillAndStroke(fill, fill)
  doc.font('Helvetica-Bold').fontSize(8).fillColor(color).text(label, x + 8, y + 5, {
    width: width - 16,
    align: 'center',
    lineBreak: false,
  })

  return width
}

function drawMetricCard(
  doc: PdfDocument,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  tone: 'default' | 'primary' | 'success' | 'warning' = 'default'
) {
  const fill =
    tone === 'primary'
      ? PRIMARY_SOFT
      : tone === 'success'
        ? SUCCESS_SOFT
        : tone === 'warning'
          ? WARNING_SOFT
          : SURFACE_SOFT
  const valueColor =
    tone === 'primary'
      ? PRIMARY_DARK
      : tone === 'success'
        ? SUCCESS
        : tone === 'warning'
          ? WARNING
          : TEXT

  doc.roundedRect(x, y, width, 56, 9).fillAndStroke(fill, BORDER)
  doc.font('Helvetica-Bold').fontSize(7.8).fillColor(MUTED).text(label, x + 10, y + 10, {
    width: width - 20,
    lineBreak: false,
  })
  doc.font('Helvetica-Bold').fontSize(13).fillColor(valueColor).text(value, x + 10, y + 29, {
    width: width - 20,
    lineBreak: false,
  })
}

function keyValueRows(
  doc: PdfDocument,
  items: Array<{ label: string; value: string }>,
  title: string
) {
  const columnWidth = (CONTENT_WIDTH - 12) / 2

  for (let index = 0; index < items.length; index += 2) {
    ensureSpace(doc, 42, title)
    const y = doc.y
    const row = items.slice(index, index + 2)

    row.forEach((item, rowIndex) => {
      const x = PAGE_MARGIN + rowIndex * (columnWidth + 12)

      doc.roundedRect(x, y, columnWidth, 34, 8).fillAndStroke(SURFACE, BORDER)
      doc.fontSize(7).fillColor(MUTED).text(item.label, x + 9, y + 7, {
        width: columnWidth - 18,
      })
      doc.fontSize(9).fillColor(GRAPHITE).text(item.value, x + 9, y + 19, {
        width: columnWidth - 18,
        lineBreak: false,
      })
    })

    doc.y = y + 42
  }
}

function drawHero(
  doc: PdfDocument,
  audit: AuditRow,
  store: StoreRow,
  auditorName: string,
  title: string
) {
  addHeader(doc, title)

  const y = doc.y
  const outstandingStatus = outstandingCardStatus(audit)

  doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, 150, 16).fillAndStroke(GRAPHITE, GRAPHITE)
  doc.roundedRect(PAGE_MARGIN, y, 8, 150, 4).fill(PRIMARY)
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#D9DEE7')
    .text('Audit Trainer', PAGE_MARGIN + 22, y + 18)
  doc
    .font('Helvetica-Bold')
    .fontSize(21)
    .fillColor(SURFACE)
    .text('Completed Audit Report', PAGE_MARGIN + 22, y + 39, {
      width: 300,
      lineBreak: false,
    })
  doc.font('Helvetica-Bold').fontSize(13).fillColor(SURFACE).text(store.name, PAGE_MARGIN + 22, y + 72, {
    width: 300,
  })
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#E2E8F0')
    .text(`Store ${store.code} | Visit ${formatDate(audit.visit_date)}`, PAGE_MARGIN + 22, y + 94, {
      width: 300,
      lineBreak: false,
    })
  doc.fontSize(9).text(`Auditor: ${auditorName}`, PAGE_MARGIN + 22, y + 112, {
    width: 300,
    lineBreak: false,
  })
  doc.fontSize(9).text(`Completed: ${formatDateTime(audit.completed_at)}`, PAGE_MARGIN + 22, y + 130, {
    width: 300,
    lineBreak: false,
  })

  doc.roundedRect(PAGE_MARGIN + 338, y + 18, 164, 114, 14).fillAndStroke(SURFACE, SURFACE)
  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('Official score', PAGE_MARGIN + 356, y + 34)
  doc.font('Helvetica-Bold').fontSize(22).fillColor(PRIMARY_DARK).text(coreScoreLabel(audit), PAGE_MARGIN + 356, y + 48, {
    width: 128,
    lineBreak: false,
  })
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(TEXT).text(`${scoreBandLabel(audit.score_band)} | ${Math.round(toNumber(audit.percentage))}% core`, PAGE_MARGIN + 356, y + 76, {
    width: 128,
    lineBreak: false,
  })
  doc.roundedRect(PAGE_MARGIN + 356, y + 94, 128, 22, 7).fill(PRIMARY_SOFT)
  doc.font('Helvetica-Bold').fontSize(7.8).fillColor(PRIMARY_DARK).text(`Outstanding Card: ${outstandingStatus}`, PAGE_MARGIN + 364, y + 101, {
    width: 112,
    align: 'center',
    lineBreak: false,
  })

  doc.y = y + 166
}

function commentAnalytics(questions: QuestionRow[], answersByQuestion: Map<string, AnswerRow>) {
  let requiredExpected = 0
  let requiredRecorded = 0
  let commentsRecorded = 0

  for (const question of questions) {
    const answer = answersByQuestion.get(question.id)

    if (hasComment(answer)) {
      commentsRecorded += 1
    }

    if (commentRequirement(question, answer)) {
      requiredExpected += 1

      if (hasComment(answer)) {
        requiredRecorded += 1
      }
    }
  }

  return {
    commentsRecorded,
    requiredExpected,
    requiredRecorded,
    missingRequired: Math.max(0, requiredExpected - requiredRecorded),
  }
}

function drawSummary(
  doc: PdfDocument,
  title: string,
  audit: AuditRow,
  questions: QuestionRow[],
  coreQuestions: QuestionRow[],
  answersByQuestion: Map<string, AnswerRow>,
  evidenceByQuestion: Map<string, ImageEvidence[]>,
  people: ReturnType<typeof peopleValues>
) {
  const comments = commentAnalytics(questions, answersByQuestion)
  const criticalIssues = [...answersByQuestion.values()].filter(
    (answer) => answer.is_critical_flag
  ).length
  const belowFive = coreQuestions.filter((question) => {
    const score = answerScore(answersByQuestion.get(question.id))

    return score !== null && score < toNumber(question.max_score)
  }).length
  const answeredCount = [...answersByQuestion.values()].filter(
    (answer) => answer.score !== null
  ).length
  const photoCount = [...evidenceByQuestion.values()].reduce(
    (total, evidence) => total + evidence.length,
    0
  )
  const requiredVisualQuestions = coreQuestions.filter((question) =>
    isPhotoRequiredQuestion(question.display_number, question.scoring_group)
  )
  const visualWithPhotos = requiredVisualQuestions.filter(
    (question) => (evidenceByQuestion.get(question.id)?.length ?? 0) > 0
  ).length
  const peopleComplete = [people.teamMember, people.barista, people.mod].every(
    (value) => value !== 'Not recorded'
  )

  sectionTitle(doc, 'Performance overview', title)
  ensureSpace(doc, 132, title)

  const cardWidth = (CONTENT_WIDTH - 24) / 3
  const startY = doc.y

  drawMetricCard(doc, PAGE_MARGIN, startY, cardWidth, 'Core score', `${toNumber(audit.total_score)}/${toNumber(audit.max_score)}`, 'primary')
  drawMetricCard(doc, PAGE_MARGIN + cardWidth + 12, startY, cardWidth, 'Core percentage', `${Math.round(toNumber(audit.percentage))}%`, 'success')
  drawMetricCard(doc, PAGE_MARGIN + (cardWidth + 12) * 2, startY, cardWidth, 'Outstanding Card', outstandingCardStatus(audit), 'default')
  drawMetricCard(doc, PAGE_MARGIN, startY + 64, cardWidth, 'Attention scores', String(belowFive), belowFive > 0 ? 'warning' : 'success')
  drawMetricCard(doc, PAGE_MARGIN + cardWidth + 12, startY + 64, cardWidth, 'Critical issues', String(criticalIssues), criticalIssues > 0 ? 'warning' : 'success')
  drawMetricCard(doc, PAGE_MARGIN + (cardWidth + 12) * 2, startY + 64, cardWidth, 'Photos', String(photoCount), 'default')

  doc.y = startY + 132

  sectionTitle(doc, 'Completion summary', title)
  keyValueRows(
    doc,
    [
      { label: 'Answered questions', value: `${answeredCount}/${questions.length}` },
      { label: 'Scores below 5', value: String(belowFive) },
      { label: 'Comments recorded', value: String(comments.commentsRecorded) },
      { label: 'Required comments expected', value: String(comments.requiredExpected) },
      { label: 'Required comments recorded', value: String(comments.requiredRecorded) },
      { label: 'Missing required comments', value: String(comments.missingRequired) },
      { label: 'Required visual photo coverage', value: `${visualWithPhotos}/${requiredVisualQuestions.length}` },
      { label: 'People on duty', value: peopleComplete ? 'Complete' : 'Not fully recorded' },
    ],
    title
  )
}

function findingSummary(
  count: number,
  noun: string,
  examples: string[],
  empty: string
) {
  if (count === 0) {
    return empty
  }

  const exampleText = examples.length > 0 ? ` Key examples: ${examples.join(', ')}.` : ''

  return `${count} ${noun}.${exampleText}`
}

function listText(items: string[], empty: string) {
  if (items.length === 0) {
    return empty
  }

  return items.slice(0, 4).join(', ') + (items.length > 4 ? `, +${items.length - 4} more` : '')
}

function drawTextBlock(
  doc: PdfDocument,
  label: string,
  value: string,
  title: string,
  tone: 'default' | 'warning' | 'danger' = 'default'
) {
  const height = Math.max(
    48,
    26 + doc.fontSize(9).heightOfString(value, { width: CONTENT_WIDTH - 24 })
  )

  ensureSpace(doc, height + 8, title)

  const y = doc.y
  const fill = tone === 'danger' ? DANGER_SOFT : tone === 'warning' ? WARNING_SOFT : SURFACE_SOFT
  const color = tone === 'danger' ? DANGER : tone === 'warning' ? WARNING : TEXT

  doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, height, 10).fillAndStroke(fill, BORDER)
  doc.font('Helvetica-Bold').fontSize(9).fillColor(color).text(label, PAGE_MARGIN + 12, y + 10)
  doc.font('Helvetica').fontSize(9).fillColor(TEXT).text(value, PAGE_MARGIN + 12, y + 26, {
    width: CONTENT_WIDTH - 24,
  })
  doc.y = y + height + 8
}

function drawKeyFindings(
  doc: PdfDocument,
  title: string,
  coreQuestions: QuestionRow[],
  answersByQuestion: Map<string, AnswerRow>,
  evidenceByQuestion: Map<string, ImageEvidence[]>
) {
  const strengths = coreQuestions
    .filter((question) => answerScore(answersByQuestion.get(question.id)) === toNumber(question.max_score))
    .map((question) => `${questionLabel(question)} - 5/5`)
  const attention = coreQuestions
    .filter((question) => {
      const score = answerScore(answersByQuestion.get(question.id))

      return score !== null && score < toNumber(question.max_score)
    })
    .map((question) => `${questionLabel(question)} ${answerScore(answersByQuestion.get(question.id))}/${toNumber(question.max_score)}`)
  const critical = coreQuestions
    .filter((question) => answersByQuestion.get(question.id)?.is_critical_flag)
    .map((question) => questionLabel(question))
  const requiredVisualQuestions = coreQuestions.filter((question) =>
    isPhotoRequiredQuestion(question.display_number, question.scoring_group)
  )
  const visualWithPhotos = requiredVisualQuestions.filter(
    (question) => (evidenceByQuestion.get(question.id)?.length ?? 0) > 0
  ).length
  const totalPhotos = [...evidenceByQuestion.values()].reduce(
    (total, evidence) => total + evidence.length,
    0
  )
  const photoCoverage =
    totalPhotos === 0
      ? 'No photo evidence recorded.'
      : `${visualWithPhotos}/${requiredVisualQuestions.length} required visual questions have photo evidence.`

  sectionTitle(doc, 'Key findings', title)
  drawTextBlock(
    doc,
    'Strengths',
    findingSummary(
      strengths.length,
      strengths.length === 1 ? 'question scored 5/5' : 'questions scored 5/5',
      strengths.slice(0, 3),
      'No 5/5 core questions recorded.'
    ),
    title
  )
  drawTextBlock(
    doc,
    'Attention needed',
    findingSummary(
      attention.length,
      attention.length === 1 ? 'question needs attention' : 'questions need attention',
      attention.slice(0, 3),
      'No below-5 core scores recorded.'
    ),
    title,
    attention.length > 0 ? 'warning' : 'default'
  )
  drawTextBlock(
    doc,
    'Critical issues',
    critical.length > 0
      ? `${critical.length} critical ${critical.length === 1 ? 'issue' : 'issues'} recorded. ${listText(critical, '')}`
      : 'No critical issues recorded.',
    title,
    critical.length > 0 ? 'danger' : 'default'
  )
  drawTextBlock(doc, 'Photo coverage', photoCoverage, title, totalPhotos === 0 ? 'warning' : 'default')
}

function commentLine(question: QuestionRow, answer: AnswerRow | undefined) {
  if (hasComment(answer)) {
    return answer?.comment?.trim() ?? ''
  }

  return commentRequirement(question, answer) ? 'Required comment missing' : ''
}

function drawQuestionRow(
  doc: PdfDocument,
  question: QuestionRow,
  answer: AnswerRow | undefined,
  photoCount: number,
  title: string
) {
  const score = answerScore(answer)
  const scoreText =
    score === null ? 'Not answered' : `${score}/${toNumber(question.max_score)}`
  const status = questionStatus(question, answer)
  const comment = commentLine(question, answer)
  const questionWidth = CONTENT_WIDTH - 124
  const questionHeight = doc
    .font('Helvetica')
    .fontSize(8.7)
    .heightOfString(question.question_text, { width: questionWidth })
  const commentHeight = comment
    ? doc.font('Helvetica').fontSize(8).heightOfString(comment, { width: questionWidth })
    : 0
  const rowHeight = Math.max(70, 36 + questionHeight + (comment ? commentHeight + 18 : 0))

  ensureSpace(doc, rowHeight + 8, title)

  const y = doc.y

  doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, rowHeight, 9).fillAndStroke(SURFACE, BORDER)
  doc.roundedRect(PAGE_MARGIN, y, 74, rowHeight, 9).fill(SURFACE_SOFT)
  doc.font('Helvetica-Bold').fontSize(10).fillColor(PRIMARY_DARK).text(questionLabel(question), PAGE_MARGIN + 12, y + 12, {
    width: 50,
    lineBreak: false,
  })
  doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT).text(scoreText, PAGE_MARGIN + 12, y + 30, {
    width: 56,
    lineBreak: false,
  })
  drawBadge(doc, status.label, PAGE_MARGIN + 10, y + 49, status.fill, status.color)
  doc.font('Helvetica').fontSize(8.7).fillColor(TEXT).text(question.question_text, PAGE_MARGIN + 90, y + 12, {
    width: questionWidth,
  })

  if (comment) {
    const isMissing = comment === 'Required comment missing'

    doc
      .font(isMissing ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(8)
      .fillColor(isMissing ? DANGER : MUTED)
      .text(comment, PAGE_MARGIN + 90, doc.y + 7, {
        width: questionWidth,
      })
  }

  if (question.scoring_group === 'core') {
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text(`Photos: ${photoCount}`, PAGE_MARGIN + CONTENT_WIDTH - 78, y + rowHeight - 18, {
        width: 66,
        align: 'right',
        lineBreak: false,
      })
  }

  doc.y = y + rowHeight + 8
}

function drawOutstandingCardSection(
  doc: PdfDocument,
  title: string,
  bonusQuestion: QuestionRow,
  answer: AnswerRow | undefined,
  audit: AuditRow
) {
  sectionTitle(doc, 'Outstanding Card', title)

  const status = questionStatus(bonusQuestion, answer)
  const comment = commentLine(bonusQuestion, answer)
  const questionWidth = CONTENT_WIDTH - 34
  const questionHeight = doc
    .font('Helvetica')
    .fontSize(9)
    .heightOfString(bonusQuestion.question_text, { width: questionWidth })
  const commentHeight = comment
    ? doc.font('Helvetica').fontSize(8.2).heightOfString(comment, { width: questionWidth })
    : 0
  const cardHeight = Math.max(112, 76 + questionHeight + (comment ? commentHeight + 18 : 0))

  ensureSpace(doc, cardHeight + 8, title)

  const y = doc.y
  const result = outstandingCardStatus(audit, answer)
  const achieved = result === 'Achieved'

  doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, cardHeight, 12).fillAndStroke(CREAM, BORDER)
  doc.roundedRect(PAGE_MARGIN, y, 7, cardHeight, 3).fill(PRIMARY)
  doc.font('Helvetica-Bold').fontSize(12).fillColor(TEXT).text('Outstanding Card', PAGE_MARGIN + 18, y + 16, {
    width: 230,
    lineBreak: false,
  })
  doc.font('Helvetica-Bold').fontSize(12).fillColor(PRIMARY_DARK).text(result, PAGE_MARGIN + 310, y + 16, {
    width: 94,
    align: 'right',
    lineBreak: false,
  })
  drawBadge(
    doc,
    achieved ? 'Achieved' : 'Not achieved',
    PAGE_MARGIN + CONTENT_WIDTH - 104,
    y + 12,
    status.fill,
    status.color
  )
  doc.font('Helvetica').fontSize(9).fillColor(TEXT).text(bonusQuestion.question_text, PAGE_MARGIN + 18, y + 44, {
    width: questionWidth,
  })

  if (comment) {
    const isMissing = comment === 'Required comment missing'

    doc
      .font(isMissing ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(8.2)
      .fillColor(isMissing ? DANGER : MUTED)
      .text(comment, PAGE_MARGIN + 18, doc.y + 8, {
        width: questionWidth,
      })
  }

  doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(
    'Outstanding Card is recorded separately from the core /95 score.',
    PAGE_MARGIN + 18,
    y + cardHeight - 20,
    {
      width: questionWidth,
      lineBreak: false,
    }
  )
  doc.y = y + cardHeight + 10
}

function drawQuestionDetail(
  doc: PdfDocument,
  title: string,
  coreQuestions: QuestionRow[],
  bonusQuestion: QuestionRow | undefined,
  answersByQuestion: Map<string, AnswerRow>,
  evidenceByQuestion: Map<string, ImageEvidence[]>,
  audit: AuditRow
) {
  sectionTitle(doc, 'Question detail', title)

  for (const question of coreQuestions) {
    drawQuestionRow(
      doc,
      question,
      answersByQuestion.get(question.id),
      evidenceByQuestion.get(question.id)?.length ?? 0,
      title
    )
  }

  if (bonusQuestion) {
    drawOutstandingCardSection(
      doc,
      title,
      bonusQuestion,
      answersByQuestion.get(bonusQuestion.id),
      audit
    )
  }
}

async function downloadEvidenceImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  evidenceRows: EvidenceRow[]
) {
  const images: ImageEvidence[] = []

  for (const evidence of evidenceRows) {
    const { data, error } = await supabase.storage
      .from('audit-evidence')
      .download(evidence.file_path)

    if (error || !data) {
      images.push({ ...evidence, image: null })
      continue
    }

    const arrayBuffer = await data.arrayBuffer()

    images.push({ ...evidence, image: Buffer.from(arrayBuffer) })
  }

  return images
}

function drawPhotoBox(
  doc: PdfDocument,
  evidence: ImageEvidence,
  x: number,
  y: number,
  width: number,
  height: number
) {
  doc.roundedRect(x, y, width, height, 8).fillAndStroke(SURFACE, BORDER)

  if (!evidence.image) {
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('Photo unavailable', x + 8, y + height / 2 - 6, {
      width: width - 16,
      align: 'center',
    })
    return
  }

  try {
    doc.image(evidence.image, x + 3, y + 3, {
      fit: [width - 6, height - 6],
      align: 'center',
      valign: 'center',
    })
  } catch {
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text('Photo unavailable', x + 8, y + height / 2 - 6, {
      width: width - 16,
      align: 'center',
    })
  }
}

function drawPhotoAppendix(
  doc: PdfDocument,
  title: string,
  coreQuestions: QuestionRow[],
  evidenceByQuestion: Map<string, ImageEvidence[]>
) {
  const questionsWithEvidence = coreQuestions.filter(
    (question) => (evidenceByQuestion.get(question.id)?.length ?? 0) > 0
  )

  if (questionsWithEvidence.length === 0) {
    return
  }

  sectionTitle(doc, 'Photo Evidence Appendix', title)

  const photoWidth = 158
  const photoHeight = 106
  const gap = 12

  for (const question of questionsWithEvidence) {
    const evidence = evidenceByQuestion.get(question.id) ?? []
    const shortTitle =
      question.question_text.length > 95
        ? `${question.question_text.slice(0, 92).trimEnd()}...`
        : question.question_text
    const titleText = `${questionLabel(question)} - ${shortTitle}`
    const titleHeight = doc.font('Helvetica-Bold').fontSize(9).heightOfString(titleText, {
      width: CONTENT_WIDTH - 28,
    })
    const rows = Math.ceil(evidence.length / 3)
    const blockHeight = titleHeight + 36 + rows * photoHeight + (rows - 1) * gap

    ensureSpace(doc, Math.min(blockHeight + 10, 250), title)

    let blockY = doc.y
    doc.roundedRect(PAGE_MARGIN, blockY, CONTENT_WIDTH, blockHeight, 12).fillAndStroke(SURFACE_SOFT, BORDER)
    doc.roundedRect(PAGE_MARGIN, blockY, 6, blockHeight, 3).fill(PRIMARY)
    doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT).text(titleText, PAGE_MARGIN + 14, blockY + 12, {
      width: CONTENT_WIDTH - 28,
    })
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(`${evidence.length} photo${evidence.length === 1 ? '' : 's'}`, PAGE_MARGIN + CONTENT_WIDTH - 92, blockY + 12, {
      width: 74,
      align: 'right',
      lineBreak: false,
    })

    let gridY = blockY + titleHeight + 24

    evidence.forEach((item, index) => {
      if (index > 0 && index % 3 === 0) {
        gridY += photoHeight + gap
      }

      if (gridY + photoHeight > usablePageBottom(doc)) {
        doc.y = blockY + blockHeight + 10
        ensureSpace(doc, photoHeight + 62, title)
        blockY = doc.y
        gridY = blockY + 44
        doc.roundedRect(PAGE_MARGIN, blockY, CONTENT_WIDTH, photoHeight + 58, 12).fillAndStroke(SURFACE_SOFT, BORDER)
        doc.roundedRect(PAGE_MARGIN, blockY, 6, photoHeight + 58, 3).fill(PRIMARY)
        doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT).text(`${questionLabel(question)} - continued`, PAGE_MARGIN + 14, blockY + 12, {
          width: CONTENT_WIDTH - 28,
          lineBreak: false,
        })
      }

      const column = index % 3
      const x = PAGE_MARGIN + column * (photoWidth + gap)

      drawPhotoBox(doc, item, x, gridY, photoWidth, photoHeight)
    })

    doc.y = Math.max(doc.y, gridY + photoHeight + 12)
  }
}

function drawReportNote(doc: PdfDocument) {
  if (doc.y + 34 > usablePageBottom(doc)) {
    return
  }

  const y = doc.y

  doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, 28, 8).fillAndStroke(SURFACE_SOFT, BORDER)
  doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(
    'Report note: Outstanding Card is recorded separately from the core /95 score.',
    PAGE_MARGIN + 12,
    y + 10,
    {
      width: CONTENT_WIDTH - 24,
      lineBreak: false,
    }
  )
  doc.y = y + 38
}

function buildPdfBuffer(
  build: (doc: PdfDocument) => void
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE_MARGIN,
      bufferPages: false,
      info: {
        Title: 'Audit Trainer report',
        Author: 'Audit Trainer',
      },
    })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    build(doc)

    doc.end()
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ auditId: string }> }
) {
  const { auditId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Not found', { status: 404 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, store_id, area_id, created_at, updated_at')
    .eq('id', user.id)
    .single<ProfileRow>()

  if (profileError || !profile || !isUserRole(profile.role)) {
    return new Response('Not found', { status: 404 })
  }

  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select(
      'id, store_id, audited_by, status, is_locked, visit_date, visit_time, total_score, max_score, percentage, score_band, section_scores, scoring_model_version, completed_at'
    )
    .eq('id', auditId)
    .single<AuditRow>()

  if (auditError || !audit || audit.status !== 'completed') {
    return new Response('Not found', { status: 404 })
  }

  const allowed = await canAccessAudit(supabase, profile, audit)

  if (!allowed) {
    return new Response('Not found', { status: 404 })
  }

  const [
    { data: store, error: storeError },
    { data: auditor },
    { data: questionRows },
    { data: answerRows },
    { data: peopleRows },
    { data: evidenceRows },
  ] = await Promise.all([
    supabase
      .from('stores')
      .select('id, name, code, area_id')
      .eq('id', audit.store_id)
      .single<StoreRow>(),
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', audit.audited_by)
      .maybeSingle<{ id: string; full_name: string | null; email: string | null }>(),
    supabase
      .from('audit_questions')
      .select(
        'id, question_text, max_score, scoring_group, response_type, display_number, order_index'
      )
      .eq('is_active', true)
      .eq('scoring_model_version', 'pret_ce_v1')
      .in('scoring_group', ['core', 'bonus'])
      .order('scoring_group', { ascending: true })
      .order('display_number', { ascending: true })
      .returns<QuestionRow[]>(),
    supabase
      .from('audit_answers')
      .select('question_id, score, comment, is_critical_flag')
      .eq('audit_id', audit.id)
      .returns<AnswerRow[]>(),
    supabase
      .from('audit_people')
      .select('person_type, typed_name')
      .eq('audit_id', audit.id)
      .returns<AuditPersonRow[]>(),
    supabase
      .from('audit_evidence')
      .select('id, question_id, file_path, file_name')
      .eq('audit_id', audit.id)
      .eq('evidence_type', 'photo')
      .order('created_at', { ascending: true })
      .returns<EvidenceRow[]>(),
  ])

  if (storeError || !store) {
    return new Response('Not found', { status: 404 })
  }

  const questions = (questionRows ?? []).sort((left, right) => {
    if (left.scoring_group !== right.scoring_group) {
      return left.scoring_group === 'core' ? -1 : 1
    }

    return (left.display_number ?? left.order_index) - (right.display_number ?? right.order_index)
  })
  const answersByQuestion = new Map(
    (answerRows ?? []).map((answer) => [answer.question_id, answer])
  )
  const evidenceWithImages =
    (evidenceRows ?? []).length > 0
      ? await downloadEvidenceImages(supabase, evidenceRows ?? [])
      : []
  const evidenceByQuestion = new Map<string, ImageEvidence[]>()

  for (const evidence of evidenceWithImages) {
    if (!evidence.question_id) {
      continue
    }

    evidenceByQuestion.set(evidence.question_id, [
      ...(evidenceByQuestion.get(evidence.question_id) ?? []),
      evidence,
    ])
  }

  const coreQuestions = questions.filter((question) => question.scoring_group === 'core')
  const bonusQuestion = questions.find((question) => question.scoring_group === 'bonus')
  const people = peopleValues(peopleRows ?? [])
  const reportTitle = `${store.name} completed audit`
  const auditorName = textValue(auditor?.full_name ?? auditor?.email)

  const pdf = await buildPdfBuffer((doc) => {
    drawHero(doc, audit, store, auditorName, reportTitle)
    keyValueRows(
      doc,
      [
        { label: 'Visit date', value: formatDate(audit.visit_date) },
        { label: 'Completed', value: formatDateTime(audit.completed_at) },
        { label: 'Status', value: 'Completed and locked' },
        { label: 'Score band', value: scoreBandLabel(audit.score_band) },
      ],
      reportTitle
    )

    sectionTitle(doc, 'People on duty', reportTitle)
    keyValueRows(
      doc,
      [
        { label: 'Team Member', value: people.teamMember },
        { label: 'Barista', value: people.barista },
        { label: 'MOD / Manager on Duty', value: people.mod },
      ],
      reportTitle
    )

    drawSummary(
      doc,
      reportTitle,
      audit,
      questions,
      coreQuestions,
      answersByQuestion,
      evidenceByQuestion,
      people
    )
    drawKeyFindings(
      doc,
      reportTitle,
      coreQuestions,
      answersByQuestion,
      evidenceByQuestion
    )
    drawQuestionDetail(
      doc,
      reportTitle,
      coreQuestions,
      bonusQuestion,
      answersByQuestion,
      evidenceByQuestion,
      audit
    )

    drawReportNote(doc)
    drawPhotoAppendix(doc, reportTitle, coreQuestions, evidenceByQuestion)
  })

  const fileName = `${sanitizeFileName(store.name)}-${audit.visit_date}-audit-report.pdf`

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
