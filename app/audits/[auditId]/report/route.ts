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

const PAGE_MARGIN = 42
const FOOTER_RESERVED = 58
const CONTENT_WIDTH = 511
const GRAPHITE = '#171A1F'
const MUTED = '#667085'
const BORDER = '#D9DEE7'
const SURFACE = '#FFFFFF'
const SURFACE_SOFT = '#F8FAFC'
const PRIMARY = '#D11F3A'
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

function scoreLabel(audit: AuditRow) {
  const bonusScore = toNumber(audit.section_scores?.bonus?.total_score)
  const bonusMaxScore = toNumber(audit.section_scores?.bonus?.max_score) || 5

  return `${toNumber(audit.total_score)}/${toNumber(audit.max_score)} + ${bonusScore}/${bonusMaxScore} bonus`
}

function bonusLabel(audit: AuditRow, bonusAnswer: AnswerRow | undefined) {
  const bonusScore =
    bonusAnswer?.score === null || bonusAnswer?.score === undefined
      ? toNumber(audit.section_scores?.bonus?.total_score)
      : toNumber(bonusAnswer.score)
  const bonusMaxScore = toNumber(audit.section_scores?.bonus?.max_score) || 5

  return `${bonusScore}/${bonusMaxScore} bonus`
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
  doc
    .fontSize(9)
    .fillColor(MUTED)
    .text('Audit Trainer', PAGE_MARGIN, 24, { continued: true })
    .fillColor(PRIMARY)
    .text(`  ${title}`, { lineBreak: false })

  doc
    .moveTo(PAGE_MARGIN, 40)
    .lineTo(PAGE_MARGIN + CONTENT_WIDTH, 40)
    .lineWidth(0.6)
    .strokeColor(BORDER)
    .stroke()

  doc.y = 58
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
  doc.moveDown(0.35)
  doc.fontSize(14).fillColor(GRAPHITE).text(value, PAGE_MARGIN, doc.y)
  doc
    .moveTo(PAGE_MARGIN, doc.y + 4)
    .lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y + 4)
    .lineWidth(0.5)
    .strokeColor(BORDER)
    .stroke()
  doc.moveDown(0.7)
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
  doc.fontSize(8).fillColor(color).text(label, x + 8, y + 5, {
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
      ? PRIMARY
      : tone === 'success'
        ? SUCCESS
        : tone === 'warning'
          ? WARNING
          : GRAPHITE

  doc.roundedRect(x, y, width, 52, 10).fillAndStroke(fill, BORDER)
  doc.fontSize(8).fillColor(MUTED).text(label, x + 10, y + 10, {
    width: width - 20,
  })
  doc.fontSize(14).fillColor(valueColor).text(value, x + 10, y + 27, {
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

  doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, 136, 16).fillAndStroke(GRAPHITE, GRAPHITE)
  doc.fontSize(11).fillColor(PRIMARY_SOFT).text('Audit Trainer', PAGE_MARGIN + 18, y + 18)
  doc.fontSize(26).fillColor('#FFFFFF').text(store.name, PAGE_MARGIN + 18, y + 38, {
    width: 320,
  })
  doc.fontSize(10).fillColor('#D9DEE7').text(`Store ${store.code}`, PAGE_MARGIN + 18, y + 72)
  doc.fontSize(10).fillColor('#D9DEE7').text(`Auditor: ${auditorName}`, PAGE_MARGIN + 18, y + 90)
  doc.fontSize(10).fillColor('#D9DEE7').text(`Completed: ${formatDateTime(audit.completed_at)}`, PAGE_MARGIN + 18, y + 108)

  doc.roundedRect(PAGE_MARGIN + 344, y + 20, 142, 96, 14).fillAndStroke('#FFFFFF', '#FFFFFF')
  doc.fontSize(8).fillColor(MUTED).text('Final score', PAGE_MARGIN + 360, y + 36)
  doc.fontSize(20).fillColor(PRIMARY).text(scoreLabel(audit), PAGE_MARGIN + 360, y + 52, {
    width: 110,
  })
  doc.fontSize(8).fillColor(MUTED).text(`${scoreBandLabel(audit.score_band)} - ${Math.round(toNumber(audit.percentage))}% core`, PAGE_MARGIN + 360, y + 86, {
    width: 110,
  })

  doc.y = y + 154
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
  drawMetricCard(doc, PAGE_MARGIN + (cardWidth + 12) * 2, startY, cardWidth, 'Outstanding bonus', `${toNumber(audit.section_scores?.bonus?.total_score)}/${toNumber(audit.section_scores?.bonus?.max_score) || 5}`, 'default')
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

function listText(items: string[], empty: string) {
  if (items.length === 0) {
    return empty
  }

  return items.slice(0, 8).join(', ') + (items.length > 8 ? `, +${items.length - 8} more` : '')
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
  const color = tone === 'danger' ? DANGER : tone === 'warning' ? WARNING : GRAPHITE

  doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, height, 10).fillAndStroke(fill, BORDER)
  doc.fontSize(9).fillColor(color).text(label, PAGE_MARGIN + 12, y + 10)
  doc.fontSize(9).fillColor(GRAPHITE).text(value, PAGE_MARGIN + 12, y + 26, {
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
    .map((question) => questionLabel(question))
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
  drawTextBlock(doc, 'Strengths', listText(strengths, 'No 5/5 core questions recorded.'), title)
  drawTextBlock(doc, 'Attention needed', listText(attention, 'No below-5 core scores recorded.'), title, attention.length > 0 ? 'warning' : 'default')
  drawTextBlock(doc, 'Critical issues', listText(critical, 'No critical issues recorded.'), title, critical.length > 0 ? 'danger' : 'default')
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
  const questionWidth = CONTENT_WIDTH - 118
  const questionHeight = doc
    .fontSize(9)
    .heightOfString(question.question_text, { width: questionWidth })
  const commentHeight = comment
    ? doc.fontSize(8).heightOfString(comment, { width: questionWidth })
    : 0
  const rowHeight = Math.max(58, 30 + questionHeight + (comment ? commentHeight + 12 : 0))

  ensureSpace(doc, rowHeight + 8, title)

  const y = doc.y

  doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, rowHeight, 9).fillAndStroke(SURFACE, BORDER)
  doc.fontSize(10).fillColor(PRIMARY).text(questionLabel(question), PAGE_MARGIN + 10, y + 10, {
    width: 42,
    lineBreak: false,
  })
  doc.fontSize(10).fillColor(GRAPHITE).text(scoreText, PAGE_MARGIN + 60, y + 10, {
    width: 50,
    lineBreak: false,
  })
  drawBadge(doc, status.label, PAGE_MARGIN + CONTENT_WIDTH - 86, y + 8, status.fill, status.color)
  doc.fontSize(9).fillColor(GRAPHITE).text(question.question_text, PAGE_MARGIN + 116, y + 10, {
    width: questionWidth,
  })

  if (comment) {
    const isMissing = comment === 'Required comment missing'

    doc
      .fontSize(8)
      .fillColor(isMissing ? DANGER : MUTED)
      .text(comment, PAGE_MARGIN + 116, doc.y + 5, {
        width: questionWidth,
      })
  }

  if (question.scoring_group === 'core') {
    doc
      .fontSize(8)
      .fillColor(MUTED)
      .text(`Photos: ${photoCount}`, PAGE_MARGIN + 10, y + rowHeight - 18, {
        width: 84,
        lineBreak: false,
      })
  }

  doc.y = y + rowHeight + 8
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

  if (!bonusQuestion) {
    return
  }

  sectionTitle(doc, 'Outstanding Card bonus', title)
  ensureSpace(doc, 34, title)
  doc.fontSize(11).fillColor(PRIMARY).text(
    `Bonus result: ${bonusLabel(audit, answersByQuestion.get(bonusQuestion.id))}`,
    PAGE_MARGIN,
    doc.y
  )
  doc.moveDown(0.5)
  drawQuestionRow(
    doc,
    bonusQuestion,
    answersByQuestion.get(bonusQuestion.id),
    0,
    title
  )
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
  doc.roundedRect(x, y, width, height, 8).strokeColor(BORDER).stroke()

  if (!evidence.image) {
    doc.fontSize(8).fillColor(MUTED).text('Photo unavailable', x + 8, y + height / 2 - 6, {
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
    doc.fontSize(8).fillColor(MUTED).text('Photo unavailable', x + 8, y + height / 2 - 6, {
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

  const photoWidth = 150
  const photoHeight = 102
  const gap = 12

  for (const question of questionsWithEvidence) {
    const evidence = evidenceByQuestion.get(question.id) ?? []
    const titleHeight = doc.fontSize(9).heightOfString(
      `${questionLabel(question)} - ${question.question_text}`,
      { width: CONTENT_WIDTH }
    )
    const rows = Math.ceil(evidence.length / 3)
    const blockHeight = titleHeight + 10 + rows * photoHeight + (rows - 1) * gap + 14

    ensureSpace(doc, Math.min(blockHeight, 240), title)
    doc.fontSize(9).fillColor(GRAPHITE).text(
      `${questionLabel(question)} - ${question.question_text}`,
      PAGE_MARGIN,
      doc.y,
      { width: CONTENT_WIDTH }
    )
    doc.moveDown(0.4)

    evidence.forEach((item, index) => {
      if (index > 0 && index % 3 === 0) {
        doc.y += photoHeight + gap
      }

      ensureSpace(doc, photoHeight + 20, title)

      const column = index % 3
      const x = PAGE_MARGIN + column * (photoWidth + gap)
      const y = doc.y

      drawPhotoBox(doc, item, x, y, photoWidth, photoHeight)

      if (column === 2 || index === evidence.length - 1) {
        doc.y = y
      }
    })

    doc.y += photoHeight + 18
  }
}

function buildPdfBuffer(
  build: (doc: PdfDocument) => void
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE_MARGIN,
      bufferPages: true,
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

    const range = doc.bufferedPageRange()

    for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
      doc.switchToPage(pageIndex)
      doc
        .fontSize(8)
        .fillColor(MUTED)
        .text(
          `Audit Trainer report - Page ${pageIndex + 1} of ${range.count}`,
          PAGE_MARGIN,
          doc.page.height - 50,
          {
            width: CONTENT_WIDTH,
            align: 'center',
            lineBreak: false,
          }
        )
    }

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

    drawPhotoAppendix(doc, reportTitle, coreQuestions, evidenceByQuestion)

    sectionTitle(doc, 'Report notes', reportTitle)
    doc.fontSize(9).fillColor(MUTED).text(
      'Scores are completed audit values stored by Audit Trainer. Outstanding Card bonus is separate and is not folded into the core /95 score.',
      PAGE_MARGIN,
      doc.y,
      { width: CONTENT_WIDTH }
    )
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
