import type { UserRole } from '@/types/user'

export type ProfileRow = {
  id: string
  full_name: string
  email: string
  role: UserRole
  store_id: string | null
  area_id: string | null
  created_at: string
  updated_at: string
}

export const USER_ROLES = [
  'admin',
  'area_manager',
  'store_manager',
  'leader',
] as const satisfies readonly UserRole[]

export function isUserRole(value: string | null | undefined): value is UserRole {
  return USER_ROLES.includes(value as UserRole)
}

export function formatUserRole(role: UserRole) {
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
