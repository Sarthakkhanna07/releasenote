import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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

  // Get the GitHub integration for this user/org
  const { data: integration, error: integrationError } = await supabase
    .from('integrations')
    .select('config')
    .eq('type', 'github')
    .eq('organization_id', session.user.id)
    .single();
  console.log('[API] Integration:', integration, 'Error:', integrationError);

  if (integrationError || !integration) {
    console.log('[API] GitHub integration not found');
    return NextResponse.json({ error: 'GitHub integration not found' }, { status: 404 });
  }

  const githubToken = integration.config.access_token;
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

  return NextResponse.json({
    repositories: repositories.map((repo: any) => ({
      id: repo.id,
      full_name: repo.full_name,
      private: repo.private,
    })),
  });
} 