import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)
    
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      console.error('Linear OAuth error:', error)
      return NextResponse.redirect(new URL('/dashboard/integrations?error=oauth_denied', request.url))
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/dashboard/integrations?error=invalid_callback', request.url))
    }

    // Validate state
    const { data: stateRecord, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('provider', 'linear')
      .single()

    if (stateError || !stateRecord) {
      return NextResponse.redirect(new URL('/dashboard/integrations?error=invalid_state', request.url))
    }

    // Check if state is expired
    if (new Date(stateRecord.expires_at) < new Date()) {
      return NextResponse.redirect(new URL('/dashboard/integrations?error=expired_state', request.url))
    }

    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || session.user.id !== stateRecord.user_id) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.linear.app/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.LINEAR_CLIENT_ID!,
        client_secret: process.env.LINEAR_CLIENT_SECRET!,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linear/callback`
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Linear token exchange failed:', errorData)
      return NextResponse.redirect(new URL('/dashboard/integrations?error=token_exchange_failed', request.url))
    }

    const tokenData = await tokenResponse.json()

    // Get user info from Linear
    let linearUser = null
    try {
      const userResponse = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            query {
              viewer {
                id
                name
                email
                displayName
                avatarUrl
                organization {
                  id
                  name
                  urlKey
                  logoUrl
                }
              }
            }
          `
        })
      })

      if (userResponse.ok) {
        const userData = await userResponse.json()
        linearUser = userData.data?.viewer
      }
    } catch (error) {
      console.error('Failed to fetch Linear user info:', error)
    }

    // Save integration to database (be tolerant to schema differences)
    const nowIso = new Date().toISOString()
    const encrypted_credentials = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_in ? new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString() : null,
      scope: tokenData.scope,
      token_type: tokenData.token_type
    }

    const baseRecord: any = {
      organization_id: session.user.id,
      type: 'linear',
      external_id: linearUser?.organization?.id || linearUser?.id || 'unknown',
      encrypted_credentials,
      config: {
        status: 'connected',
        provider_user_id: linearUser?.id || null,
        provider_org: linearUser?.organization || null,
        scopes: tokenData.scope?.split(' ') || ['read']
      },
      created_at: nowIso,
      updated_at: nowIso
    }

    // Try upsert first (requires unique constraint on organization_id,type). If that fails, try insert/update fallback.
    let integrationError: any = null
    try {
      const { error } = await supabase
        .from('integrations')
        .upsert(baseRecord, { onConflict: 'organization_id,type,external_id' })
      integrationError = error
    } catch (e) {
      integrationError = e
    }

    if (integrationError) {
      console.warn('Linear upsert failed, attempting insert/update fallback:', integrationError)
      // Attempt raw insert
      const { error: insertError } = await supabase
        .from('integrations')
        .insert([baseRecord])
      if (insertError) {
        // If duplicate, try update existing row
        const { error: updateError } = await supabase
          .from('integrations')
          .update({
            encrypted_credentials: baseRecord.encrypted_credentials,
            config: baseRecord.config,
            updated_at: nowIso
          })
          .eq('organization_id', session.user.id)
          .eq('type', 'linear')
          .eq('external_id', baseRecord.external_id)
        if (updateError) {
          console.error('Failed to save Linear integration (update fallback):', updateError)
          return NextResponse.redirect(new URL(`/dashboard/integrations?error=save_failed&details=${encodeURIComponent(updateError.message || 'update_failed')}`, request.url))
        }
      }
    }

    // Clean up used state
    await supabase
      .from('oauth_states')
      .delete()
      .eq('state', state)

    return NextResponse.redirect(new URL('/dashboard/integrations?success=linear_connected', request.url))

  } catch (error) {
    console.error('Linear OAuth callback error:', error)
    return NextResponse.redirect(new URL('/dashboard/integrations?error=callback_failed', request.url))
  }
}