import { redirect } from 'next/navigation'

import {
  type DashboardAnalytics,
  type DashboardContext,
  DashboardShell,
  MissingProfileDashboard,
} from '@/components/dashboard/dashboard-shell'
import {
  isUserRole,
  type ProfileRow,
} from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/server'
import type { AuditScoreBand, AuditStatus } from '@/types/audit'

type AreaRow = {
  id: string
  name: string
}

type StoreRow = {
  id: string
  name: string
  code: string
  area_id: string
  is_active: boolean
}

type AuditRow = {
  id: string
  store_id: string
  status: AuditStatus
  visit_date: string
  visit_time: string
  total_score: number | string | null
  max_score: number | string | null
  percentage: number | string | null
  score_band: AuditScoreBand | null
  section_scores: unknown
  scoring_model_version: string | null
  created_at: string
  completed_at: string | null
}

type ActionPlanRow = {
  id: string
  store_id: string
  status: 'open' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
}

type ActionItemRow = {
  id: string
  action_plan_id: string
  action_description: string
  owner: string | null
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  status: 'open' | 'in_progress' | 'completed'
}

type SectionScoreJson = {
  sections?: unknown
  bonus?: {
    total_score?: number | string | null
    max_score?: number | string | null
  } | null
}

async function getDashboardContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: ProfileRow
): Promise<DashboardContext> {
  if (profile.role === 'admin') {
    return {
      label: 'Workspace context',
      value: 'All areas and stores',
    }
  }

  if (profile.role === 'area_manager') {
    if (!profile.area_id) {
      return {
        label: 'Assigned area',
        value: 'Not assigned',
      }
    }

    const { data: area } = await supabase
      .from('areas')
      .select('id, name')
      .eq('id', profile.area_id)
      .single<AreaRow>()

    return {
      label: 'Assigned area',
      value: area?.name ?? 'Unavailable',
    }
  }

  if (!profile.store_id) {
    return {
      label: 'Assigned store',
      value: 'Not assigned',
    }
  }

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, code, area_id, is_active')
    .eq('id', profile.store_id)
    .single<StoreRow>()

  return {
    label: 'Assigned store',
    value: store ? `${store.name} (${store.code})` : 'Unavailable',
  }
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  const numeric = Number(value)

  return Number.isFinite(numeric) ? numeric : 0
}

