import 'server-only'

export type InvitationEmailResult =
  | { status: 'sent' }
  | { status: 'skipped'; reason: 'not_configured' }
  | { status: 'failed'; message: string }

type SendInvitationEmailInput = {
  to: string
  inviteUrl: string
  roleLabel: string
  scopeLabel: string
  expiresAt: string
}

type ResendErrorPayload = {
  name?: unknown
  message?: unknown
}

function getRequiredEnv(value: string | undefined) {
  const trimmed = value?.trim()

  return trimmed ? trimmed : null
}

function getEmailConfig() {
  const apiKey = getRequiredEnv(process.env.RESEND_API_KEY)
  const from = getRequiredEnv(process.env.INVITE_EMAIL_FROM)

  if (!apiKey || !from) {
    return null
  }

  return { apiKey, from }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatExpiry(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-IE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Dublin',
  }).format(date)
}

function buildTextEmail(input: SendInvitationEmailInput) {
  const expiresAt = formatExpiry(input.expiresAt)

  return [
    "You're invited to Audit Trainer",
    '',
    'The inviter has invited you to Audit Trainer.',
    `Role: ${input.roleLabel}`,
    `Scope: ${input.scopeLabel}`,
    '',
    `Accept invitation: ${input.inviteUrl}`,
    '',
    `This link is single-use and expires on ${expiresAt}.`,
    'If you do not expect this invitation, you can ignore this email.',
  ].join('\n')
}

function buildHtmlEmail(input: SendInvitationEmailInput) {
  const roleLabel = escapeHtml(input.roleLabel)
  const scopeLabel = escapeHtml(input.scopeLabel)
  const inviteUrl = escapeHtml(input.inviteUrl)
  const expiresAt = escapeHtml(formatExpiry(input.expiresAt))

  return `
    <div style="margin:0;padding:0;background:#F4F6F8;font-family:Arial,sans-serif;color:#171A1F;">
      <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
        <div style="background:#FFFFFF;border:1px solid #D9DEE7;border-radius:24px;padding:32px;box-shadow:0 12px 30px rgba(16,24,40,0.08);">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;background:#D11F3A;color:#FFFFFF;font-weight:800;font-size:15px;">AT</div>
          <h1 style="margin:24px 0 8px;font-size:28px;line-height:1.2;color:#171A1F;">You're invited to Audit Trainer</h1>
          <p style="margin:0 0 24px;color:#667085;font-size:15px;line-height:1.6;">The inviter has invited you to join Audit Trainer.</p>
          <div style="border:1px solid #D9DEE7;border-radius:16px;background:#F8FAFC;padding:16px;margin-bottom:24px;">
            <p style="margin:0 0 8px;color:#475467;font-size:14px;"><strong style="color:#171A1F;">Role:</strong> ${roleLabel}</p>
            <p style="margin:0;color:#475467;font-size:14px;"><strong style="color:#171A1F;">Scope:</strong> ${scopeLabel}</p>
          </div>
          <a href="${inviteUrl}" style="display:inline-block;background:#D11F3A;color:#FFFFFF;text-decoration:none;border-radius:12px;padding:14px 22px;font-weight:700;font-size:15px;">Accept invitation</a>
          <p style="margin:24px 0 0;color:#667085;font-size:13px;line-height:1.6;">This link is single-use and expires on ${expiresAt}. If you do not expect this invitation, you can ignore this email.</p>
          <p style="margin:16px 0 0;color:#667085;font-size:12px;line-height:1.6;">If the button does not work, paste this link into your browser:<br><span style="word-break:break-all;color:#344054;">${inviteUrl}</span></p>
        </div>
      </div>
    </div>
  `
}

function getProviderErrorName(payload: unknown) {
  if (payload && typeof payload === 'object' && 'name' in payload) {
    const name = (payload as ResendErrorPayload).name

    if (typeof name === 'string') {
      return name
    }
  }

  return null
}

export async function sendInvitationEmail(
  input: SendInvitationEmailInput
): Promise<InvitationEmailResult> {
  const config = getEmailConfig()

  if (!config) {
    return { status: 'skipped', reason: 'not_configured' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.from,
        to: input.to,
        subject: "You're invited to Audit Trainer",
        html: buildHtmlEmail(input),
        text: buildTextEmail(input),
      }),
    })

    if (response.ok) {
      return { status: 'sent' }
    }

    let providerErrorName: string | null = null

    try {
      providerErrorName = getProviderErrorName(await response.json())
    } catch {
      providerErrorName = null
    }

    console.warn('[invite email] Resend request failed', {
      status: response.status,
      providerErrorName,
    })

    return {
      status: 'failed',
      message: 'Email provider could not send the invitation.',
    }
  } catch {
    console.warn('[invite email] Resend request failed', {
      status: 'network_error',
    })

    return {
      status: 'failed',
      message: 'Email provider could not send the invitation.',
    }
  }
}
