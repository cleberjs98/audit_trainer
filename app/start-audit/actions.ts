'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { isUserRole, type ProfileRow } from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/server'

export type StartAuditState = {
  status: 'idle' | 'success' | 'error'
  message: string
  auditId?: string
}

export const initialStartAuditState: StartAuditState = {
  status: 'idle',
  message: '',
}

const SHIFT_TYPES = ['morning', 'afternoon', 'evening'] as const
const TRAFFIC_LEVELS = ['low', 'medium', 'high'] as const
const VISIT_TYPES = [
  'training_audit',
  'follow_up_audit',
  'mystery_shop_simulation',
] as const

type ShiftType = (typeof SHIFT_TYPES)[number]
type TrafficLevel = (typeof TRAFFIC_LEVELS)[number]
type VisitType = (typeof VISIT_TYPES)[number]

type ActiveStoreRow = {
  id: string
  area_id: string
  is_active: boolean
}

type StartAuditAccess =
  | {
      ok: true
      supabase: Awaited<ReturnType<typeof createClient>>
      profile: ProfileRow
      userId: string
    }
  | {
      ok: false
      error: string
    }

async function getStartAuditAccess(): Promise<StartAuditAccess> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'You must be signed in to start an audit.' }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, store_id, area_id, created_at, updated_at')
    .eq('id', user.id)
    .single<ProfileRow>()

  if (error || !profile || !isUserRole(profile.role)) {
    return {
      ok: false,
      error: 'Your profile is not ready for audit creation.',
    }
  }

  return { ok: true, supabase, profile, userId: user.id }
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function isOneOf<T extends readonly string[]>(
  value: string,
  options: T
): value is T[number] {
  return options.includes(value)
}

function isValidDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isValidTimeInput(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function auditInsertErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === '42501') {
    return 'You do not have permission to start an audit for this store.'
  }

  if (error.code === '23503') {
    return 'The selected store or profile could not be found.'
  }

  return 'Could not start the audit. Check the details and try again.'
}

export async function startAuditAction(
  _previousState: StartAuditState,
  formData: FormData
): Promise<StartAuditState> {
  const access = await getStartAuditAccess()

  if (!access.ok) {
    return { status: 'error', message: access.error }
  }

  const requestedStoreId = getText(formData, 'store_id')
  const visitDate = getText(formData, 'visit_date')
  const visitTime = getText(formData, 'visit_time')
  const shiftType = getText(formData, 'shift_type')
  const trafficLevel = getText(formData, 'traffic_level')
  const visitType = getText(formData, 'visit_type')
  const mod = getText(formData, 'mod')
  const initialNotes = getText(formData, 'initial_notes')

  const storeId =
    access.profile.role === 'store_manager' || access.profile.role === 'leader'
      ? access.profile.store_id
      : requestedStoreId

  if (!storeId) {
    return {
      status: 'error',
      message: 'Choose a store before starting the audit.',
    }
  }

  if (!visitDate || !visitTime || !shiftType || !trafficLevel || !visitType) {
    return {
      status: 'error',
      message:
        'Complete the store, visit date, visit time, shift, traffic level, and visit type before starting.',
    }
  }

  if (!isValidDateInput(visitDate) || !isValidTimeInput(visitTime)) {
    return {
      status: 'error',
      message: 'Enter a valid visit date and visit time.',
    }
  }

  if (
    !isOneOf(shiftType, SHIFT_TYPES) ||
    !isOneOf(trafficLevel, TRAFFIC_LEVELS) ||
    !isOneOf(visitType, VISIT_TYPES)
  ) {
    return {
      status: 'error',
      message: 'Choose valid audit details before starting.',
    }
  }

  const { data: store, error: storeError } = await access.supabase
    .from('stores')
    .select('id, area_id, is_active')
    .eq('id', storeId)
    .single<ActiveStoreRow>()

  if (storeError || !store) {
    return {
      status: 'error',
      message: 'The selected store is unavailable.',
    }
  }

  if (!store.is_active) {
    return {
      status: 'error',
      message: 'Audits can only be started for active stores.',
    }
  }

  if (
    access.profile.role === 'area_manager' &&
    store.area_id !== access.profile.area_id
  ) {
    return {
      status: 'error',
      message: 'Area managers can only start audits in their assigned area.',
    }
  }

  if (
    (access.profile.role === 'store_manager' ||
      access.profile.role === 'leader') &&
    store.id !== access.profile.store_id
  ) {
    return {
      status: 'error',
      message: 'You can only start audits for your assigned store.',
    }
  }

  const { data: audit, error } = await access.supabase
    .from('audits')
    .insert({
      store_id: store.id,
      audited_by: access.userId,
      status: 'draft' as const,
      visit_date: visitDate,
      visit_time: visitTime,
      shift_type: shiftType as ShiftType,
      traffic_level: trafficLevel as TrafficLevel,
      visit_type: visitType as VisitType,
      mod: mod || null,
      initial_notes: initialNotes || null,
    })
    .select('id')
    .single<{ id: string }>()

  if (error || !audit) {
    return {
      status: 'error',
      message: auditInsertErrorMessage(error ?? {}),
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/start-audit')
  revalidatePath(`/audits/${audit.id}`)

  redirect(`/audits/${audit.id}`)
}
