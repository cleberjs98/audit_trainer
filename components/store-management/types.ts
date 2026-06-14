export type StoreManagementRole = 'admin' | 'area_manager'

export type AreaOption = {
  id: string
  name: string
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
}
