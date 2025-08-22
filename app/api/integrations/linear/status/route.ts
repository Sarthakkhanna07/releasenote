import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Lightweight Linear integration status endpoint
 * Returns connected: true if a Linear integration row exists for the current user's org
 * Does not call Linear API (avoids rate limits) — DB check only.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({ connected: false, reason: 'unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('integrations')
      .select('id')
      .eq('organization_id', session.user.id)
      .eq('type', 'linear')
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ connected: false, reason: 'db_error', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ connected: !!data })
  } catch (e) {
    return NextResponse.json({ connected: false, reason: 'server_error', details: e instanceof Error ? e.message : 'Unknown' }, { status: 500 })
  }
}
