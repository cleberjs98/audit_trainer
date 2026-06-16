import { redirect } from 'next/navigation'

import {
  ActionPlanList,
} from '@/components/action-plans/action-plan-list'
import type {
  ActionPlanListItem,
  ActionPlanStatus,
} from '@/components/action-plans/types'
import { MissingProfileDashboard } from '@/components/dashboard/dashboard-shell'
import { isUserRole, type ProfileRow } from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/server'
import type { AuditScoreBand, AuditStatus } from '@/types/audit'

const ACTION_PLAN_STATUSES = [
  'open',
  'in_progress',
  'completed',
] as const satisfies readonly ActionPlanStatus[]

type ActionPlanRow = {
  id: string
  audit_id: string
  store_id: string
  focus_area: string | null
  summary: string | null
  generated_by_ai: boolean
  status: ActionPlanStatus
  created_at: string
  updated_at: string
}

type StoreRow = {
  id: string
  name: string
  code: string
}

type AuditRow = {
  id: string
  status: AuditStatus
  visit_date: string
  completed_at: string | null
  total_score: number | string
  max_score: number | string
  score_band: AuditScoreBand | null
}

type ItemCountRow = {
  id: string
  action_plan_id: string
  status: 'open' | 'in_progress' | 'completed'
}

type ActionPlansPageProps = {
  searchParams: Promise<{
    status?: string | string[]
  }>
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function isActionPlanStatus(
  value: string | undefined
): value is ActionPlanStatus {
  return ACTION_PLAN_STATUSES.includes(value as ActionPlanStatus)
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  return Number(value)
}

function buildItems(
  plans: ActionPlanRow[],
  stores: StoreRow[],
  audits: AuditRow[],
  items: ItemCountRow[]
): ActionPlanListItem[] {
  const storesById = new Map(stores.map((store) => [store.id, store]))
  const auditsById = new Map(audits.map((audit) => [audit.id, audit]))
  const itemStatsByPlanId = new Map<
    string,
    { itemCount: number; completedItemCount: number }
  >()

  for (const item of items) {
    const current = itemStatsByPlanId.get(item.action_plan_id) ?? {
      itemCount: 0,
      completedItemCount: 0,
    }

    itemStatsByPlanId.set(item.action_plan_id, {
      itemCount: current.itemCount + 1,
      completedItemCount:
        current.completedItemCount + (item.status === 'completed' ? 1 : 0),
    })
  }

  return plans.map((plan) => {
    const store = storesById.get(plan.store_id)
    const audit = auditsById.get(plan.audit_id)
    const itemStats = itemStatsByPlanId.get(plan.id) ?? {
      itemCount: 0,
      completedItemCount: 0,
    }

    return {
      id: plan.id,
      auditId: plan.audit_id,
      storeName: store?.name ?? 'Unavailable store',
      storeCode: store?.code ?? 'N/A',
      auditVisitDate: audit?.visit_date ?? plan.created_at.slice(0, 10),
      auditCompletedAt: audit?.completed_at ?? null,
      auditTotalScore: toNumber(audit?.total_score),
      auditMaxScore: toNumber(audit?.max_score),
      auditScoreBand: audit?.score_band ?? null,
      auditStatus: audit?.status ?? 'completed',
      status: plan.status,
      focusArea: plan.focus_area,
      summary: plan.summary,
      generatedByAi: plan.generated_by_ai,
      itemCount: itemStats.itemCount,
      completedItemCount: itemStats.completedItemCount,
      createdAt: plan.created_at,
      updatedAt: plan.updated_at,
    }
  })
}

export default async function ActionPlansPage({
  searchParams,
}: ActionPlansPageProps) {
  const params = await searchParams
  const statusFilter = firstParam(params.status)
  const activeStatus = isActionPlanStatus(statusFilter) ? statusFilter : null
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

  let planQuery = supabase
    .from('action_plans')
    .select(
      'id, audit_id, store_id, focus_area, summary, generated_by_ai, status, created_at, updated_at'
    )

  if (activeStatus) {
    planQuery = planQuery.eq('status', activeStatus)
  }

  const { data: planRows } = await planQuery
    .order('updated_at', { ascending: false })
    .limit(50)
    .returns<ActionPlanRow[]>()
  const plans = planRows ?? []
  const storeIds = Array.from(new Set(plans.map((plan) => plan.store_id)))
  const auditIds = Array.from(new Set(plans.map((plan) => plan.audit_id)))
  const planIds = plans.map((plan) => plan.id)
  let stores: StoreRow[] = []
  let audits: AuditRow[] = []
  let items: ItemCountRow[] = []

  if (storeIds.length > 0) {
    const { data: storeRows } = await supabase
      .from('stores')
      .select('id, name, code')
      .in('id', storeIds)
      .returns<StoreRow[]>()

    stores = storeRows ?? []
  }

  if (auditIds.length > 0) {
    const { data: auditRows } = await supabase
      .from('audits')
      .select('id, status, visit_date, completed_at, total_score, max_score, score_band')
      .in('id', auditIds)
      .returns<AuditRow[]>()

    audits = auditRows ?? []
  }

  if (planIds.length > 0) {
    const { data: itemRows } = await supabase
      .from('action_plan_items')
      .select('id, action_plan_id, status')
      .in('action_plan_id', planIds)
      .returns<ItemCountRow[]>()

    items = itemRows ?? []
  }

  return (
    <ActionPlanList
      actionPlans={buildItems(plans, stores, audits, items)}
      activeStatus={activeStatus}
    />
  )
}
