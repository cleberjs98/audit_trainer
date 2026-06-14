'use server'

import { revalidatePath } from 'next/cache'

import { isUserRole, type ProfileRow } from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/server'

export type StoreMutationState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

export const initialStoreMutationState: StoreMutationState = {
  status: 'idle',
  message: '',
}

type StoreAreaRow = {
  area_id: string
}

type ManagementProfileResult =
  | {
      ok: true
      supabase: Awaited<ReturnType<typeof createClient>>
      profile: ProfileRow
    }
  | {
      ok: false
      error: string
    }

async function getManagementProfile(): Promise<ManagementProfileResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'You must be signed in to manage stores.' }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, store_id, area_id, created_at, updated_at')
    .eq('id', user.id)
    .single<ProfileRow>()

  if (error || !profile || !isUserRole(profile.role)) {
    return {
      ok: false,
      error: 'Your profile is not ready for store management.',
    }
  }

  if (profile.role !== 'admin' && profile.role !== 'area_manager') {
    return {
      ok: false,
      error: 'You do not have permission to manage stores.',
    }
  }

  return { ok: true, supabase, profile }
}

function getRequiredText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function storeErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === '23505') {
    return 'A store with this code already exists.'
  }

  if (error.code === '42501') {
    return 'You do not have permission to save this store.'
  }

  return 'Could not save the store. Check the details and try again.'
}

export async function createStoreAction(
  _previousState: StoreMutationState,
  formData: FormData
): Promise<StoreMutationState> {
  const access = await getManagementProfile()

  if (!access.ok) {
    return { status: 'error', message: access.error }
  }

  const name = getRequiredText(formData, 'name')
  const code = getRequiredText(formData, 'code')
  const requestedAreaId = getRequiredText(formData, 'area_id')
  const isActive = formData.get('is_active') === 'on'

  const areaId =
    access.profile.role === 'area_manager'
      ? access.profile.area_id
      : requestedAreaId

  if (!name || !code || !areaId) {
    return {
      status: 'error',
      message: 'Enter a store name, store code, and area before saving.',
    }
  }

  if (
    access.profile.role === 'area_manager' &&
    requestedAreaId &&
    requestedAreaId !== access.profile.area_id
  ) {
    return {
      status: 'error',
      message: 'Area managers can only create stores in their assigned area.',
    }
  }

  const { error } = await access.supabase.from('stores').insert({
    name,
    code,
    area_id: areaId,
    is_active: isActive,
  })

  if (error) {
    return { status: 'error', message: storeErrorMessage(error) }
  }

  revalidatePath('/store-management')

  return { status: 'success', message: 'Store created successfully.' }
}

export async function updateStoreAction(
  _previousState: StoreMutationState,
  formData: FormData
): Promise<StoreMutationState> {
  const access = await getManagementProfile()

  if (!access.ok) {
    return { status: 'error', message: access.error }
  }

  const storeId = getRequiredText(formData, 'store_id')
  const name = getRequiredText(formData, 'name')
  const code = getRequiredText(formData, 'code')
  const isActive = formData.get('is_active') === 'on'

  if (!storeId || !name || !code) {
    return {
      status: 'error',
      message: 'Enter a store name and store code before updating.',
    }
  }

  if (access.profile.role === 'area_manager') {
    if (!access.profile.area_id) {
      return {
        status: 'error',
        message: 'Your area assignment is missing.',
      }
    }

    const { data: store, error } = await access.supabase
      .from('stores')
      .select('area_id')
      .eq('id', storeId)
      .single<StoreAreaRow>()

    if (error || !store || store.area_id !== access.profile.area_id) {
      return {
        status: 'error',
        message: 'Area managers can only update stores in their assigned area.',
      }
    }
  }

  const { error } = await access.supabase
    .from('stores')
    .update({
      name,
      code,
      is_active: isActive,
    })
    .eq('id', storeId)
    .select('id')
    .single<{ id: string }>()

  if (error) {
    return { status: 'error', message: storeErrorMessage(error) }
  }

  revalidatePath('/store-management')

  return { status: 'success', message: 'Store updated successfully.' }
}
