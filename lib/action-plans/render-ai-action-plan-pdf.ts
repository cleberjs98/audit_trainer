import 'server-only'

import PDFDocument from 'pdfkit'

import type { AiActionPlanPdfPayload } from '@/lib/ai/schemas'

type PdfDocument = InstanceType<typeof PDFDocument>

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 24
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const TEXT = '#171A1F'
const GRAPHITE = '#334155'
const GRAPHITE_DARK = '#2F3744'
const GRAPHITE_PANEL = '#3A4250'
const GRAPHITE_SOFT = '#475569'
const MUTED = '#667085'
const BORDER = '#CBD5E1'
const BACKGROUND = '#F4F6F8'
const SURFACE = '#FFFFFF'
const SURFACE_SOFT = '#F8FAFC'
const PRIMARY = '#D11F3A'
const PRIMARY_DARK = '#A9152D'
const PRIMARY_SOFT = '#FDE8EC'
const SUCCESS_SOFT = '#ECFDF3'
const SUCCESS = '#027A48'
const TRAILING_TITLE_WORDS = /\s+(and|or|at|to|&|with)$/i

function stripTrailingTitleWords(value: string) {
  let cleaned = value.trim()

  while (TRAILING_TITLE_WORDS.test(cleaned)) {
    cleaned = cleaned.replace(TRAILING_TITLE_WORDS, '').trim()
  }

  return cleaned
}

function sanitizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function text(
  doc: PdfDocument,
  value: string,
  x: number,
  y: number,
  options: {
    width: number
    height: number
    size: number
    color?: string
    bold?: boolean
    align?: 'left' | 'center' | 'right'
    lineGap?: number
  }
) {
  doc
    .font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(options.size)
    .fillColor(options.color ?? TEXT)
    .text(sanitizeText(value), x, y, {
      width: options.width,
      height: options.height,
      align: options.align,
      lineGap: options.lineGap ?? 0,
      ellipsis: true,
    })
}

function titleSafe(value: string, maxLength = 52) {
  const cleaned = stripTrailingTitleWords(sanitizeText(value))

  if (cleaned.length <= maxLength) {
    return cleaned
  }

  const sliced = cleaned.slice(0, maxLength).trimEnd()
  const lastSpace = sliced.lastIndexOf(' ')
  const wordSafe = lastSpace > maxLength * 0.68 ? sliced.slice(0, lastSpace) : sliced
  const tidied = stripTrailingTitleWords(wordSafe)

  return tidied.trimEnd()
}

function compactGoal(value: string) {
  const cleaned = stripTrailingTitleWords(
    sanitizeText(value).replace(/^goal:\s*/i, '')
  )

  if (cleaned.length <= 50) {
    return cleaned
  }

  const sliced = cleaned.slice(0, 50).trimEnd()
  const lastSpace = sliced.lastIndexOf(' ')

  return stripTrailingTitleWords(lastSpace > 36 ? sliced.slice(0, lastSpace) : sliced)
    .replace(/[.,;:]$/, '')
    .trim()
}

function renderableOpportunities(
  opportunities: AiActionPlanPdfPayload['additional_opportunities']
) {
  return opportunities
    .filter((item) => {
      const combined = `${item.title} ${item.action}`.toLowerCase()

      return (
        !combined.includes('no extra opportunities') &&
        !combined.includes('beyond the three action areas') &&
        !combined.includes('no additional opportunities')
      )
    })
    .slice(0, 2)
}

