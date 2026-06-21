'use server'

import { createHash } from 'node:crypto'

import { revalidatePath } from 'next/cache'

import { isUserRole } from '@/lib/auth/profile'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/user'

type AcceptInvitationRpcRow = {
  invitation_id: string
  profile_id: string
  role: string
  area_id: string | null
  store_id: string | null
  status: string
}

type AcceptInviteResult =
  | {
      status: 'success'
      message: string
      role: string
      areaName: string | null
      storeName: string | null
      storeCode: string | null
    }
  | {
      status: 'error'
      message: string
    }

type StoreContextRow = {
  name: string
  code: string
}

type AreaContextRow = {
  name: string
}

type InvitationRow = {
  id: string
  email: string
  normalized_email: string
  role: string
  area_id: string | null
  store_id: string | null
  status: string
  accepted_at: string | null
  expires_at: string
}

export type InvitePreviewResult =
  | {
      status: 'valid'
      invitation: {
        id: string
        email: string
        normalizedEmail: string
        role: UserRole
        areaName: string | null
        storeName: string | null
        storeCode: string | null
        expiresAt: string
      }
    }
  | {
      status: 'invalid' | 'expired' | 'accepted' | 'error'
      message: string
    }

export type CreateInviteAccountState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

function firstRpcRow(data: unknown): AcceptInvitationRpcRow | null {
  if (!Array.isArray(data) || data.length === 0) {
    return null
  }

  const row = data[0] as Partial<AcceptInvitationRpcRow>

  if (
    typeof row.invitation_id !== 'string' ||
    typeof row.profile_id !== 'string' ||
    typeof row.role !== 'string' ||
    typeof row.status !== 'string'
  ) {
    return null
  }

  return {
    invitation_id: row.invitation_id,
    profile_id: row.profile_id,
    role: row.role,
    area_id: typeof row.area_id === 'string' ? row.area_id : null,
    store_id: typeof row.store_id === 'string' ? row.store_id : null,
    status: row.status,
  }
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function hashToken(rawToken: string) {
  return createHash('sha256').update(rawToken.trim()).digest('hex')
}

function isDuplicateAuthUserError(message: string | undefined) {
  const normalized = (message ?? '').toLowerCase()

  return (
    normalized.includes('already registered') ||
    normalized.includes('already exists') ||
    normalized.includes('already been registered') ||
    normalized.includes('duplicate')
  )
}

async function rollbackCreatedAuthUser(userId: string) {
  try {
    const admin = createAdminClient()
    await admin.auth.admin.deleteUser(userId)
  } catch {
    // Best-effort cleanup only. Return controlled user-facing errors below.
  }
}

function inviteErrorMessage(message: string | undefined) {
  const safeMessage = message ?? ''
  const normalized = safeMessage.toLowerCase()

  if (normalized.includes('expired')) {
    return 'This invitation has expired. Ask your manager to send a new invite.'
  }

  if (normalized.includes('no longer pending')) {
    return 'This invitation has already been used or is no longer active.'
  }

  if (normalized.includes('email does not match')) {
    return 'This invitation was sent to a different email address. Sign in with the invited email account.'
  }

  if (normalized.includes('not found')) {
    return 'This invitation link is invalid or has already been removed.'
  }

  if (normalized.includes('authentication required')) {
    return 'Sign in with the invited email account before accepting this invitation.'
  }

  return 'We could not accept this invitation. Ask your manager to check the invite and try again.'
}

async function loadScopeContext(
  areaId: string | null,
  storeId: string | null
) {
  const admin = createAdminClient()
  let areaName: string | null = null
  let storeName: string | null = null
  let storeCode: string | null = null

  if (areaId) {
    const { data: area } = await admin
      .from('areas')
      .select('name')
      .eq('id', areaId)
      .maybeSingle<AreaContextRow>()

    areaName = area?.name ?? null
  }

  if (storeId) {
    const { data: store } = await admin
      .from('stores')
      .select('name, code')
      .eq('id', storeId)
      .maybeSingle<StoreContextRow>()

    storeName = store?.name ?? null
    storeCode = store?.code ?? null
  }

  return { areaName, storeName, storeCode }
}

async function loadPendingInviteByToken(rawToken: string) {
  const token = rawToken.trim()

  if (!token) {
    return {
      invitation: null,
      error: 'Invitation token is missing.',
    }
  }

  const admin = createAdminClient()
  const { data: invitation, error } = await admin
    .from('user_invitations')
    .select(
      'id, email, normalized_email, role, area_id, store_id, status, accepted_at, expires_at'
    )
    .eq('token_hash', hashToken(token))
    .maybeSingle<InvitationRow>()

  if (error) {
    return {
      invitation: null,
      error: 'We could not verify this invitation. Ask your manager to send a new invite.',
    }
  }

  if (!invitation) {
    return {
      invitation: null,
      error: 'This invitation link is invalid or has already been removed.',
    }
  }

  if (invitation.status === 'accepted') {
    return {
      invitation: null,
      error: 'This invitation has already been used.',
    }
  }

  if (invitation.status !== 'pending') {
    return {
      invitation: null,
      error: 'This invitation is no longer active. Ask your manager to send a new invite.',
    }
  }

  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    await admin
      .from('user_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id)
      .eq('status', 'pending')

    return {
      invitation: null,
      error: 'This invitation has expired. Ask your manager to send a new invite.',
    }
  }

  if (!isUserRole(invitation.role)) {
    return {
      invitation: null,
      error: 'This invitation has an unsupported role. Ask your manager to send a new invite.',
    }
  }

  return { invitation, error: null }
}

export async function getInvitePreview(
  rawToken: string
): Promise<InvitePreviewResult> {
  try {
    const { invitation, error } = await loadPendingInviteByToken(rawToken)

    if (error || !invitation) {
      if (error?.includes('already been used')) {
        return { status: 'accepted', message: error }
      }

      if (error?.includes('expired')) {
        return { status: 'expired', message: error }
      }

      return {
        status: 'invalid',
        message: error ?? 'This invitation link is invalid.',
      }
    }

    const { areaName, storeName, storeCode } = await loadScopeContext(
      invitation.area_id,
      invitation.store_id
    )

    return {
      status: 'valid',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        normalizedEmail: invitation.normalized_email,
        role: invitation.role as UserRole,
        areaName,
        storeName,
        storeCode,
        expiresAt: invitation.expires_at,
      },
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        'Invite preview failed:',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }

    return {
      status: 'error',
      message: 'We could not verify this invitation. Ask your manager to send a new invite.',
    }
  }
}

