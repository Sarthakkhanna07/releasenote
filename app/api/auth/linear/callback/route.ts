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

    // Save integration to database
    const { error: integrationError } = await supabase
      .from('integrations')
      .upsert({
        organization_id: session.user.id,
        type: 'linear',
        provider_user_id: linearUser?.id || tokenData.access_token.substring(0, 20),
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_in 
          ? new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
          : null,
        metadata: {
          user: linearUser,
          organization: linearUser?.organization,
          scopes: tokenData.scope?.split(' ') || ['read'],
          token_type: tokenData.token_type
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'organization_id,type'
      })

    if (integrationError) {
      console.error('Failed to save Linear integration:', integrationError)
      return NextResponse.redirect(new URL('/dashboard/integrations?error=save_failed', request.url))
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