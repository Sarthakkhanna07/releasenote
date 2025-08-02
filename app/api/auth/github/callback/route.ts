import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')
  const supabase = createRouteHandlerClient({ cookies })

  if (!code || state !== 'integration') {
    return NextResponse.redirect(
      `${requestUrl.origin}/dashboard/integrations?error=Invalid GitHub callback`
    )
  }

  try {
    // Exchange code for GitHub access token (direct GitHub API call, not Supabase auth)
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      return NextResponse.redirect(
        `${requestUrl.origin}/dashboard/integrations?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`
      )
    }

    const accessToken = tokenData.access_token

    // Get GitHub user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Release-Notes-Generator',
      },
    })

    const githubUser = await userResponse.json()

    // Get current user session (for user authentication, not GitHub auth)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=Please sign in first`
      )
    }

    // Store the GitHub integration in the integrations table using encrypted_credentials
    const { error: insertError } = await supabase.from('integrations').upsert({
      organization_id: session.user.user_metadata?.organization_id || session.user.id,
      type: 'github',
      external_id: githubUser.id?.toString() || githubUser.login,
      encrypted_credentials: {
        access_token: accessToken,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
        user_info: githubUser
      },
      config: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'organization_id,type,external_id' });

    if (insertError) {
      return NextResponse.redirect(
        `${requestUrl.origin}/dashboard/integrations?error=${encodeURIComponent(insertError.message)}`
      )
    }

    // Redirect back to integrations with success
    return NextResponse.redirect(`${requestUrl.origin}/dashboard/integrations/manage?success=GitHub integration added`)

  } catch (error) {
    return NextResponse.redirect(
      `${requestUrl.origin}/dashboard/integrations?error=${encodeURIComponent('Failed to connect GitHub')}`
    )
  }
} 