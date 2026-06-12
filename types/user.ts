// User roles matching the 4-role system
export type UserRole = 'admin' | 'area_manager' | 'store_manager' | 'leader'

export interface UserProfile {
  id: string
  fullName: string
  email: string
  role: UserRole
  storeId: string | null
  areaId: string | null
  createdAt: string
  updatedAt: string
}
