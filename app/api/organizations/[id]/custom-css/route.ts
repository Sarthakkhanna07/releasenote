import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { CSSValidator } from '@/lib/css-validator'

/**
 * Custom CSS Management API
 * GET: Retrieve custom CSS for organization
 * PUT: Update custom CSS with validation
 * DELETE: Remove custom CSS
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

    // Get organization custom CSS
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('custom_css, brand_color, custom_css_enabled')
      .eq('id', id)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Generate theme variables based on current branding
    const themeVariables = CSSValidator.generateThemeVariables({
      brandColor: organization.brand_color
    })

    return NextResponse.json({
      customCSS: organization.custom_css || '',
      themeVariables,
      enabled: organization.custom_css_enabled || false,
      brandColor: organization.brand_color
    })

  } catch (error) {
    console.error('Custom CSS fetch error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch custom CSS',
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
    const { id } = params
    const { customCSS, enabled = true } = await request.json()

    if (typeof customCSS !== 'string') {
      return NextResponse.json(
        { error: 'Custom CSS must be a string' },
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
      .eq('organization_id', id)
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
      .eq('id', id)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Validate CSS if provided
    let validationResult = { isValid: true, errors: [] as string[], warnings: [] as string[], sanitizedCSS: '' }
    
    if (customCSS.trim()) {
      validationResult = CSSValidator.validate(customCSS)
      
      if (!validationResult.isValid) {
        return NextResponse.json({
          error: 'CSS validation failed',
          validationErrors: validationResult.errors,
          warnings: validationResult.warnings
        }, { status: 400 })
      }
    }

    // Update organization with validated CSS
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        custom_css: validationResult.sanitizedCSS || customCSS,
        custom_css_enabled: enabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: 'Custom CSS updated successfully',
      validation: {
        isValid: validationResult.isValid,
        warnings: validationResult.warnings,
        sanitized: !!validationResult.sanitizedCSS
      },
      customCSS: validationResult.sanitizedCSS || customCSS,
      enabled
    })

  } catch (error) {
    console.error('Custom CSS update error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to update custom CSS',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
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
      .eq('organization_id', id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 404 }
      )
    }

    // Remove custom CSS
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        custom_css: null,
        custom_css_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: 'Custom CSS removed successfully'
    })

  } catch (error) {
    console.error('Custom CSS removal error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to remove custom CSS',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}