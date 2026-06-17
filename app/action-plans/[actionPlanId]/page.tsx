import { redirect } from 'next/navigation'

import { ActionPlanDetail } from '@/components/action-plans/action-plan-detail'
import type {
  ActionPlanDetailData,
  ActionPlanDetailItem,
  ActionPlanStatus,
} from '@/components/action-plans/types'
import { MissingProfileDashboard } from '@/components/dashboard/dashboard-shell'
import { isUserRole, type ProfileRow } from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/server'
import type { AuditScoreBand, AuditStatus } from '@/types/audit'

type ActionPlanPageProps = {
  params: Promise<{
    actionPlanId: string
  }>
}

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
  area_id: string
}

type AuditRow = {
  id: string
  status: AuditStatus
  visit_date: string
  completed_at: string | null
  total_score: number | string
  max_score: number | string
  percentage: number | string
  score_band: AuditScoreBand | null
}

type ItemRow = {
  id: string
  action_plan_id: string
  action_description: string
  owner: string | null
  priority: ActionPlanDetailItem['priority']
  due_date: string | null
  success_measure: string | null
  status: ActionPlanDetailItem['status']
  completed_at: string | null
  created_at: string
  updated_at: string
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  return Number(value)
}

function ActionPlanAccessFallback() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-warning/20 bg-warning-soft p-5 text-warning shadow-sm">
          <p className="text-sm font-semibold">Action plan unavailable</p>
          <h1 className="mt-2 text-2xl font-semibold">
            Action plan not found or access denied.
          </h1>
          <p className="mt-3 text-sm leading-6">
            The plan may not exist, or it may be outside your assigned store or
            area.
          </p>
        </div>
      </section>
    </main>
  )
}

function buildDetailData(
  plan: ActionPlanRow,
  store: StoreRow,
  audit: AuditRow,
  items: ItemRow[]
): ActionPlanDetailData {
  return {
    id: plan.id,
    auditId: plan.audit_id,
    storeId: plan.store_id,
    storeName: store.name,
    storeCode: store.code,
    auditVisitDate: audit.visit_date,
    auditCompletedAt: audit.completed_at,
    auditTotalScore: toNumber(audit.total_score),
    auditMaxScore: toNumber(audit.max_score),
    auditPercentage: toNumber(audit.percentage),
    auditScoreBand: audit.score_band,
    auditStatus: audit.status,
    status: plan.status,
    focusArea: plan.focus_area,
    summary: plan.summary,
    generatedByAi: plan.generated_by_ai,
    createdAt: plan.created_at,
    updatedAt: plan.updated_at,
    items: items.map((item) => ({
      id: item.id,
      actionPlanId: item.action_plan_id,
      actionDescription: item.action_description,
      owner: item.owner,
      priority: item.priority,
      dueDate: item.due_date,
      successMeasure: item.success_measure,
      status: item.status,
      completedAt: item.completed_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    })),
  }
}

function canManageActionPlan(profile: ProfileRow, store: StoreRow) {
  if (profile.role === 'admin') {
    return true
  }

  if (profile.role === 'area_manager') {
    return Boolean(profile.area_id && profile.area_id === store.area_id)
  }

  if (profile.role === 'store_manager' || profile.role === 'leader') {
    return Boolean(profile.store_id && profile.store_id === store.id)
  }

  return false
}

function readOnlyReason(
  profile: ProfileRow,
  plan: ActionPlanRow,
  store: StoreRow
) {
  if (!canManageActionPlan(profile, store)) {
    return 'This action plan is outside your management scope.'
  }

  if (plan.status === 'completed' && profile.role !== 'admin') {
    return 'Completed action plans are read-only for non-admin users.'
  }

  return null
}

export default async function ActionPlanDetailPage({
  params,
}: ActionPlanPageProps) {
  const { actionPlanId } = await params
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

  const { data: plan, error: planError } = await supabase
    .from('action_plans')
    .select(
      'id, audit_id, store_id, focus_area, summary, generated_by_ai, status, created_at, updated_at'
    )
    .eq('id', actionPlanId)
    .single<ActionPlanRow>()

  if (planError || !plan) {
    return <ActionPlanAccessFallback />
  }

  const [
    { data: store, error: storeError },
    { data: audit, error: auditError },
    { data: itemRows },
  ] = await Promise.all([
    supabase
      .from('stores')
      .select('id, name, code, area_id')
      .eq('id', plan.store_id)
      .single<StoreRow>(),
    supabase
      .from('audits')
      .select('id, status, visit_date, completed_at, total_score, max_score, percentage, score_band')
      .eq('id', plan.audit_id)
      .single<AuditRow>(),
    supabase
      .from('action_plan_items')
      .select(
        'id, action_plan_id, action_description, owner, priority, due_date, success_measure, status, completed_at, created_at, updated_at'
      )
      .eq('action_plan_id', plan.id)
      .order('created_at', { ascending: true })
      .returns<ItemRow[]>(),
  ])

  if (storeError || auditError || !store || !audit) {
    return <ActionPlanAccessFallback />
  }

  const reason = readOnlyReason(profile, plan, store)

  return (
    <ActionPlanDetail
      actionPlan={buildDetailData(plan, store, audit, itemRows ?? [])}
      canManage={!reason}
      readOnlyReason={reason}
      userRole={profile.role}
    />
  )
}
