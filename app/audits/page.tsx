import { redirect } from 'next/navigation'

import {
  AuditHistoryList,
  type AuditHistoryItem,
} from '@/components/audit-history/audit-history-list'
import { MissingProfileDashboard } from '@/components/dashboard/dashboard-shell'
import { isUserRole, type ProfileRow } from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/server'
import type { AuditScoreBand, AuditStatus } from '@/types/audit'

const AUDIT_STATUSES = [
  'draft',
  'in_progress',
  'completed',
  'archived',
] as const satisfies readonly AuditStatus[]

const AUDIT_SCORE_BANDS = [
  'excellent',
  'good',
  'needs_focus',
  'critical',
] as const satisfies readonly AuditScoreBand[]

type AuditRow = {
  id: string
  store_id: string
  audited_by: string
  status: AuditStatus
  is_locked: boolean
  visit_date: string
  visit_time: string
  total_score: number | string
  max_score: number | string
  percentage: number | string
  score_band: AuditScoreBand | null
  section_scores: AuditHistoryItem['sectionScores']
  scoring_model_version: string | null
  created_at: string
  completed_at: string | null
}

type StoreRow = {
  id: string
  name: string
  code: string
  area_id: string
}

type AreaRow = {
  id: string
  name: string
}

type CreatorRow = {
  id: string
  full_name: string
  email: string
}

type AuditHistoryPageProps = {
  searchParams: Promise<{
  status?: string | string[]
  score_band?: string | string[]
  q?: string | string[]
}>
}

function isAuditStatus(value: string | undefined): value is AuditStatus {
  return AUDIT_STATUSES.includes(value as AuditStatus)
}

function isAuditScoreBand(
  value: string | undefined
): value is AuditScoreBand {
  return AUDIT_SCORE_BANDS.includes(value as AuditScoreBand)
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  return Number(value)
}

function buildAuditItems(
  audits: AuditRow[],
  stores: StoreRow[],
  areas: AreaRow[],
  creators: CreatorRow[]
): AuditHistoryItem[] {
  const storesById = new Map(stores.map((store) => [store.id, store]))
  const areasById = new Map(areas.map((area) => [area.id, area]))
  const creatorsById = new Map(
    creators.map((creator) => [creator.id, creator])
  )

  return audits.map((audit) => {
    const store = storesById.get(audit.store_id)
    const area = store ? areasById.get(store.area_id) : null
    const creator = creatorsById.get(audit.audited_by)

    return {
      id: audit.id,
      storeName: store?.name ?? 'Unavailable store',
      storeCode: store?.code ?? 'N/A',
      areaName: area?.name ?? 'Unavailable area',
      creatorName: creator?.full_name ?? 'Unavailable user',
      creatorEmail: creator?.email ?? null,
      status: audit.status,
      isLocked: audit.is_locked,
      visitDate: audit.visit_date,
      visitTime: audit.visit_time,
      totalScore: toNumber(audit.total_score),
      maxScore: toNumber(audit.max_score),
      percentage: toNumber(audit.percentage),
      scoreBand: audit.score_band,
      sectionScores: audit.section_scores,
      scoringModelVersion: audit.scoring_model_version ?? 'legacy_62_v1',
      createdAt: audit.created_at,
      completedAt: audit.completed_at,
    }
  })
}

export default async function AuditHistoryPage({
  searchParams,
}: AuditHistoryPageProps) {
  const params = await searchParams
  const statusFilter = firstParam(params.status)
  const scoreBandFilter = firstParam(params.score_band)
  const searchQuery = firstParam(params.q)?.trim() ?? ''
  const activeStatus = isAuditStatus(statusFilter) ? statusFilter : null
  const activeScoreBand = isAuditScoreBand(scoreBandFilter)
    ? scoreBandFilter
    : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, store_id, area_id, created_at, updated_at')
    .eq('id', user.id)
    .single<ProfileRow>()

  const email = user.email ?? profile?.email ?? 'Unknown email'

  if (profileError || !profile || !isUserRole(profile.role)) {
    return <MissingProfileDashboard email={email} />
  }

  let auditQuery = supabase
    .from('audits')
    .select(
      'id, store_id, audited_by, status, is_locked, visit_date, visit_time, total_score, max_score, percentage, score_band, section_scores, scoring_model_version, created_at, completed_at'
    )

  if (activeStatus) {
    auditQuery = auditQuery.eq('status', activeStatus)
  }

  if (activeScoreBand) {
    auditQuery = auditQuery.eq('score_band', activeScoreBand)
  }

  const { data: auditRows } = await auditQuery
    .order('visit_date', { ascending: false })
    .order('visit_time', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<AuditRow[]>()
  const audits = auditRows ?? []
  const storeIds = Array.from(new Set(audits.map((audit) => audit.store_id)))
  const creatorIds = Array.from(new Set(audits.map((audit) => audit.audited_by)))

  let stores: StoreRow[] = []
  let areas: AreaRow[] = []
  let creators: CreatorRow[] = []

  if (storeIds.length > 0) {
    const { data: storeRows } = await supabase
      .from('stores')
      .select('id, name, code, area_id')
      .in('id', storeIds)
      .returns<StoreRow[]>()

    stores = storeRows ?? []

    const areaIds = Array.from(new Set(stores.map((store) => store.area_id)))

    if (areaIds.length > 0) {
      const { data: areaRows } = await supabase
        .from('areas')
        .select('id, name')
        .in('id', areaIds)
        .returns<AreaRow[]>()

      areas = areaRows ?? []
    }
  }

  if (creatorIds.length > 0) {
    const { data: creatorRows } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', creatorIds)
      .returns<CreatorRow[]>()

    creators = creatorRows ?? []
  }

  return (
    <AuditHistoryList
      audits={buildAuditItems(audits, stores, areas, creators)}
      activeStatus={activeStatus}
      activeScoreBand={activeScoreBand}
      searchQuery={searchQuery}
    />
  )
}
