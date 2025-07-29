import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { generateSlug } from '@/lib/utils'

/**
 * GET /api/release-notes/[id] - Get single release note
 * PUT /api/release-notes/[id] - Update release note
 * DELETE /api/release-notes/[id] - Delete release note
 */

export async function GET(
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

    const { data: releaseNote, error: noteError } = await supabase
      .from('release_notes')
      .select('*')
      .eq('id', releaseNoteId)
      .eq('organization_id', orgMember.organization_id)
      .single()

    if (noteError || !releaseNote) {
      return NextResponse.json({ error: 'Release note not found' }, { status: 404 })
    }

    return NextResponse.json(releaseNote)

  } catch (error) {
    console.error('Release note GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    const organizationId = orgMember.organization_id

    // Check if release note exists and belongs to user's organization
    const { data: existingNote, error: existingError } = await supabase
      .from('release_notes')
      .select('*')
      .eq('id', releaseNoteId)
      .eq('organization_id', organizationId)
      .single()

    if (existingError || !existingNote) {
      return NextResponse.json({ error: 'Release note not found' }, { status: 404 })
    }

    const body = await request.json()
    const updateData: any = {}

    const allowedFields = [
      'title', 'description', 'content_markdown', 'content_html',
      'version', 'is_public'
    ]

    // Only update provided fields
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    })

    // Update slug if title changed
    if (body.title && body.title !== existingNote.title) {
      const baseSlug = generateSlug(body.title)
      let slug = baseSlug
      let counter = 1

      while (true) {
        const { data: existing } = await supabase
          .from('release_notes')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('slug', slug)
          .neq('id', releaseNoteId)
          .single()

        if (!existing) break

        slug = `${baseSlug}-${counter}`
        counter++
      }
      updateData.slug = slug
    }

    const { data: updatedNote, error: updateError } = await supabase
      .from('release_notes')
      .update(updateData)
      .eq('id', releaseNoteId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating release note:', updateError)
      return NextResponse.json({ error: 'Failed to update release note' }, { status: 500 })
    }

    return NextResponse.json(updatedNote)

  } catch (error) {
    console.error('Release note PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
      .select('id')
      .eq('id', releaseNoteId)
      .eq('organization_id', orgMember.organization_id)
      .single()

    if (existingError || !existingNote) {
      return NextResponse.json({ error: 'Release note not found' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('release_notes')
      .delete()
      .eq('id', releaseNoteId)

    if (deleteError) {
      console.error('Error deleting release note:', deleteError)
      return NextResponse.json({ error: 'Failed to delete release note' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Release note deleted successfully' })

  } catch (error) {
    console.error('Release note DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}