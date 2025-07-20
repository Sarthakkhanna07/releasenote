import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { GitHubService } from '@/lib/integrations/github'
import { getAiProvider } from '@/lib/ai'

/**
 * Generate release notes from GitHub repository data
 * Simplified endpoint that combines GitHub API + AI generation
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API] /api/github/generate-release-notes - called');
    const { repository, options } = await request.json();
    console.log('[API] Request body:', { repository, options });
    
    if (!repository || !repository.owner || !repository.repo) {
      console.warn('[API] Missing repository owner or name');
      return NextResponse.json(
        { error: 'Repository owner and name are required' },
        { status: 400 }
      );
    }

    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('[API] Session:', session, 'SessionError:', sessionError);

    if (sessionError || !session?.user) {
      console.warn('[API] Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get GitHub integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('encrypted_credentials')
      .eq('type', 'github')
      .eq('organization_id', session.user.id)
      .single();
    console.log('[API] Integration:', integration, 'IntegrationError:', integrationError);

    if (integrationError || !integration) {
      console.warn('[API] GitHub integration not found');
      return NextResponse.json(
        { error: 'GitHub integration not found. Please connect your GitHub account first.' },
        { status: 404 }
      );
    }

    const accessToken = integration.encrypted_credentials?.access_token;
    console.log('[API] AccessToken:', accessToken ? 'Present' : 'Missing');
    if (!accessToken) {
      console.warn('[API] GitHub access token not found');
      return NextResponse.json(
        { error: 'GitHub access token not found. Please reconnect your GitHub account.' },
        { status: 400 }
      );
    }

    // Initialize GitHub service
    const github = new GitHubService(accessToken);
    console.log('[API] GitHubService initialized');
    
    // Get recent commits (last 30 days by default)
    const since = options?.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    let commits = [];
    try {
      commits = await github.getCommits(repository.owner, repository.repo, {
        since,
        per_page: 50
      });
      console.log('[API] Commits fetched:', commits.length);
    } catch (err) {
      console.error('[API] Error fetching commits from GitHub:', err);
      return NextResponse.json(
        { error: 'Failed to fetch commits from GitHub', details: err instanceof Error ? err.message : err },
        { status: 502 }
      );
    }

    if (commits.length === 0) {
      console.warn('[API] No recent commits found in the repository');
      return NextResponse.json(
        { error: 'No recent commits found in the repository' },
        { status: 404 }
      );
    }

    // Get recent merged pull requests for additional context
    let pullRequests = [];
    try {
      pullRequests = await github.getPullRequests(repository.owner, repository.repo, {
        state: 'closed',
        sort: 'updated',
        per_page: 20
      });
      console.log('[API] Pull requests fetched:', pullRequests.length);
    } catch (err) {
      console.error('[API] Error fetching pull requests from GitHub:', err);
      // Not fatal, can continue with empty PRs
    }

    // Combine commit and PR data for AI generation
    const commitsForAI = commits.map(commit => ({
      message: commit.message,
      sha: commit.sha.substring(0, 7),
      author: commit.author.name,
      type: 'commit'
    }));

    const prsForAI = pullRequests
      .filter(pr => pr.state === 'closed' && pr.merged_at)
      .slice(0, 10)
      .map(pr => ({
        message: `${pr.title}: ${pr.body?.substring(0, 200) || ''}`,
        sha: pr.number.toString(),
        author: pr.user.login,
        type: 'pull_request'
      }));

    const allChanges = [...commitsForAI, ...prsForAI];
    console.log('[API] All changes for AI:', allChanges.length);

    // Generate release notes using AI
    let generatedContent = '';
    try {
      const aiProvider = getAiProvider();
      generatedContent = await aiProvider.generateReleaseNotes(allChanges, {
        template: options?.template || 'traditional',
        tone: options?.tone || 'professional',
        includeBreakingChanges: options?.includeBreakingChanges || true
      });
      console.log('[API] AI generated content length:', generatedContent.length);
    } catch (err) {
      console.error('[API] Error generating release notes with AI:', err);
      return NextResponse.json(
        { error: 'Failed to generate release notes with AI', details: err instanceof Error ? err.message : err },
        { status: 500 }
      );
    }

    // Save as draft release note
    let draftNote = null;
    try {
      const { data, error: saveError } = await supabase
        .from('release_notes')
        .insert([{
          title: options?.title || `Release Notes - ${new Date().toLocaleDateString()}`,
          content_html: generatedContent,
          status: 'draft',
          organization_id: session.user.id,
          author_id: session.user.id,
          source_ticket_ids: commits.slice(0, 10).map(c => c.sha),
          views: 0
        }])
        .select()
        .single();
      draftNote = data;
      if (saveError) {
        console.error('[API] Error saving draft release note:', saveError);
      } else {
        console.log('[API] Draft release note saved:', draftNote?.id);
      }
    } catch (err) {
      console.error('[API] Exception saving draft release note:', err);
      // Still return the generated content even if save fails
    }

    return NextResponse.json({
      success: true,
      content: generatedContent,
      repository: {
        owner: repository.owner,
        repo: repository.repo
      },
      stats: {
        commits: commits.length,
        pullRequests: prsForAI.length,
        timeRange: since
      },
      draftId: draftNote?.id,
      message: 'Release notes generated successfully and saved as draft'
    });

  } catch (error) {
    console.error('[API] Unhandled error in release notes generation:', error, error?.stack);
    if (error instanceof Error && error.message.includes('GitHub API error')) {
      return NextResponse.json(
        { error: 'Failed to fetch data from GitHub', details: error.message },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to generate release notes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}