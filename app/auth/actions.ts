'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

const GENERIC_LOGIN_ERROR =
  'We could not sign you in. Check your details and try again.'

export type LoginFormState = {
  message: string
}

export async function signIn(
  _previousState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { message: 'Enter your email and password to sign in.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Supabase Auth sign-in error:', error.message)
      return { message: error.message }
    }

    return { message: GENERIC_LOGIN_ERROR }
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  redirect('/login')
}
