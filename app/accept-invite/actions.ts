import { createClient } from '@/lib/supabase/server'

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
