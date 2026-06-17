import { redirect } from 'next/navigation'

import { MissingProfileDashboard } from '@/components/dashboard/dashboard-shell'
import { StoreManagementClient } from '@/components/store-management/store-management-client'
import type {
  AreaOption,
  StoreManagementProfile,
  StoreManagementRow,
  StoreManagerOption,
} from '@/components/store-management/types'
import { isUserRole, type ProfileRow } from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/server'

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
  store_manager_id: string | null
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

type StoreManagerRow = {
  id: string
  full_name: string
  email: string
  store_id: string | null
}

function toAreaOptions(rows: AreaRow[] | null): AreaOption[] {
  return (rows ?? []).map((area) => ({
    id: area.id,
    name: area.name,
  }))
}

function toStoreRows(
  rows: StoreRow[] | null,
  areaNames: Map<string, string>,
  managerNames: Map<string, StoreManagerRow>
): StoreManagementRow[] {
  return (rows ?? []).map((store) => {
    const manager = store.store_manager_id
      ? managerNames.get(store.store_manager_id)
      : null

    return {
      id: store.id,
      name: store.name,
      code: store.code,
      areaId: store.area_id,
      areaName: areaNames.get(store.area_id) ?? 'Unavailable',
      isActive: store.is_active,
      storeManagerId: store.store_manager_id,
      storeManagerName: manager?.full_name ?? null,
      storeManagerEmail: manager?.email ?? null,
      addressLine1: store.address_line_1,
      addressLine2: store.address_line_2,
      city: store.city,
      countyOrState: store.county_or_state,
      postcode: store.postcode,
      country: store.country,
      phone: store.phone,
      email: store.email,
      openingHours: store.opening_hours,
      locationType: store.location_type,
      terminal: store.terminal,
      airsideLandside: store.airside_landside,
      locationNotes: store.location_notes,
    }
  })
}

function toStoreManagerOptions(
  rows: StoreManagerRow[] | null
): StoreManagerOption[] {
  return (rows ?? [])
    .filter((manager): manager is StoreManagerRow & { store_id: string } =>
      Boolean(manager.store_id)
    )
    .map((manager) => ({
      id: manager.id,
      fullName: manager.full_name,
      email: manager.email,
      storeId: manager.store_id,
    }))
}

export default async function StoreManagementPage() {
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

  if (profile.role !== 'admin' && profile.role !== 'area_manager') {
    redirect('/dashboard')
  }

  let areas: AreaOption[] = []

  if (profile.role === 'admin') {
    const { data } = await supabase
      .from('areas')
      .select('id, name')
      .order('name', { ascending: true })
      .returns<AreaRow[]>()

    areas = toAreaOptions(data)
  } else if (profile.area_id) {
    const { data } = await supabase
      .from('areas')
      .select('id, name')
      .eq('id', profile.area_id)
      .returns<AreaRow[]>()

    areas = toAreaOptions(data)
  }

  let storeData: StoreRow[] | null = null

  if (profile.role === 'admin') {
    const { data } = await supabase
      .from('stores')
      .select(
        'id, name, code, area_id, is_active, store_manager_id, address_line_1, address_line_2, city, county_or_state, postcode, country, phone, email, opening_hours, location_type, terminal, airside_landside, location_notes'
      )
      .order('name', { ascending: true })
      .returns<StoreRow[]>()

    storeData = data
  } else if (profile.area_id) {
    const { data } = await supabase
      .from('stores')
      .select(
        'id, name, code, area_id, is_active, store_manager_id, address_line_1, address_line_2, city, county_or_state, postcode, country, phone, email, opening_hours, location_type, terminal, airside_landside, location_notes'
      )
      .eq('area_id', profile.area_id)
      .order('name', { ascending: true })
      .returns<StoreRow[]>()

    storeData = data
  }

  const areaNames = new Map(areas.map((area) => [area.id, area.name]))
  const storeIds = (storeData ?? []).map((store) => store.id)
  let storeManagerData: StoreManagerRow[] | null = null

  if (storeIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, store_id')
      .eq('role', 'store_manager')
      .in('store_id', storeIds)
      .order('full_name', { ascending: true })
      .returns<StoreManagerRow[]>()

    storeManagerData = data
  }

  const managerNames = new Map(
    (storeManagerData ?? []).map((manager) => [manager.id, manager])
  )
  const stores = toStoreRows(storeData, areaNames, managerNames)
  const storeManagers = toStoreManagerOptions(storeManagerData)
  const managementProfile: StoreManagementProfile = {
    role: profile.role,
    areaId: profile.area_id,
  }

  return (
    <StoreManagementClient
      profile={managementProfile}
      areas={areas}
      stores={stores}
      storeManagers={storeManagers}
    />
  )
}