function bandLabel(value: AiActionPlanPdfPayload['score_overview']['band']) {
  if (!value) {
    return 'Not available'
  }

  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function drawCard(
  doc: PdfDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  fill = SURFACE,
  stroke = BORDER
) {
  doc.roundedRect(x, y, width, height, 8).fillAndStroke(fill, stroke)
}

function sectionLabel(
  doc: PdfDocument,
  label: string,
  x: number,
  y: number,
  width: number
) {
  doc.roundedRect(x, y, width, 18, 9).fill(GRAPHITE)
  text(doc, label, x + 8, y + 5, {
    width: width - 16,
    height: 9,
    size: 8,
    color: SURFACE,
    bold: true,
    align: 'center',
  })
}

function drawHeader(doc: PdfDocument, payload: AiActionPlanPdfPayload) {
  const source = payload.source
  const y = 20

  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 78, 14).fill(GRAPHITE)
  doc.roundedRect(MARGIN, y, 7, 78, 4).fill(PRIMARY)
  text(doc, 'Audit Trainer', MARGIN + 22, y + 18, {
    width: 140,
    height: 12,
    size: 9.5,
    color: '#D9DEE7',
    bold: true,
  })
  text(doc, payload.title, MARGIN + 22, y + 35, {
    width: 220,
    height: 24,
    size: 22,
    color: SURFACE,
    bold: true,
  })
  text(doc, payload.subtitle, MARGIN + 252, y + 20, {
    width: 270,
    height: 14,
    size: 10.5,
    color: '#D9DEE7',
    bold: true,
    align: 'right',
  })
  text(
    doc,
    [
      source.store_name,
      source.store_code ? `Store ${source.store_code}` : null,
      source.date_label,
    ]
      .filter(Boolean)
      .join(' | '),
    MARGIN + 252,
    y + 42,
    {
      width: 270,
      height: 24,
      size: 8.5,
      color: SURFACE,
      align: 'right',
      lineGap: 1,
    }
  )
}

function drawSummaryRow(doc: PdfDocument, payload: AiActionPlanPdfPayload) {
  const y = 108
  const score = payload.score_overview
  const scoreText =
    typeof score.core_score === 'number' ? String(score.core_score) : '--'
  const band = bandLabel(score.band)
  const percentage =
    score.percentage === null ? 'N/A' : `${Math.round(score.percentage)}% core`
  const bonusStatus =
    (score.bonus_score ?? 0) >= 5
      ? 'Outstanding Card: Achieved'
      : 'Outstanding Card: Not achieved'

  drawCard(doc, MARGIN, y, 316, 82)
  sectionLabel(doc, 'SCORE OVERVIEW', MARGIN + 18, y - 9, 132)
  text(doc, 'Audit Score', MARGIN + 20, y + 14, {
    width: 110,
    height: 10,
    size: 8,
    color: MUTED,
    bold: true,
    align: 'center',
  })
  text(doc, scoreText, MARGIN + 20, y + 25, {
    width: 110,
    height: 34,
    size: 34,
    color: PRIMARY_DARK,
    bold: true,
    align: 'center',
  })
  text(doc, `${band} | ${percentage}`, MARGIN + 20, y + 62, {
    width: 110,
    height: 12,
    size: 9,
    color: TEXT,
    bold: true,
    align: 'center',
  })
  doc.roundedRect(MARGIN + 154, y + 18, 142, 20, 6).fill(PRIMARY_SOFT)
  text(doc, bonusStatus, MARGIN + 162, y + 24, {
    width: 126,
    height: 10,
    size: 7.5,
    color: PRIMARY_DARK,
    bold: true,
    align: 'center',
  })
  doc.roundedRect(MARGIN + 154, y + 46, 142, 18, 6).fill(SUCCESS_SOFT)
  text(doc, 'Target: 95+', MARGIN + 162, y + 51, {
    width: 126,
    height: 9,
    size: 7.5,
    color: SUCCESS,
    bold: true,
    align: 'center',
  })
  const sourceX = MARGIN + 332
  drawCard(doc, sourceX, y + 7, CONTENT_WIDTH - 332, 68, SURFACE_SOFT)
  text(doc, 'Source Action Plan', sourceX + 14, y + 20, {
    width: CONTENT_WIDTH - 360,
    height: 10,
    size: 8.6,
    color: TEXT,
    bold: true,
  })
  text(
    doc,
    `Source: ${payload.source_summary.action_item_count} action items | Linked audit: ${payload.source.date_label ?? 'completed'}`,
    sourceX + 14,
    y + 38,
    {
      width: CONTENT_WIDTH - 360,
      height: 16,
      size: 7.8,
      color: GRAPHITE_SOFT,
      bold: true,
    }
  )
  text(doc, payload.source.store_name, sourceX + 14, y + 58, {
    width: CONTENT_WIDTH - 360,
    height: 10,
    size: 7.1,
    color: MUTED,
  })
}

