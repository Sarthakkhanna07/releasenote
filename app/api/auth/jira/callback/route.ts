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
      console.error('Jira OAuth error:', error)
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
      .eq('provider', 'jira')
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
    const tokenResponse = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.JIRA_CLIENT_ID,
        client_secret: process.env.JIRA_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/jira/callback`
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Jira token exchange failed:', errorData)
      return NextResponse.redirect(new URL('/dashboard/integrations?error=token_exchange_failed', request.url))
    }

    const tokenData = await tokenResponse.json()

    // Get accessible resources (Jira sites)
    const resourcesResponse = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    })

    let resources = []
    if (resourcesResponse.ok) {
      resources = await resourcesResponse.json()
    }

    // Get user info from Jira
    let jiraUser = null
    if (resources.length > 0) {
      const firstSite = resources[0]
      const userResponse = await fetch(`https://api.atlassian.com/ex/jira/${firstSite.id}/rest/api/3/myself`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json'
        }
      })

      if (userResponse.ok) {
        jiraUser = await userResponse.json()
      }
    }

    // Save integration to database
    const { error: integrationError } = await supabase
      .from('integrations')
      .upsert({
        organization_id: session.user.id,
        type: 'jira',
        provider_user_id: jiraUser?.accountId || tokenData.access_token.substring(0, 20),
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
        metadata: {
          resources,
          user: jiraUser,
          scopes: tokenData.scope?.split(' ') || [],
          token_type: tokenData.token_type
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'organization_id,type'
      })

    if (integrationError) {
      console.error('Failed to save Jira integration:', integrationError)
      return NextResponse.redirect(new URL('/dashboard/integrations?error=save_failed', request.url))
    }

    // Clean up used state
    await supabase
      .from('oauth_states')
      .delete()
      .eq('state', state)

    return NextResponse.redirect(new URL('/dashboard/integrations?success=jira_connected', request.url))

  } catch (error) {
    console.error('Jira OAuth callback error:', error)
    return NextResponse.redirect(new URL('/dashboard/integrations?error=callback_failed', request.url))
  }
}