function startOfCurrentMonth() {
  const now = new Date()

  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function dateValue(value: string | null | undefined) {
  if (!value) {
    return 0
  }

  const time = new Date(value).getTime()

  return Number.isNaN(time) ? 0 : time
}

function sortAuditsNewestFirst(audits: AuditRow[]) {
  return [...audits].sort((first, second) => {
    const firstDate = dateValue(
      first.completed_at ?? `${first.visit_date}T${first.visit_time}`
    )
    const secondDate = dateValue(
      second.completed_at ?? `${second.visit_date}T${second.visit_time}`
    )

    return secondDate - firstDate
  })
}

function formatScore(audit: AuditRow | null) {
  if (!audit || audit.status !== 'completed') {
    return 'Not finalized'
  }

  const totalScore = toNumber(audit.total_score)
  const maxScore = toNumber(audit.max_score)

  if (maxScore <= 0) {
    return 'Not finalized'
  }

  if (audit.scoring_model_version === 'pret_ce_v1') {
    const sectionScores = parseSectionScores(audit.section_scores)
    const bonusScore = toNumber(sectionScores?.bonus?.total_score)
    const bonusMaxScore = toNumber(sectionScores?.bonus?.max_score) || 5

    return `${totalScore}/${maxScore} + ${bonusScore}/${bonusMaxScore} bonus`
  }

  return `${totalScore}/${maxScore}`
}

function formatBand(scoreBand: AuditScoreBand | null) {
  if (!scoreBand) {
    return 'Not scored'
  }

  return scoreBand
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function parseSectionScores(value: unknown): SectionScoreJson | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as SectionScoreJson
}

function parseWeakSections(audit: AuditRow | null) {
  if (!audit) {
    return []
  }

  const sectionScores = parseSectionScores(audit.section_scores)

  if (!Array.isArray(sectionScores?.sections)) {
    return []
  }

  return sectionScores.sections
    .map((section) => {
      if (!section || typeof section !== 'object') {
        return null
      }

      const record = section as {
        section_title?: unknown
        scoring_group?: unknown
        total_score?: unknown
        max_score?: unknown
        percentage?: unknown
      }
      const title =
        typeof record.section_title === 'string'
          ? record.section_title
          : 'Checklist section'
      const scoringGroup =
        typeof record.scoring_group === 'string'
          ? record.scoring_group
          : 'core'
      const totalScore = toNumber(record.total_score as number | string | null)
      const maxScore = toNumber(record.max_score as number | string | null)
      const percentage = toNumber(record.percentage as number | string | null)

      return {
        title,
        scoringGroup,
        score: `${totalScore}/${maxScore}`,
        percentage,
      }
    })
    .filter((section): section is NonNullable<typeof section> =>
      Boolean(section)
    )
    .filter((section) => section.scoringGroup !== 'bonus')
    .sort((first, second) => first.percentage - second.percentage)
    .slice(0, 3)
}

function buildRecentAudit(
  audit: AuditRow,
  storesById: Map<string, StoreRow>
): DashboardAnalytics['recentAudits'][number] {
  const store = storesById.get(audit.store_id)

  return {
    id: audit.id,
    storeName: store?.name ?? 'Unavailable store',
    storeCode: store?.code ?? 'N/A',
    visitDate: audit.visit_date,
    completedAt: audit.completed_at,
    scoreLabel: formatScore(audit),
    scoreBand: audit.score_band,
    scoreBandLabel: formatBand(audit.score_band),
  }
}

function averagePercentage(audits: AuditRow[]) {
  const scoredAudits = audits.filter((audit) => toNumber(audit.max_score) > 0)

  if (scoredAudits.length === 0) {
    return null
  }

  const total = scoredAudits.reduce(
    (sum, audit) => sum + toNumber(audit.percentage),
    0
  )

  return Math.round((total / scoredAudits.length) * 10) / 10
}

async function loadDashboardAnalytics(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: ProfileRow,
  context: DashboardContext
): Promise<DashboardAnalytics> {
  let storeQuery = supabase
    .from('stores')
    .select('id, name, code, area_id, is_active')
    .order('name')

  if (profile.role === 'area_manager' && profile.area_id) {
    storeQuery = storeQuery.eq('area_id', profile.area_id)
  }

  if (
    (profile.role === 'store_manager' || profile.role === 'leader') &&
    profile.store_id
  ) {
    storeQuery = storeQuery.eq('id', profile.store_id)
  }

  const { data: storeRows } = await storeQuery.returns<StoreRow[]>()
  const stores = storeRows ?? []
  const storesById = new Map(stores.map((store) => [store.id, store]))

  const { data: auditRows } = await supabase
    .from('audits')
    .select(
      'id, store_id, status, visit_date, visit_time, total_score, max_score, percentage, score_band, section_scores, scoring_model_version, created_at, completed_at'
    )
    .order('created_at', { ascending: false })
    .limit(200)
    .returns<AuditRow[]>()
  const audits = auditRows ?? []
  const completedAudits = sortAuditsNewestFirst(
    audits.filter((audit) => audit.status === 'completed')
  )
  const monthStart = startOfCurrentMonth()
  const completedThisMonth = completedAudits.filter((audit) => {
    const completionTime = dateValue(audit.completed_at ?? audit.created_at)

    return completionTime >= monthStart.getTime()
  })

  const { data: planRows } = await supabase
    .from('action_plans')
    .select('id, store_id, status, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(150)
    .returns<ActionPlanRow[]>()
  const plans = planRows ?? []
  const openPlans = plans.filter((plan) => plan.status !== 'completed')
  const planIds = plans.map((plan) => plan.id)
  let actionItems: ActionItemRow[] = []

  if (planIds.length > 0) {
    const { data: itemRows } = await supabase
      .from('action_plan_items')
      .select('id, action_plan_id, action_description, owner, priority, due_date, status')
      .in('action_plan_id', planIds)
      .returns<ActionItemRow[]>()

    actionItems = itemRows ?? []
  }

  const planStoreById = new Map(plans.map((plan) => [plan.id, plan.store_id]))
  const today = new Date().toISOString().slice(0, 10)
  const openActionItems = actionItems.filter((item) => item.status !== 'completed')
  const overdueActionItems = openActionItems.filter(
    (item) => Boolean(item.due_date) && String(item.due_date) < today
  )
  const attentionStoreIds = new Set<string>()

  for (const audit of completedAudits) {
    if (audit.score_band === 'needs_focus' || audit.score_band === 'critical') {
      attentionStoreIds.add(audit.store_id)
    }
  }

  for (const item of overdueActionItems) {
    const storeId = planStoreById.get(item.action_plan_id)

    if (storeId) {
      attentionStoreIds.add(storeId)
    }
  }

  for (const store of stores) {
    const hasCompletedAudit = completedAudits.some(
      (audit) => audit.store_id === store.id
    )

    if (!hasCompletedAudit) {
      attentionStoreIds.add(store.id)
    }
  }

  const latestAuditByStore = new Map<string, AuditRow>()

  for (const audit of completedAudits) {
    if (!latestAuditByStore.has(audit.store_id)) {
      latestAuditByStore.set(audit.store_id, audit)
    }
  }

  const attentionStores = Array.from(attentionStoreIds)
    .map((storeId) => {
      const store = storesById.get(storeId)

      if (!store) {
        return null
      }

      const latestAudit = latestAuditByStore.get(storeId) ?? null
      const storeOverdueItems = overdueActionItems.filter(
        (item) => planStoreById.get(item.action_plan_id) === storeId
      )
      const reason = latestAudit
        ? latestAudit.score_band === 'needs_focus' ||
          latestAudit.score_band === 'critical'
          ? `${formatBand(latestAudit.score_band)} latest audit`
          : storeOverdueItems.length > 0
            ? `${storeOverdueItems.length} overdue action item${
                storeOverdueItems.length === 1 ? '' : 's'
              }`
            : 'No recent completed audit'
        : 'No completed audits yet'

      return {
        storeName: store.name,
        storeCode: store.code,
        reason,
        scoreLabel: latestAudit ? formatScore(latestAudit) : 'No score',
        tone: latestAudit?.score_band ?? 'needs_focus',
      }
    })
    .filter((store): store is NonNullable<typeof store> => Boolean(store))
    .slice(0, 5)

  const latestAudit = completedAudits[0] ?? null
  const previousAudit = completedAudits[1] ?? null
  const latestPercentage = latestAudit ? toNumber(latestAudit.percentage) : null
  const previousPercentage = previousAudit ? toNumber(previousAudit.percentage) : null
  const trendDelta =
    latestPercentage !== null && previousPercentage !== null
      ? Math.round((latestPercentage - previousPercentage) * 10) / 10
      : null
  const averageThisMonth = averagePercentage(completedThisMonth)
  const recentAudits = completedAudits
    .slice(0, 5)
    .map((audit) => buildRecentAudit(audit, storesById))
  const currentActionItems = openActionItems
    .sort((first, second) => {
      const firstDue = first.due_date ?? '9999-12-31'
      const secondDue = second.due_date ?? '9999-12-31'

      if (firstDue === secondDue) {
        return first.priority.localeCompare(second.priority)
      }

      return firstDue.localeCompare(secondDue)
    })
    .slice(0, 5)
    .map((item) => {
      const storeId = planStoreById.get(item.action_plan_id)
      const store = storeId ? storesById.get(storeId) : null

      return {
        id: item.id,
        title: item.action_description,
        owner: item.owner,
        priority: item.priority,
        dueDate: item.due_date,
        status: item.status,
        storeName: store?.name ?? context.value,
        isOverdue:
          item.status !== 'completed' &&
          Boolean(item.due_date) &&
          String(item.due_date) < today,
      }
    })
  const criticalOrNeedsCount = completedThisMonth.filter(
    (audit) => audit.score_band === 'critical' || audit.score_band === 'needs_focus'
  ).length
  const latestAuditItem = latestAudit
    ? buildRecentAudit(latestAudit, storesById)
    : null
  const metrics: DashboardAnalytics['metrics'] =
    profile.role === 'admin'
      ? [
          {
            label: 'Total stores',
            value: String(stores.length),
            helper: `${stores.filter((store) => store.is_active).length} active`,
          },
          {
            label: 'Completed this month',
            value: String(completedThisMonth.length),
            helper: 'Completed audits',
          },
          {
            label: 'Average core score',
            value:
              averageThisMonth === null ? 'No score' : `${averageThisMonth}%`,
            helper: 'This month',
          },
          {
            label: 'Open action plans',
            value: String(openPlans.length),
            helper: `${overdueActionItems.length} overdue items`,
            tone: overdueActionItems.length > 0 ? 'warning' : 'success',
          },
        ]
      : profile.role === 'area_manager'
        ? [
            {
              label: 'Area stores',
              value: String(stores.length),
              helper: `${stores.filter((store) => store.is_active).length} active`,
            },
            {
              label: 'Completed this month',
              value: String(completedThisMonth.length),
              helper: 'Area audits',
            },
            {
              label: 'Average core score',
              value:
                averageThisMonth === null ? 'No score' : `${averageThisMonth}%`,
              helper: 'This month',
            },
            {
              label: 'Needs attention',
              value: String(criticalOrNeedsCount),
              helper: 'Needs Focus or Critical',
              tone: criticalOrNeedsCount > 0 ? 'warning' : 'success',
            },
          ]
        : [
            {
              label: 'Latest audit score',
              value: latestAuditItem?.scoreLabel ?? 'No score',
              helper: latestAuditItem?.scoreBandLabel ?? 'No completed audits yet',
            },
            {
              label: 'Month average',
              value:
                averageThisMonth === null ? 'No score' : `${averageThisMonth}%`,
              helper: 'Completed audits this month',
            },
            {
              label: 'Score trend',
              value:
                trendDelta === null
                  ? 'No trend'
                  : `${trendDelta > 0 ? '+' : ''}${trendDelta}%`,
              helper: 'Vs previous completed audit',
              tone:
                trendDelta === null
                  ? 'neutral'
                  : trendDelta >= 0
                    ? 'success'
                    : 'warning',
            },
            {
              label:
                profile.role === 'leader'
                  ? 'Open action items'
                  : 'Open action plans',
              value:
                profile.role === 'leader'
                  ? String(openActionItems.length)
                  : String(openPlans.length),
              helper: `${overdueActionItems.length} overdue`,
              tone: overdueActionItems.length > 0 ? 'warning' : 'success',
            },
          ]

  return {
    scopeLabel: context.label,
    scopeValue: context.value,
    completedThisMonth: completedThisMonth.length,
    averageScoreThisMonth: averageThisMonth,
    criticalOrNeedsFocusCount: criticalOrNeedsCount,
    openActionPlanCount: openPlans.length,
    openActionItemCount: openActionItems.length,
    overdueActionItemCount: overdueActionItems.length,
    latestAudit: latestAuditItem,
    trendDelta,
    metrics,
    recentAudits,
    attentionStores,
    currentActionItems,
    weakestSections: parseWeakSections(latestAudit),
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, store_id, area_id, created_at, updated_at')
    .eq('id', user.id)
    .single<ProfileRow>()

  const hasProfile = !error && profile && isUserRole(profile.role)
  const email = user.email ?? profile?.email ?? 'Unknown email'

  if (!hasProfile) {
    return <MissingProfileDashboard email={email} />
  }

  const context = await getDashboardContext(supabase, profile)
  const analytics = await loadDashboardAnalytics(supabase, profile, context)

  return (
    <DashboardShell
      email={email}
      profile={profile}
      context={context}
      analytics={analytics}
    />
  )
}
