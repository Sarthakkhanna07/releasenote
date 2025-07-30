import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * POST /api/release-notes/[id]/publish - Publish release note
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const releaseNoteId = params.id
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', session.user.id)
      .single()

    if (!orgMember) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    // Check if release note exists and belongs to user's organization
    const { data: existingNote, error: existingError } = await supabase
      .from('release_notes')
      .select('*')
      .eq('id', releaseNoteId)
      .eq('organization_id', orgMember.organization_id)
      .single()

    if (existingError || !existingNote) {
      return NextResponse.json({ error: 'Release note not found' }, { status: 404 })
    }

    if (existingNote.status === 'published') {
      return NextResponse.json(
        { error: 'Release note is already published' },
        { status: 400 }
      )
    }

    // Get request body to check if should be public
    const body = await request.json().catch(() => ({}))
    const { is_public = false } = body

    // Update status, published date, and public flag
    const { data: updatedNote, error: updateError } = await supabase
      .from('release_notes')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        is_public: is_public
      })
      .eq('id', releaseNoteId)
      .select()
      .single()

    if (updateError) {
      console.error('Error publishing release note:', updateError)
      return NextResponse.json({ error: 'Failed to publish release note' }, { status: 500 })
    }

    return NextResponse.json({
      data: updatedNote,
      message: 'Release note published successfully'
    })

  } catch (error) {
    console.error('Release note publish error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}