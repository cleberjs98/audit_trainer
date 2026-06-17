export type StoreManagementRole = 'admin' | 'area_manager'

export type StoreMutationState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

export const initialStoreMutationState: StoreMutationState = {
  status: 'idle',
  message: '',
}

export type AreaOption = {
  id: string
  name: string
}

export type StoreManagerOption = {
  id: string
  fullName: string
  email: string
  storeId: string
}

export type StoreManagementProfile = {
  role: StoreManagementRole
  areaId: string | null
}

export type StoreManagementRow = {
  id: string
  name: string
  code: string
  areaId: string
  areaName: string
  isActive: boolean
  storeManagerId: string | null
  storeManagerName: string | null
  storeManagerEmail: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  countyOrState: string | null
  postcode: string | null
  country: string | null
  phone: string | null
  email: string | null
  openingHours: string | null
  locationType: string | null
  terminal: string | null
  airsideLandside: string | null
  locationNotes: string | null
}
