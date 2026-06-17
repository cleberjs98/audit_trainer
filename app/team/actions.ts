'use server'

import { createHash, randomBytes } from 'node:crypto'

import { revalidatePath } from 'next/cache'

import type {
  InvitationRole,
  TeamActionState,
} from '@/components/team/types'
import {
  formatUserRole,
  isUserRole,
  type ProfileRow,
} from '@/lib/auth/profile'
import { sendInvitationEmail } from '@/lib/email/invitations'
import { createClient } from '@/lib/supabase/server'

const INVITATION_ROLES = [
  'admin',
  'area_manager',
  'store_manager',
  'leader',
] as const satisfies readonly InvitationRole[]

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type StoreScopeRow = {
  id: string
  area_id: string
}

type AreaLabelRow = {
  id: string
  name: string
}

type StoreLabelRow = {
  id: string
  name: string
  code: string
}

type InvitationInsert = {
  email: string
  normalized_email: string
  role: InvitationRole
  area_id: string | null
  store_id: string | null
  token_hash: string
  invited_by: string
  expires_at: string
}

function errorState(message: string): TeamActionState {
  return { status: 'error', message }
}

function successState(
  message: string,
  manualInviteLink?: string,
  emailDelivery?: TeamActionState['emailDelivery']
): TeamActionState {
  return { status: 'success', message, manualInviteLink, emailDelivery }
}

function warningState(
  message: string,
  manualInviteLink: string,
  emailDelivery: TeamActionState['emailDelivery']
): TeamActionState {
  return {
    status: 'warning',
    message,
    manualInviteLink,
    emailDelivery,
  }
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function isInvitationRole(value: string): value is InvitationRole {
  return INVITATION_ROLES.includes(value as InvitationRole)
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function hashToken(rawToken: string) {
  return createHash('sha256').update(rawToken).digest('hex')
}

function createRawToken() {
  return randomBytes(32).toString('base64url')
}

function createManualInviteLink(rawToken: string) {
  return `/accept-invite?token=${encodeURIComponent(rawToken)}`
}

function createAbsoluteInviteLink(rawToken: string) {
  const appBaseUrl = process.env.APP_BASE_URL?.trim()

  if (!appBaseUrl) {
    return null
  }

  try {
    const url = new URL('/accept-invite', appBaseUrl)
    url.searchParams.set('token', rawToken)

    return url.toString()
  } catch {
    return null
  }
}

function canOpenTeam(profile: ProfileRow) {
  return (
    profile.role === 'admin' ||
    profile.role === 'area_manager' ||
    profile.role === 'store_manager'
  )
}

async function getAuthenticatedProfile(
  supabase: SupabaseServerClient,
  signedOutMessage: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      profile: null,
      error: signedOutMessage,
    }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, store_id, area_id, created_at, updated_at')
    .eq('id', user.id)
    .single<ProfileRow>()

  if (error || !profile || !isUserRole(profile.role)) {
    return {
      profile: null,
      error: 'Your profile is not ready for team management.',
    }
  }

  if (!canOpenTeam(profile)) {
    return {
      profile: null,
      error: 'You do not have permission to manage team invitations.',
    }
  }

  return { profile, error: null }
}

async function loadStoreScope(
  supabase: SupabaseServerClient,
  storeId: string
) {
  const { data: store, error } = await supabase
    .from('stores')
    .select('id, area_id')
    .eq('id', storeId)
    .single<StoreScopeRow>()

  if (error || !store) {
    return null
  }

  return store
}

async function loadInvitationScopeLabel(
  supabase: SupabaseServerClient,
  role: InvitationRole,
  areaId: string | null,
  storeId: string | null
) {
  if (role === 'admin') {
    return 'All areas and stores'
  }

  if (areaId) {
    const { data: area } = await supabase
      .from('areas')
      .select('id, name')
      .eq('id', areaId)
      .maybeSingle<AreaLabelRow>()

    return area?.name ? `Area: ${area.name}` : 'Area scope'
  }

  if (storeId) {
    const { data: store } = await supabase
      .from('stores')
      .select('id, name, code')
      .eq('id', storeId)
      .maybeSingle<StoreLabelRow>()

    return store?.name
      ? `Store: ${store.name} (${store.code})`
      : 'Store scope'
  }

  return 'Scoped invitation'
}

async function resolveInviteScope(
  supabase: SupabaseServerClient,
  profile: ProfileRow,
  role: InvitationRole,
  requestedAreaId: string,
  requestedStoreId: string
) {
  if (profile.role === 'admin') {
    if (role === 'admin') {
      return { areaId: null, storeId: null, error: null }
    }

    if (role === 'area_manager') {
      if (!requestedAreaId) {
        return { areaId: null, storeId: null, error: 'Choose an area.' }
      }

      return { areaId: requestedAreaId, storeId: null, error: null }
    }

    if (!requestedStoreId) {
      return { areaId: null, storeId: null, error: 'Choose a store.' }
    }

    return { areaId: null, storeId: requestedStoreId, error: null }
  }

  if (profile.role === 'area_manager') {
    if (role !== 'store_manager' && role !== 'leader') {
      return {
        areaId: null,
        storeId: null,
        error: 'Area managers can invite only Store Managers and Leaders.',
      }
    }

    if (!requestedStoreId) {
      return { areaId: null, storeId: null, error: 'Choose a store.' }
    }

    const store = await loadStoreScope(supabase, requestedStoreId)

    if (!store || store.area_id !== profile.area_id) {
      return {
        areaId: null,
        storeId: null,
        error: 'Area managers can invite users only inside their assigned area.',
      }
    }

    return { areaId: null, storeId: store.id, error: null }
  }

  if (role !== 'leader') {
    return {
      areaId: null,
      storeId: null,
      error: 'Store managers can invite only Leaders.',
    }
  }

  if (!profile.store_id) {
    return {
      areaId: null,
      storeId: null,
      error: 'Your profile needs an assigned store before inviting leaders.',
    }
  }

  return { areaId: null, storeId: profile.store_id, error: null }
}

function inviteErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === '23505') {
    return 'A pending invitation already exists for this email address.'
  }

  if (error.code === '42501') {
    return 'You do not have permission to create this invitation.'
  }

  return error.message ?? 'Could not create the invitation.'
}