export async function acceptInviteAction(
  rawToken: string
): Promise<AcceptInviteResult> {
  const token = rawToken.trim()

  if (!token) {
    return {
      status: 'error',
      message: 'Invitation token is missing.',
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      status: 'error',
      message: 'Sign in with the invited email account before accepting this invitation.',
    }
  }

  const { data, error } = await supabase.rpc('accept_invitation_v1', {
    raw_token: token,
  })

  if (error) {
    return {
      status: 'error',
      message: inviteErrorMessage(error.message),
    }
  }

  const invitation = firstRpcRow(data)

  if (!invitation || invitation.status !== 'accepted') {
    return {
      status: 'error',
      message: 'The invitation response was incomplete. Refresh and try again.',
    }
  }

  let areaName: string | null = null
  let storeName: string | null = null
  let storeCode: string | null = null

  if (invitation.area_id) {
    const { data: area } = await supabase
      .from('areas')
      .select('name')
      .eq('id', invitation.area_id)
      .maybeSingle<AreaContextRow>()

    areaName = area?.name ?? null
  }

  if (invitation.store_id) {
    const { data: store } = await supabase
      .from('stores')
      .select('name, code')
      .eq('id', invitation.store_id)
      .maybeSingle<StoreContextRow>()

    storeName = store?.name ?? null
    storeCode = store?.code ?? null
  }

  return {
    status: 'success',
    message: 'Invitation accepted.',
    role: invitation.role,
    areaName,
    storeName,
    storeCode,
  }
}

export async function createInviteAccountAction(
  _previousState: CreateInviteAccountState,
  formData: FormData
): Promise<CreateInviteAccountState> {
  const token = getText(formData, 'token')
  const fullName = getText(formData, 'full_name')
  const password = String(formData.get('password') ?? '')
  const confirmPassword = String(formData.get('confirm_password') ?? '')

  if (!token) {
    return {
      status: 'error',
      message: 'Invitation token is missing.',
    }
  }

  if (!fullName) {
    return {
      status: 'error',
      message: 'Enter your name to create your account.',
    }
  }

  if (password.length < 8) {
    return {
      status: 'error',
      message: 'Create a password with at least 8 characters.',
    }
  }

  if (password !== confirmPassword) {
    return {
      status: 'error',
      message: 'Passwords do not match.',
    }
  }

  try {
    const { invitation, error } = await loadPendingInviteByToken(token)

    if (error || !invitation) {
      return {
        status: 'error',
        message: error ?? 'This invitation link is invalid.',
      }
    }

    const supabase = await createClient()
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (currentUser) {
      const currentEmail = normalizeEmail(currentUser.email ?? '')

      if (currentEmail !== invitation.normalized_email) {
        return {
          status: 'error',
          message:
            'This invite is for a different email. Please sign out and open the link again.',
        }
      }

      const accepted = await acceptInviteAction(token)

      if (accepted.status === 'error') {
        return {
          status: 'error',
          message: accepted.message,
        }
      }

      return {
        status: 'success',
        message: 'Invitation accepted. Your Audit Trainer access is ready.',
      }
    }

    const admin = createAdminClient()
    const { data: createdUser, error: createError } =
      await admin.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          name: fullName,
        },
      })

    if (createError || !createdUser.user) {
      if (isDuplicateAuthUserError(createError?.message)) {
        return {
          status: 'error',
          message:
            'An account already exists for this email. Sign in with that account, then open this invite link again to accept it.',
        }
      }

      return {
        status: 'error',
        message:
          'We could not create your account. Ask your manager to check the invite and try again.',
      }
    }

    const profilePayload = {
      id: createdUser.user.id,
      full_name: fullName,
      email: invitation.normalized_email,
      role: invitation.role,
      area_id: invitation.area_id,
      store_id: invitation.store_id,
    }

    const { error: profileError } = await admin
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })

    if (profileError) {
      await rollbackCreatedAuthUser(createdUser.user.id)

      return {
        status: 'error',
        message:
          'Your account was created, but access could not be activated. Ask your manager to check the invite scope.',
      }
    }

    const { error: acceptError } = await admin
      .from('user_invitations')
      .update({
        status: 'accepted',
        accepted_by: createdUser.user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)
      .eq('status', 'pending')

    if (acceptError) {
      await rollbackCreatedAuthUser(createdUser.user.id)

      return {
        status: 'error',
        message:
          'Your account was created, but the invite could not be marked accepted. Ask your manager to review the pending invite.',
      }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: invitation.email,
      password,
    })

    revalidatePath('/team')
    revalidatePath('/dashboard')

    if (signInError) {
      return {
        status: 'success',
        message: 'Account created. Please sign in with your new password.',
      }
    }

    return {
      status: 'success',
      message: 'Account created. Your Audit Trainer access is ready.',
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        'Invite account creation failed:',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }

    return {
      status: 'error',
      message:
        'We could not create your account from this invite. Ask your manager to check the invite and try again.',
    }
  }
}
