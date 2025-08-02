import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  
  // GitHub OAuth parameters for integration (not user auth)
  const clientId = process.env.GITHUB_CLIENT_ID
  const redirectUri = `${requestUrl.origin}/api/auth/github/callback`
  const scopes = 'repo,user:email,read:user,read:org' // Scopes for repository access
  
  if (!clientId) {
    return NextResponse.redirect(`${requestUrl.origin}/dashboard/integrations?error=GitHub integration not configured`)
  }

  // Build GitHub OAuth URL for integration
  const githubOAuthUrl = new URL('https://github.com/login/oauth/authorize')
  githubOAuthUrl.searchParams.set('client_id', clientId)
  githubOAuthUrl.searchParams.set('redirect_uri', redirectUri)
  githubOAuthUrl.searchParams.set('scope', scopes)
  githubOAuthUrl.searchParams.set('state', 'integration') // Mark as integration flow

  return NextResponse.redirect(githubOAuthUrl.toString())
} 