export async function createInvitationAction(
  _previousState: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const supabase = await createClient()
  const { profile, error: accessError } = await getAuthenticatedProfile(
    supabase,
    'You must be signed in to invite team members.'
  )

  if (accessError || !profile) {
    return errorState(accessError ?? 'You cannot invite team members.')
  }

  const email = normalizeEmail(getText(formData, 'email'))
  const requestedRole = getText(formData, 'role')
  const requestedAreaId = getText(formData, 'area_id')
  const requestedStoreId = getText(formData, 'store_id')

  if (!email || !isValidEmail(email)) {
    return errorState('Enter a valid email address.')
  }

  if (!isInvitationRole(requestedRole)) {
    return errorState('Choose a valid role.')
  }

  const scope = await resolveInviteScope(
    supabase,
    profile,
    requestedRole,
    requestedAreaId,
    requestedStoreId
  )

  if (scope.error) {
    return errorState(scope.error)
  }

  const rawToken = createRawToken()
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const payload: InvitationInsert = {
    email,
    normalized_email: email,
    role: requestedRole,
    area_id: scope.areaId,
    store_id: scope.storeId,
    token_hash: tokenHash,
    invited_by: profile.id,
    expires_at: expiresAt,
  }

  const { error } = await supabase.from('user_invitations').insert(payload)

  if (error) {
    return errorState(inviteErrorMessage(error))
  }

  revalidatePath('/team')

  const absoluteInviteLink = createAbsoluteInviteLink(rawToken)
  const manualInviteLink = absoluteInviteLink ?? createManualInviteLink(rawToken)
  const scopeLabel = await loadInvitationScopeLabel(
    supabase,
    requestedRole,
    scope.areaId,
    scope.storeId
  )
  const roleLabel = formatUserRole(requestedRole)

  if (!absoluteInviteLink) {
    return successState(
      'Invitation created. Email sending is not configured yet. Copy and share this development invite link manually.',
      manualInviteLink,
      'skipped'
    )
  }

  const emailResult = await sendInvitationEmail({
    to: email,
    inviteUrl: absoluteInviteLink,
    roleLabel,
    scopeLabel,
    expiresAt,
  })

  if (emailResult.status === 'sent') {
    return successState(
      `Invitation created and sent to ${email}.`,
      undefined,
      'sent'
    )
  }

  if (emailResult.status === 'skipped') {
    return successState(
      'Invitation created. Email sending is not configured yet. Copy and share this development invite link manually.',
      manualInviteLink,
      'skipped'
    )
  }

  return warningState(
    'Invitation created, but email could not be sent. Copy and share this development invite link manually.',
    manualInviteLink,
    'failed'
  )
}

export async function revokeInvitationAction(
  _previousState: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const invitationId = getText(formData, 'invitation_id')

  if (!invitationId) {
    return errorState('Invitation id is required.')
  }

  const supabase = await createClient()
  const { profile, error: accessError } = await getAuthenticatedProfile(
    supabase,
    'You must be signed in to revoke invitations.'
  )

  if (accessError || !profile) {
    return errorState(accessError ?? 'You cannot revoke this invitation.')
  }

  const { error } = await supabase.rpc('revoke_invitation_v1', {
    invitation_id: invitationId,
  })

  if (error) {
    return errorState(
      error.message ?? 'Could not revoke this invitation.'
    )
  }

  revalidatePath('/team')

  return successState('Invitation cancelled.')
}