function drawWins(doc: PdfDocument, payload: AiActionPlanPdfPayload) {
  const y = 202
  const wins = payload.wins.slice(0, 3)
  const columns = Math.max(1, Math.min(3, wins.length))
  const gap = 12
  const width = (CONTENT_WIDTH - gap * (columns - 1)) / columns

  text(doc, 'Wins / positives', MARGIN, y - 1, {
    width: CONTENT_WIDTH,
    height: 12,
    size: 10.5,
    color: TEXT,
    bold: true,
  })

  wins.forEach((win, index) => {
    const x = MARGIN + index * (width + gap)
    drawCard(doc, x, y + 17, width, 66, SURFACE_SOFT)
    doc.roundedRect(x, y + 17, width, 5, 2).fill(PRIMARY)
    text(doc, titleSafe(win.title, 34), x + 11, y + 29, {
      width: width - 18,
      height: 22,
      size: 9,
      color: TEXT,
      bold: true,
      align: 'center',
      lineGap: 1,
    })
    text(doc, win.detail, x + 12, y + 52, {
      width: width - 24,
      height: 20,
      size: 7,
      color: MUTED,
      align: 'center',
      lineGap: 1,
    })
  })
}

function drawActionAreas(doc: PdfDocument, payload: AiActionPlanPdfPayload) {
  const sectionY = 288
  const y = 316
  const gap = 10
  const width = (CONTENT_WIDTH - gap * 2) / 3
  const height = 344
  const headerHeight = 56

  doc.roundedRect(MARGIN, sectionY, CONTENT_WIDTH, 20, 8).fill(GRAPHITE)
  doc.roundedRect(MARGIN, sectionY, 118, 20, 8).fill(PRIMARY)
  text(doc, 'ACTION AREAS', MARGIN + 13, sectionY + 6, {
    width: 92,
    height: 8,
    size: 8,
    color: SURFACE,
    bold: true,
    align: 'center',
  })
  text(doc, 'Top operational priorities from the existing plan', MARGIN + 132, sectionY + 6, {
    width: CONTENT_WIDTH - 150,
    height: 8,
    size: 7.5,
    color: '#D9DEE7',
    align: 'right',
  })

  payload.action_areas.slice(0, 3).forEach((area, index) => {
    const x = MARGIN + index * (width + gap)
    drawCard(doc, x, y, width, height)
    doc.roundedRect(x, y, width, headerHeight, 8).fill(GRAPHITE_PANEL)
    doc.roundedRect(x, y + headerHeight - 6, width, 7, 0).fill(GRAPHITE_PANEL)
    doc.circle(x + 20, y + 27, 12).fill(PRIMARY)
    text(doc, String(area.rank), x + 14, y + 20, {
      width: 12,
      height: 12,
      size: 11.5,
      color: SURFACE,
      bold: true,
      align: 'center',
    })
    text(doc, titleSafe(area.title, 36).toUpperCase(), x + 42, y + 13, {
      width: width - 54,
      height: 30,
      size: 8,
      color: SURFACE,
      bold: true,
      lineGap: 1,
    })

    text(doc, 'FEEDBACK', x + 14, y + 68, {
      width: width - 28,
      height: 9,
      size: 7.3,
      color: PRIMARY_DARK,
      bold: true,
    })
    text(doc, area.feedback_summary, x + 14, y + 81, {
      width: width - 28,
      height: 34,
      size: 7.2,
      color: TEXT,
      lineGap: 1,
    })

    doc.moveTo(x + 14, y + 127).lineTo(x + width - 14, y + 127).strokeColor(BORDER).lineWidth(0.6).stroke()
    text(doc, 'ACTIONS', x + 14, y + 137, {
      width: width - 28,
      height: 9,
      size: 7.3,
      color: PRIMARY_DARK,
      bold: true,
    })
    area.actions.slice(0, 3).forEach((item, itemIndex) => {
      const itemY = y + 155 + itemIndex * 30
      doc.circle(x + 18, itemY + 4, 2.2).fill(PRIMARY)
      text(doc, item, x + 25, itemY, {
        width: width - 42,
        height: 22,
        size: 7.8,
        color: TEXT,
        lineGap: 1,
      })
    })

    doc.roundedRect(x + 12, y + 286, width - 24, 44, 6).fill(SUCCESS_SOFT)
    text(doc, 'GOAL', x + 20, y + 295, {
      width: width - 40,
      height: 8,
      size: 7,
      color: SUCCESS,
      bold: true,
    })
    text(doc, compactGoal(area.goal), x + 20, y + 307, {
      width: width - 40,
      height: 20,
      size: 7.8,
      color: SUCCESS,
      bold: true,
      lineGap: 1,
    })
  })
}

