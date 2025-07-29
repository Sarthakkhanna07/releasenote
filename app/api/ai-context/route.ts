import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { AIContextService } from "@/lib/services/ai-context.service"
import { createSuccessResponse, ApiErrors, withPerformanceTracking } from "@/lib/api-response"

// GET: Fetch AI context for user's organization
export async function GET(request: NextRequest) {
  return withPerformanceTracking(async () => {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.user) {
        return ApiErrors.unauthorized('Authentication required')
      }

      // Use the new service to get complete context
      const { organization, aiContext } = await AIContextService.getCompleteContext(session.user.id)
      
      if (!organization) {
        return ApiErrors.badRequest('Organization not found. Please ensure you are a member of an organization.')
      }

      return createSuccessResponse({
        aiContext,
        organization: {
          name: organization.name,
          id: organization.id
        }
      })
    } catch (error) {
      console.error("AI context fetch error:", error)
      return ApiErrors.internalServer('Failed to fetch AI context')
    }
  })
}

// POST: Create or update AI context for organization
export async function POST(request: NextRequest) {
  return withPerformanceTracking(async () => {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.user) {
        return ApiErrors.unauthorized('Authentication required')
      }

      const body = await request.json()

      // Validate the AI context data
      const validation = AIContextService.validateAIContext(body)
      if (!validation.isValid) {
        return ApiErrors.badRequest(`Validation failed: ${validation.errors.join(', ')}`)
      }

      // Get organization data
      const organization = await AIContextService.getOrganizationData(session.user.id)
      if (!organization) {
        return ApiErrors.badRequest('Organization not found. Please ensure you are a member of an organization.')
      }

      // Upsert AI context using the service
      const updatedContext = await AIContextService.upsertAIContext(organization.id, body)
      
      if (!updatedContext) {
        return ApiErrors.internalServer('Failed to save AI context')
      }

      return createSuccessResponse({
        aiContext: updatedContext,
        organization: {
          name: organization.name,
          id: organization.id
        },
        message: 'AI context saved successfully'
      })
    } catch (error) {
      console.error("AI context upsert error:", error)
      return ApiErrors.internalServer('Failed to save AI context')
    }
  })
}
