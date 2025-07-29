import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { GitHubService } from '@/lib/integrations/github'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const owner = searchParams.get('owner')
  const repo = searchParams.get('repo')
  if (!owner || !repo) {
    return NextResponse.json({ error: 'Missing owner or repo' }, { status: 400 })
  }

  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: integration } = await supabase
    .from('integrations')
    .select('encrypted_credentials')
    .eq('type', 'github')
    .eq('organization_id', session.user.id)
    .single()
  const accessToken = integration?.encrypted_credentials?.access_token
  if (!accessToken) {
    return NextResponse.json({ error: 'No GitHub access token' }, { status: 401 })
  }

  const github = new GitHubService(accessToken)
  try {
    const pullRequests = await github.getPullRequests(owner, repo, { state: 'closed', per_page: 10 })
    return NextResponse.json({ pullRequests })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch pull requests' }, { status: 500 })
  }
} 