function drawOpportunities(doc: PdfDocument, payload: AiActionPlanPdfPayload) {
  const y = 674
  const items = renderableOpportunities(payload.additional_opportunities)

  if (items.length === 0) {
    return false
  }

  drawCard(doc, MARGIN, y, CONTENT_WIDTH, 34, SURFACE_SOFT)
  text(doc, 'Additional opportunities', MARGIN + 12, y + 10, {
    width: 116,
    height: 10,
    size: 8,
    color: TEXT,
    bold: true,
  })

  const gap = 10
  const cellWidth = (CONTENT_WIDTH - 144 - gap) / 2
  items.forEach((item, index) => {
    const x = MARGIN + 134 + index * (cellWidth + gap)
    text(doc, `${titleSafe(item.title, 22)}: ${item.action}`, x, y + 10, {
      width: cellWidth,
      height: 12,
      size: 6.8,
      color: PRIMARY_DARK,
      bold: true,
    })
  })

  return true
}

function drawFocusClosing(doc: PdfDocument, payload: AiActionPlanPdfPayload, y: number) {
  drawCard(doc, MARGIN, y, CONTENT_WIDTH, 58, SURFACE)
  doc.roundedRect(MARGIN, y, 5, 58, 2).fill(PRIMARY)
  text(doc, `Focus: ${payload.focus.bullets[0] ?? payload.focus.title}`, MARGIN + 18, y + 13, {
    width: CONTENT_WIDTH - 32,
    height: 12,
    size: 9.4,
    color: TEXT,
    bold: true,
  })
  text(doc, payload.closing_message, MARGIN + 18, y + 33, {
    width: CONTENT_WIDTH - 36,
    height: 14,
    size: 8.2,
    color: PRIMARY_DARK,
    bold: true,
  })
}

export function renderAiActionPlanPdf(
  payload: AiActionPlanPdfPayload
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      autoFirstPage: true,
      bufferPages: false,
      info: {
        Title: `${payload.source.store_name} Action Plan`,
        Author: 'Audit Trainer',
      },
    })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(BACKGROUND)
    doc.rect(0, 0, PAGE_WIDTH, 8).fill(GRAPHITE_DARK)
    doc.rect(0, PAGE_HEIGHT - 10, PAGE_WIDTH, 10).fill(GRAPHITE_DARK)
    drawHeader(doc, payload)
    drawSummaryRow(doc, payload)
    drawWins(doc, payload)
    drawActionAreas(doc, payload)
    const hasOpportunities = drawOpportunities(doc, payload)
    drawFocusClosing(doc, payload, hasOpportunities ? 718 : 684)
    doc.end()
  })
}
