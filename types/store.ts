export interface Area {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Store {
  id: string
  name: string
  code: string
  areaId: string
  areaName?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}
