import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// In-memory cache: Map<orgId, { data, expiresAt, lastUpdated }>
const repoCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function GET() {
  console.log('[API] /api/github/repositories - called');
  const supabase = createRouteHandlerClient({ cookies });

  // Get the current session
  const { data: { session } } = await supabase.auth.getSession();
  console.log('[API] Session:', session);
  if (!session) {
    console.log('[API] Not authenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const orgId = session.user.id;

  // Check cache
  const cached = repoCache.get(orgId);
  if (cached && cached.expiresAt > Date.now()) {
    console.log('[API] Returning cached repositories for org:', orgId);
    return NextResponse.json({ repositories: cached.data, lastUpdated: cached.lastUpdated });
  }

  // Get the GitHub integration for this user/org
  const { data: integration, error: integrationError } = await supabase
    .from('integrations')
    .select('encrypted_credentials')
    .eq('type', 'github')
    .eq('organization_id', orgId)
    .single();
  console.log('[API] Integration:', integration, 'Error:', integrationError);

  if (integrationError || !integration) {
    console.log('[API] GitHub integration not found');
    return NextResponse.json({ error: 'GitHub integration not found' }, { status: 404 });
  }

  const githubToken = integration.encrypted_credentials?.access_token;
  console.log('[API] GitHub Token:', githubToken ? 'Present' : 'Missing');

  // Fetch repositories from GitHub API
  const response = await fetch('https://api.github.com/user/repos', {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  console.log('[API] GitHub API response status:', response.status);

  if (!response.ok) {
    console.log('[API] Failed to fetch repositories from GitHub');
    return NextResponse.json({ error: 'Failed to fetch repositories' }, { status: 500 });
  }

  const repositories = await response.json();
  console.log('[API] Number of repositories fetched:', repositories.length);

  // Cache the result
  const lastUpdated = Date.now();
  repoCache.set(orgId, {
    data: repositories,
    expiresAt: lastUpdated + CACHE_TTL,
    lastUpdated,
  });
  console.log('[API] Cached repositories for org:', orgId);

  return NextResponse.json({
    repositories,
    lastUpdated
  });
} 