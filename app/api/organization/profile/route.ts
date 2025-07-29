/**
 * Organization Profile API
 * 
 * Handles fetching and updating organization profile details
 * that are used by the professional AI prompt system
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createSuccessResponse, ApiErrors, withPerformanceTracking } from '@/lib/api-response'

// GET: Fetch organization profile
export async function GET(request: NextRequest) {
  return withPerformanceTracking(async () => {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.user) {
        return ApiErrors.unauthorized('Authentication required')
      }

      // Get user's organization through membership
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', session.user.id)
        .single()

      if (memberError || !memberData) {
        return ApiErrors.badRequest('Organization membership not found')
      }

      // Get complete organization profile using your actual schema
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          slug,
          description,
          meta_description,
          brand_color,
          plan,
          settings,
          created_at,
          updated_at
        `)
        .eq('id', memberData.organization_id)
        .single()

      if (orgError || !orgData) {
        return ApiErrors.badRequest('Organization not found')
      }

      // Ensure settings has proper structure
      const settings = orgData.settings || {}
      const organization = {
        ...orgData,
        settings: {
          industry: settings.industry || '',
          company_size: settings.company_size || '',
          product_type: settings.product_type || '',
          target_market: settings.target_market || '',
          company_description: settings.company_description || '',
          ...settings // Include any other settings
        }
      }

      return createSuccessResponse({
        organization
      })
    } catch (error) {
      console.error('Organization profile fetch error:', error)
      return ApiErrors.internalServer('Failed to fetch organization profile')
    }
  })
}

// PUT: Update organization profile
export async function PUT(request: NextRequest) {
  return withPerformanceTracking(async () => {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.user) {
        return ApiErrors.unauthorized('Authentication required')
      }

      const body = await request.json()
      const { description, meta_description, brand_color, settings } = body

      // Note: name and slug are read-only (set during onboarding)

      // Get user's organization through membership
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', session.user.id)
        .single()

      if (memberError || !memberData) {
        return ApiErrors.badRequest('Organization membership not found')
      }

      // Check if user has permission to update organization
      if (memberData.role !== 'owner' && memberData.role !== 'admin') {
        return ApiErrors.forbidden('Insufficient permissions to update organization profile')
      }

      // Validate settings structure
      const validatedSettings = {
        industry: settings?.industry || '',
        company_size: settings?.company_size || '',
        product_type: settings?.product_type || '',
        target_market: settings?.target_market || '',
        company_description: settings?.company_description || '',
        // Preserve any existing settings not handled by this form
        ...(typeof settings === 'object' ? settings : {})
      }

      // Update organization profile (excluding read-only fields: name, slug)
      const { data: updatedOrg, error: updateError } = await supabase
        .from('organizations')
        .update({
          description: description?.trim() || null,
          meta_description: meta_description?.trim() || null,
          brand_color: brand_color || '#7F56D9',
          settings: validatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberData.organization_id)
        .select(`
          id,
          name,
          slug,
          description,
          meta_description,
          brand_color,
          plan,
          settings,
          created_at,
          updated_at
        `)
        .single()

      if (updateError) {
        console.error('Organization update error:', updateError)
        return ApiErrors.internalServer('Failed to update organization profile')
      }

      // Log the update for audit purposes
      console.log(`Organization profile updated: ${updatedOrg.name} (${updatedOrg.id}) by user ${session.user.id}`)

      return createSuccessResponse({
        organization: updatedOrg,
        message: 'Organization profile updated successfully'
      })
    } catch (error) {
      console.error('Organization profile update error:', error)
      return ApiErrors.internalServer('Failed to update organization profile')
    }
  })
}