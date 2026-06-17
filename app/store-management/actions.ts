'use server'

import { revalidatePath } from 'next/cache'

import type { StoreMutationState } from '@/components/store-management/types'
import { isUserRole, type ProfileRow } from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/server'

type StoreAreaRow = {
  id: string
  area_id: string
}

type StoreManagerProfileRow = {
  id: string
  role: string
  store_id: string | null
}

type StorePayload = {
  name: string
  code: string
  area_id: string
  is_active: boolean
  store_manager_id?: string | null
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  county_or_state: string | null
  postcode: string | null
  country: string | null
  phone: string | null
  email: string | null
  opening_hours: string | null
  location_type: string | null
  terminal: string | null
  airside_landside: string | null
  location_notes: string | null
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

function getOptionalText(formData: FormData, key: string) {
  const value = getRequiredText(formData, key)

  return value || null
}

function getBaseStorePayload(
  formData: FormData,
  areaId: string
): StorePayload {
  return {
    name: getRequiredText(formData, 'name'),
    code: getRequiredText(formData, 'code'),
    area_id: areaId,
    is_active: formData.get('is_active') === 'on',
    address_line_1: getOptionalText(formData, 'address_line_1'),
    address_line_2: getOptionalText(formData, 'address_line_2'),
    city: getOptionalText(formData, 'city'),
    county_or_state: getOptionalText(formData, 'county_or_state'),
    postcode: getOptionalText(formData, 'postcode'),
    country: getOptionalText(formData, 'country'),
    phone: getOptionalText(formData, 'phone'),
    email: getOptionalText(formData, 'email'),
    opening_hours: getOptionalText(formData, 'opening_hours'),
    location_type: getOptionalText(formData, 'location_type'),
    terminal: getOptionalText(formData, 'terminal'),
    airside_landside: getOptionalText(formData, 'airside_landside'),
    location_notes: getOptionalText(formData, 'location_notes'),
  }
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

async function validateStoreManagerAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storeId: string,
  storeManagerId: string | null
) {
  if (!storeManagerId) {
    return null
  }

  const { data: manager, error } = await supabase
    .from('profiles')
    .select('id, role, store_id')
    .eq('id', storeManagerId)
    .single<StoreManagerProfileRow>()

  if (
    error ||
    !manager ||
    manager.role !== 'store_manager' ||
    manager.store_id !== storeId
  ) {
    return 'Choose a store manager assigned to this store.'
  }

  return null
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

  const payload = getBaseStorePayload(formData, areaId)

  const { error } = await access.supabase.from('stores').insert(payload)

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
  const requestedAreaId = getRequiredText(formData, 'area_id')
  const requestedStoreManagerId =
    getRequiredText(formData, 'store_manager_id') || null

  if (!storeId || !name || !code) {
    return {
      status: 'error',
      message: 'Enter a store name and store code before updating.',
    }
  }

  let areaId = requestedAreaId

  if (access.profile.role === 'area_manager') {
    if (!access.profile.area_id) {
      return {
        status: 'error',
        message: 'Your area assignment is missing.',
      }
    }

    const { data: store, error } = await access.supabase
      .from('stores')
      .select('id, area_id')
      .eq('id', storeId)
      .single<StoreAreaRow>()

    if (error || !store || store.area_id !== access.profile.area_id) {
      return {
        status: 'error',
        message: 'Area managers can only update stores in their assigned area.',
      }
    }

    if (requestedAreaId && requestedAreaId !== store.area_id) {
      return {
        status: 'error',
        message: 'Area managers cannot move stores to another area.',
      }
    }

    areaId = store.area_id
  }

  if (!areaId) {
    return {
      status: 'error',
      message: 'Choose an area before updating this store.',
    }
  }

  const managerError = await validateStoreManagerAssignment(
    access.supabase,
    storeId,
    requestedStoreManagerId
  )

  if (managerError) {
    return { status: 'error', message: managerError }
  }

  const payload = {
    ...getBaseStorePayload(formData, areaId),
    store_manager_id: requestedStoreManagerId,
  }

  const { error } = await access.supabase
    .from('stores')
    .update(payload)
    .eq('id', storeId)
    .select('id')
    .single<{ id: string }>()

  if (error) {
    return { status: 'error', message: storeErrorMessage(error) }
  }

  revalidatePath('/store-management')

  return { status: 'success', message: 'Store updated successfully.' }
}
