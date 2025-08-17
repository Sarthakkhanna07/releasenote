import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Organization API
 * GET: Get organization details including logo and favicon URLs
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { id } = params

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, check if the user is a member of this organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', session.user.id)
      .eq('organization_id', id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 404 }
      )
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        logo_url,
        favicon_url,
        brand_color,
        custom_domain,
        domain_verified
      `)
      .eq('id', id)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo_url: organization.logo_url,
      favicon_url: organization.favicon_url,
      brand_color: organization.brand_color,
      custom_domain: organization.custom_domain,
      domain_verified: organization.domain_verified
    })

  } catch (error) {
    console.error('Organization fetch error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch organization',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
