import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Organization meta tags management API
 * PUT: Update organization meta tags and branding
 * GET: Get organization meta tags
 */

interface MetaTagsData {
  meta_title?: string
  meta_description?: string
  meta_image_url?: string
  favicon_url?: string
  logo_url?: string
  brand_color?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, check if the user is a member of this organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', session.user.id)
      .eq('organization_id', params.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 404 }
      )
    }

    // Get organization meta data
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select(`
        id, 
        name, 
        meta_title, 
        meta_description, 
        meta_image_url, 
        favicon_url, 
        logo_url,
        brand_color,
        custom_domain,
        domain_verified
      `)
      .eq('id', params.id)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      meta: {
        title: organization.meta_title || organization.name,
        description: organization.meta_description || `Release notes and product updates from ${organization.name}`,
        image: organization.meta_image_url,
        favicon: organization.favicon_url,
        logo: organization.logo_url,
        brandColor: organization.brand_color || '#7F56D9'
      },
      domain: {
        custom: organization.custom_domain,
        verified: organization.domain_verified
      }
    })

  } catch (error) {
    console.error('Meta tags fetch error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch meta tags',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data: MetaTagsData = await request.json()
    
    // Validate data
    if (data.meta_title && data.meta_title.length > 60) {
      return NextResponse.json(
        { error: 'Meta title should be 60 characters or less for optimal SEO' },
        { status: 400 }
      )
    }

    if (data.meta_description && data.meta_description.length > 160) {
      return NextResponse.json(
        { error: 'Meta description should be 160 characters or less for optimal SEO' },
        { status: 400 }
      )
    }

    // Validate URLs if provided
    const urlFields = ['meta_image_url', 'favicon_url', 'logo_url']
    for (const field of urlFields) {
      const url = data[field as keyof MetaTagsData]
      if (url && typeof url === 'string') {
        try {
          new URL(url)
        } catch {
          return NextResponse.json(
            { error: `Invalid URL format for ${field.replace('_', ' ')}` },
            { status: 400 }
          )
        }
      }
    }

    // Validate brand color (hex format)
    if (data.brand_color && !/^#([0-9A-F]{3}){1,2}$/i.test(data.brand_color)) {
      return NextResponse.json(
        { error: 'Brand color must be a valid hex color (e.g., #7F56D9)' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, check if the user is a member of this organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', session.user.id)
      .eq('organization_id', params.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 404 }
      )
    }

    // Verify organization exists
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', params.id)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Update organization meta tags
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        meta_title: data.meta_title || null,
        meta_description: data.meta_description || null,
        meta_image_url: data.meta_image_url || null,
        favicon_url: data.favicon_url || null,
        logo_url: data.logo_url || null,
        brand_color: data.brand_color || '#7F56D9'
      })
      .eq('id', params.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: 'Meta tags updated successfully',
      meta: {
        title: data.meta_title || organization.name,
        description: data.meta_description || `Release notes and product updates from ${organization.name}`,
        image: data.meta_image_url,
        favicon: data.favicon_url,
        logo: data.logo_url,
        brandColor: data.brand_color || '#7F56D9'
      }
    })

  } catch (error) {
    console.error('Meta tags update error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to update meta tags',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}