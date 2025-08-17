import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createSuccessResponse, ApiErrors, withPerformanceTracking } from '@/lib/api-response'

/**
 * Consolidated Organization Settings API
 * Returns all organization settings data in a single request
 * Optimized for performance with parallel queries
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withPerformanceTracking(async () => {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      const { id } = params

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        return ApiErrors.unauthorized('Authentication required')
      }

      // Verify membership first
      const { data: membership, error: membershipError } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', session.user.id)
        .eq('organization_id', id)
        .single()

      if (membershipError || !membership) {
        return ApiErrors.badRequest('Organization not found or access denied')
      }

      // Execute all queries in parallel for maximum performance
      const [orgResult, themesResult] = await Promise.all([
        // Get complete organization data in one query
        supabase
          .from('organizations')
          .select(`
            id,
            name,
            slug,
            description,
            meta_description,
            brand_color,
            logo_url,
            favicon_url,
            custom_css,
            custom_css_enabled,
            custom_domain,
            domain_verified,
            plan,
            settings,
            created_at,
            updated_at
          `)
          .eq('id', id)
          .single(),
        
        // Get themes data
        supabase
          .from('css_themes')
          .select('id, name, description, category, css_variables, custom_css, preview_image_url, is_public, created_at, updated_at')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
      ])

      if (orgResult.error) {
        console.error('Organization fetch error:', orgResult.error)
        return ApiErrors.badRequest('Organization not found')
      }

      if (themesResult.error) {
        console.error('Themes fetch error:', themesResult.error)
        // Don't fail the entire request for themes
      }

      const organization = orgResult.data
      const themes = themesResult.data || []

      // Structure the response for optimal frontend consumption
      const response = {
        profile: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          description: organization.description,
          meta_description: organization.meta_description,
          brand_color: organization.brand_color || '#7F56D9',
          plan: organization.plan,
          settings: organization.settings || {},
          created_at: organization.created_at,
          updated_at: organization.updated_at
        },
        assets: {
          logo_url: organization.logo_url,
          favicon_url: organization.favicon_url
        },
        customCSS: {
          css: organization.custom_css || '',
          enabled: organization.custom_css_enabled || false
        },
        domain: {
          custom_domain: organization.custom_domain,
          domain_verified: organization.domain_verified || false
        },
        themes: themes,
        meta: {
          loadTime: Date.now(),
          version: '1.0'
        }
      }

      return createSuccessResponse(response)

    } catch (error) {
      console.error('Settings bundle fetch error:', error)
      return ApiErrors.internalServer('Failed to fetch organization settings')
    }
  })
}