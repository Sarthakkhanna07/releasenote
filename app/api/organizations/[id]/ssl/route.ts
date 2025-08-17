import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import crypto from 'crypto'

/**
 * SSL Certificate Management API
 * POST: Request SSL certificate for verified domain
 * GET: Get SSL certificate status
 * DELETE: Remove SSL certificate
 */

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

    // Verify organization exists
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, custom_domain, domain_verified')
      .eq('id', params.id)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    if (!organization.custom_domain || !organization.domain_verified) {
      return NextResponse.json({
        ssl: {
          enabled: false,
          status: 'no_domain',
          message: 'Domain must be configured and verified first'
        }
      })
    }

    // Get SSL certificate status
    const { data: certificate, error: certError } = await supabase
      .from('ssl_certificates')
      .select('*')
      .eq('organization_id', params.id)
      .eq('domain', organization.custom_domain)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (certError && certError.code !== 'PGRST116') { // Not found error
      throw certError
    }

    if (!certificate) {
      return NextResponse.json({
        ssl: {
          enabled: false,
          status: 'not_configured',
          domain: organization.custom_domain,
          message: 'SSL certificate not configured'
        }
      })
    }

    const expiresAt = new Date(certificate.expires_at)
    const now = new Date()
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    let status = 'active'
    if (expiresAt < now) {
      status = 'expired'
    } else if (daysUntilExpiry <= 30) {
      status = 'expiring_soon'
    }

    return NextResponse.json({
      ssl: {
        enabled: true,
        status,
        domain: certificate.domain,
        expiresAt: certificate.expires_at,
        daysUntilExpiry: Math.max(0, daysUntilExpiry),
        autoRenew: certificate.auto_renew,
        issuedAt: certificate.created_at
      }
    })

  } catch (error) {
    console.error('SSL status fetch error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch SSL status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { provider = 'letsencrypt', autoRenew = true } = await request.json()

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

    // Verify organization exists and domain is verified
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, custom_domain, domain_verified')
      .eq('id', params.id)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    if (!organization.domain_verified) {
      return NextResponse.json(
        { error: 'Domain must be verified before requesting SSL certificate' },
        { status: 400 }
      )
    }

    // Check if certificate already exists and is valid
    const { data: existingCert } = await supabase
      .from('ssl_certificates')
      .select('expires_at')
      .eq('organization_id', params.id)
      .eq('domain', organization.custom_domain)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (existingCert) {
      return NextResponse.json(
        { error: 'Valid SSL certificate already exists for this domain' },
        { status: 409 }
      )
    }

    // Create SSL challenge for ACME verification
    const challengeToken = crypto.randomBytes(32).toString('hex')
    const challengeResponse = crypto.randomBytes(32).toString('hex')

    // Store challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('ssl_challenges')
      .insert([{
        organization_id: params.id,
        domain: organization.custom_domain,
        challenge_type: 'dns-01',
        challenge_token: challengeToken,
        challenge_response: challengeResponse,
        status: 'pending',
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
      }])
      .select()
      .single()

    if (challengeError) {
      throw challengeError
    }

    // In a real implementation, this would integrate with ACME client
    // For demo purposes, we'll simulate the process
    const mockCertificate = generateMockCertificate(organization.custom_domain)

    // Store certificate (in production, this would be the actual certificate from Let's Encrypt)
    const { data: certificate, error: certError } = await supabase
      .from('ssl_certificates')
      .insert([{
        organization_id: params.id,
        domain: organization.custom_domain,
        certificate: mockCertificate.certificate,
        private_key: mockCertificate.privateKey,
        certificate_chain: mockCertificate.chain,
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        auto_renew: autoRenew
      }])
      .select()
      .single()

    if (certError) {
      throw certError
    }

    // Update challenge status
    await supabase
      .from('ssl_challenges')
      .update({ status: 'completed' })
      .eq('id', challenge.id)

    return NextResponse.json({
      success: true,
      message: 'SSL certificate provisioned successfully',
      ssl: {
        enabled: true,
        status: 'active',
        domain: organization.custom_domain,
        expiresAt: certificate.expires_at,
        autoRenew: certificate.auto_renew,
        provider
      },
      // DNS challenge instructions (for manual setup if needed)
      challenge: {
        type: 'dns-01',
        name: `_acme-challenge.${organization.custom_domain}`,
        value: challengeResponse,
        instructions: [
          'Add the following TXT record to your DNS settings:',
          `Name: _acme-challenge.${organization.custom_domain}`,
          `Value: ${challengeResponse}`,
          'TTL: 300 (or default)',
          'Note: This challenge has been automatically completed in this demo'
        ]
      }
    }, { status: 201 })

  } catch (error) {
    console.error('SSL certificate provisioning error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to provision SSL certificate',
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

    // Remove SSL certificates
    const { error: deleteError } = await supabase
      .from('ssl_certificates')
      .delete()
      .eq('organization_id', params.id)

    if (deleteError) {
      throw deleteError
    }

    // Remove challenges
    await supabase
      .from('ssl_challenges')
      .delete()
      .eq('organization_id', params.id)

    return NextResponse.json({
      success: true,
      message: 'SSL certificate removed successfully'
    })

  } catch (error) {
    console.error('SSL certificate removal error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to remove SSL certificate',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Mock certificate generation for demo purposes
function generateMockCertificate(domain: string) {
  const mockCert = `-----BEGIN CERTIFICATE-----
MOCK CERTIFICATE FOR ${domain}
This is a demonstration certificate.
In production, this would be a real Let's Encrypt certificate.
Valid for: ${domain}
Issued: ${new Date().toISOString()}
Expires: ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()}
-----END CERTIFICATE-----`

  const mockKey = `-----BEGIN PRIVATE KEY-----
MOCK PRIVATE KEY FOR ${domain}
This is a demonstration private key.
In production, this would be the actual private key.
-----END PRIVATE KEY-----`

  const mockChain = `-----BEGIN CERTIFICATE-----
MOCK INTERMEDIATE CERTIFICATE
This is a demonstration intermediate certificate.
-----END CERTIFICATE-----`

  return {
    certificate: mockCert,
    privateKey: mockKey,
    chain: mockChain
  }
}