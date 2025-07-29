/**
 * Professional AI Generation API
 * 
 * This endpoint uses the professional prompt engineering system to generate
 * context-aware content based on organization details and user preferences.
 * 
 * The user only provides their content request - all underlying prompt logic is hidden.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getAiProvider } from '@/lib/ai'
import { AIContextService } from '@/lib/services/ai-context.service'
import { createSuccessResponse, ApiErrors, withPerformanceTracking } from '@/lib/api-response'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

const window = new JSDOM('').window
const purify = DOMPurify(window)

export async function POST(request: NextRequest) {
  return withPerformanceTracking(async () => {
    try {
      // Authenticate user
      const supabase = createRouteHandlerClient({ cookies })
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.user) {
        return ApiErrors.unauthorized('Authentication required')
      }

      // Parse request body
      const body = await request.json()
      const { 
        userPrompt, 
        contentType = 'release_notes',
        sourceData,
        additionalContext,
        options = {}
      } = body

      if (!userPrompt) {
        return ApiErrors.badRequest('User prompt is required')
      }

      // Get organization and AI context data
      const { organization, aiContext } = await AIContextService.getCompleteContext(session.user.id)
      
      if (!organization) {
        return ApiErrors.badRequest('Organization not found. Please ensure you are a member of an organization.')
      }

      if (!aiContext) {
        return ApiErrors.badRequest('AI context not configured. Please configure your AI settings first.')
      }

      // Get AI provider (Gemini)
      const aiProvider = getAiProvider()
      
      // Check if provider supports context-aware generation
      if (typeof aiProvider.generateWithContext !== 'function') {
        return ApiErrors.internalServer('AI provider does not support context-aware generation')
      }

      // Build enhanced user prompt with source data if provided
      let enhancedUserPrompt = userPrompt

      if (sourceData) {
        if (sourceData.commits && Array.isArray(sourceData.commits)) {
          const commitsText = sourceData.commits
            .map((commit: any) => `- ${commit.message} (${commit.sha?.substring(0, 7) || 'unknown'})`)
            .join('\n')
          
          enhancedUserPrompt = `Create release notes for the following changes:

${commitsText}

${additionalContext ? `Additional context:\n${additionalContext}\n\n` : ''}Focus on the value and impact of these changes for users.`
        }
        
        if (sourceData.issues && Array.isArray(sourceData.issues)) {
          const issuesText = sourceData.issues
            .map((issue: any) => `- ${issue.title}: ${issue.description || 'No description'}`)
            .join('\n')
          
          enhancedUserPrompt = `Create release notes for the following resolved issues:

${issuesText}

${additionalContext ? `Additional context:\n${additionalContext}\n\n` : ''}Focus on the problems solved and improvements users will experience.`
        }
      }

      // Generate content using professional context-aware system
      const rawContent = await aiProvider.generateWithContext(
        enhancedUserPrompt,
        organization,
        aiContext,
        {
          contentType: contentType as 'release_notes' | 'feature_announcement' | 'bug_fix' | 'security_update',
          maxTokens: options.maxTokens || 3000,
          temperature: options.temperature || 0.3
        }
      )

      // Sanitize the generated content
      const sanitizedContent = purify.sanitize(rawContent, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'div', 'span',
          'ul', 'ol', 'li',
          'strong', 'b', 'em', 'i', 'u',
          'blockquote', 'code', 'pre',
          'a', 'img'
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class']
      })

      // Store generation metadata for tracking and regeneration
      const generationMetadata = {
        organizationId: organization.id,
        contentType,
        aiContextUsed: {
          tone: aiContext.tone,
          audience: aiContext.audience,
          outputFormat: aiContext.output_format
        },
        sourceDataType: sourceData ? Object.keys(sourceData)[0] : 'manual',
        generatedAt: new Date().toISOString(),
        model: 'gemini-2.0-flash'
      }

      return createSuccessResponse({
        content: sanitizedContent,
        metadata: generationMetadata,
        organization: {
          name: organization.name,
          id: organization.id
        },
        contextUsed: {
          tone: aiContext.tone,
          audience: aiContext.audience,
          format: aiContext.output_format
        }
      })

    } catch (error) {
      console.error('Professional AI generation error:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('AI generation failed')) {
          return ApiErrors.externalService('AI Provider', error.message)
        }
        
        if (error.message.includes('Organization not found')) {
          return ApiErrors.badRequest(error.message)
        }
      }
      
      return ApiErrors.internalServer('Failed to generate content')
    }
  })
}

/**
 * PATCH endpoint for improving existing content using professional context
 */
export async function PATCH(request: NextRequest) {
  return withPerformanceTracking(async () => {
    try {
      // Authenticate user
      const supabase = createRouteHandlerClient({ cookies })
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.user) {
        return ApiErrors.unauthorized('Authentication required')
      }

      // Parse request body
      const { content, instructions, options = {} } = await request.json()

      if (!content) {
        return ApiErrors.badRequest('Content is required')
      }

      // Get organization and AI context data
      const { organization, aiContext } = await AIContextService.getCompleteContext(session.user.id)
      
      if (!organization || !aiContext) {
        return ApiErrors.badRequest('Organization or AI context not found')
      }

      // Build improvement prompt using organization context
      const improvementPrompt = `Improve the following content while maintaining its core meaning and structure:

${content}

${instructions ? `Specific instructions: ${instructions}` : ''}

Make it more professional, clear, and engaging while staying true to ${organization.name}'s voice and serving the ${aiContext.audience} audience.`

      // Get AI provider and improve content
      const aiProvider = getAiProvider()
      
      const improvedContent = await aiProvider.generateWithContext(
        improvementPrompt,
        organization,
        aiContext,
        {
          contentType: 'release_notes',
          maxTokens: options.maxTokens || 2500,
          temperature: options.temperature || 0.4
        }
      )

      // Sanitize the improved content
      const sanitizedContent = purify.sanitize(improvedContent, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'div', 'span',
          'ul', 'ol', 'li',
          'strong', 'b', 'em', 'i', 'u',
          'blockquote', 'code', 'pre',
          'a', 'img'
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class']
      })

      return createSuccessResponse({
        content: sanitizedContent,
        originalLength: content.length,
        improvedLength: sanitizedContent.length,
        organization: organization.name,
        contextUsed: {
          tone: aiContext.tone,
          audience: aiContext.audience
        }
      })

    } catch (error) {
      console.error('Content improvement error:', error)
      
      if (error instanceof Error && error.message.includes('AI generation failed')) {
        return ApiErrors.externalService('AI Provider', error.message)
      }
      
      return ApiErrors.internalServer('Failed to improve content')
    }
  })
}