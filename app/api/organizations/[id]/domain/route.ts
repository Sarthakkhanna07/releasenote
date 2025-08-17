import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import crypto from 'crypto'

/**
 * Custom domain management API
 * PUT: Configure custom domain for organization
 * DELETE: Remove custom domain
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { domain } = await request.json()
    
    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      )
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if domain is already taken
    const { data: existingDomain } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('custom_domain', domain)
      .neq('id', params.id)
      .single()

    if (existingDomain) {
      return NextResponse.json(
        { error: 'Domain is already in use by another organization' },
        { status: 409 }
      )
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
      .select('id, name, custom_domain')
      .eq('id', params.id)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')

    // Start transaction: update organization and create verification record
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ 
        custom_domain: domain,
        domain_verified: false
      })
      .eq('id', params.id)

    if (updateError) {
      throw updateError
    }

    // Delete existing verification records for this org
    await supabase
      .from('domain_verifications')
      .delete()
      .eq('organization_id', params.id)

    // Create new verification record
    const { data: verification, error: verificationError } = await supabase
      .from('domain_verifications')
      .insert([{
        organization_id: params.id,
        domain,
        verification_token: verificationToken,
        verification_method: 'dns'
      }])
      .select()
      .single()

    if (verificationError) {
      throw verificationError
    }

    return NextResponse.json({
      success: true,
      domain,
      verification: {
        token: verificationToken,
        txtRecord: `releasenotes-verify=${verificationToken}`,
        instructions: [
          `Add a TXT record to your DNS settings:`,
          `Name: _releasenotes-verify.${domain}`,
          `Value: ${verificationToken}`,
          `TTL: 300 (or default)`
        ]
      }
    })

  } catch (error) {
    console.error('Domain configuration error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to configure domain',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Verify organization exists
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, custom_domain')
      .eq('id', params.id)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Remove custom domain
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ 
        custom_domain: null,
        domain_verified: false
      })
      .eq('id', params.id)

    if (updateError) {
      throw updateError
    }

    // Delete verification records
    await supabase
      .from('domain_verifications')
      .delete()
      .eq('organization_id', params.id)

    return NextResponse.json({
      success: true,
      message: 'Custom domain removed successfully'
    })

  } catch (error) {
    console.error('Domain removal error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to remove domain',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}