import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { AIContextService } from '@/lib/services/ai-context.service'
import { LinearReleaseService } from '@/lib/services/linear-release.service'
import { AIService } from '@/lib/services/ai.service'
import { buildPromptContext, ProfessionalPromptEngine } from '@/lib/ai/prompt-engine'

export const dynamic = 'force-dynamic'

/**
 * Generate release notes from Linear issues using AI
 * 
 * This endpoint:
 * 1. Fetches and filters Linear issues based on user criteria
 * 2. Categorizes issues into features/improvements/bugfixes/breaking changes
 * 3. Builds professional AI prompts using organization context and templates
 * 4. Generates release notes content
 * 5. Saves as a draft for further editing
 * 
 * Supports both string templates (as hints) and object templates (with strict requirements)
 * Respects organization AI context for tone, audience, and redaction preferences
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { teams, projects, dateRange, issueFilters, selectedIssues, template, instructions, version, releaseDate } = body || {}

    // Sanitize user-provided inputs to prevent prompt injection
    const sanitizedInstructions = typeof instructions === 'string' ? instructions.slice(0, 1000) : undefined
    const sanitizedVersion = typeof version === 'string' ? version.slice(0, 100) : undefined

    if (!Array.isArray(teams) || teams.length === 0) {
      return NextResponse.json({ error: 'At least one team is required' }, { status: 400 })
    }

    const { data: integration } = await supabase
      .from('integrations')
      .select('*')
      .eq('organization_id', session.user.id)
      .eq('type', 'linear')
      .single()

    if (!integration) {
      return NextResponse.json({ error: 'Linear integration not found' }, { status: 404 })
    }

    const accessToken = integration.encrypted_credentials?.access_token || integration.access_token
    if (!accessToken) {
      return NextResponse.json({ error: 'No Linear access token found' }, { status: 400 })
    }

    // Initialize the service before using it for validation
    const service = new LinearReleaseService(accessToken)

    // Validate input parameters using the service
    const validation = service.validateInput({ teams, projects, dateRange, issueFilters })
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'Invalid input parameters',
        details: validation.errors.join('; '),
        suggestions: [
          'Ensure at least one team is selected',
          'Check that date ranges are valid (start before end)',
          'Verify priority filters are within 0-5 range'
        ]
      }, { status: 400 })
    }
    let { issues: filteredIssues, totalIssues } = await service.aggregate({
      teams,
      projects,
      dateRange,
      issueFilters
    })

    // If user selected specific issues in the wizard, filter down to those identifiers
    if (Array.isArray(selectedIssues) && selectedIssues.length > 0) {
      filteredIssues = filteredIssues.filter((it: any) => selectedIssues.includes(it.identifier) || selectedIssues.includes(it.id))
      totalIssues = filteredIssues.length
    }

    // Validate that we have issues to work with
    if (filteredIssues.length === 0) {
      return NextResponse.json({ 
        error: 'No issues found matching the selected criteria',
        details: 'Please adjust your team selection, date range, or issue filters to include completed issues.',
        suggestions: [
          'Check that selected teams have completed issues in the specified date range',
          'Verify that issue filters (labels, priority, state) are not too restrictive',
          'Consider expanding the date range or removing some filters'
        ]
      }, { status: 400 })
    }

    const { organization, aiContext } = await AIContextService.getCompleteContext(session.user.id)

    // Log generation context for debugging (without sensitive data)
    console.log('[Linear Generation] Context:', {
      teams: teams.length,
      projects: projects?.length || 0,
      totalIssues: filteredIssues.length,
      hasTemplate: !!template,
      hasInstructions: !!sanitizedInstructions,
      hasVersion: !!sanitizedVersion,
      isTechnical: aiContext?.tone === 'technical' || aiContext?.audience === 'developers'
    })

    // Categorize issues into sections for structured prompt building
    // This groups issues by type (features, improvements, bugfixes, breaking changes)
    // based on labels and title patterns for better AI organization
    const sections = service.categorize(filteredIssues)

    // Determine if we should include identifiers based on AI context
    // Technical tone or developer audience gets full identifiers for traceability
    // Non-technical audiences get cleaner, user-focused content
    const isTechnical = (aiContext?.tone === 'technical' || aiContext?.audience === 'developers')

    // Build comprehensive prompts using the service's buildPrompt method
    // This creates structured prompts with organization context, version info, and instructions
    const { systemPrompt: baseSystemPrompt, userPrompt } = service.buildPrompt({
      sections,
      organization: organization ? {
        meta_description: organization.meta_description,
        settings: organization.settings
      } : undefined,
      aiContext: aiContext ? {
        system_prompt: aiContext.system_prompt,
        audience: aiContext.audience,
        tone: aiContext.tone,
        output_format: aiContext.output_format,
        example_output: aiContext.example_output,
        include_emojis: aiContext.include_emojis,
        include_metrics: aiContext.include_metrics,
        brevity_level: aiContext.brevity_level,
        language: aiContext.language
      } : undefined,
      version: sanitizedVersion,
      releaseDate,
      instructions: sanitizedInstructions,
      template: typeof template === 'string' ? template : undefined, // Pass string templates as hints
      dateRange,
      teams,
      projects,
      includeIdentifiers: isTechnical
    })

    // If template is an object, append GitHub-style template requirements to system prompt
    // This provides strict structural guidance while preserving the ProfessionalPromptEngine's tone/voice
    let systemPrompt = baseSystemPrompt
    if (template && typeof template === 'object' && template.name) {
      try {
        // Validate template structure before parsing
        const templateContent = template.content || '{"sections":[]}'
        let parsedContent: any
        try {
          parsedContent = JSON.parse(templateContent)
        } catch (parseError) {
          console.warn('Template content is not valid JSON, treating as string:', parseError)
          parsedContent = { sections: [] }
        }

        // Safely extract sections with fallbacks
        const sections = parsedContent.sections || []
        const sectionsText = sections.length > 0 
          ? sections.map((section: any) => 
              `- ${section.name || 'Unnamed'} (${section.type || 'text'}): ${section.prompt || 'No prompt specified'}`
            ).join('\n')
          : 'No specific sections defined'

        const templateBlock = `\n\nTEMPLATE REQUIREMENTS:
Template: ${template.name} (${template.category || 'custom'})
Description: ${template.description || 'Custom template'}

${template.system_prompt || ''}

Template Sections Required:
${sectionsText}

Example Output Style:
${template.example_output || 'Follow the template structure above'}

Tone Override: ${template.tone || 'Use organization default'}
Audience Override: ${template.target_audience || 'Use organization default'}
Output Format: ${template.output_format || 'markdown'}

IMPORTANT: Follow the template structure exactly while maintaining the professional tone and voice established above.`
        
        systemPrompt += templateBlock
      } catch (error) {
        console.warn('Failed to process template object, using base prompt:', error)
        // Continue with base system prompt if template processing fails
      }
    }

    const aiService = new AIService()
    const generatedContent = await aiService.generate(systemPrompt, userPrompt)

    let draftId: string | undefined
    try {
      const title = version ? `Release ${version}` : `Release Notes - ${new Date().toLocaleDateString()}`
      const baseSlug = title.toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/[^\w-]+/g, '')
      const timestamp = Date.now()
      const slug = `${baseSlug}-${timestamp}`
      
      // Debug organization ID
      console.log('[Linear Generation] Organization debug:', {
        organizationId: organization?.id,
        integrationOrgId: integration.organization_id,
        finalOrgId: organization?.id || integration.organization_id
      })
      
      // Decide how to store content so the editor renders consistently
      const looksLikeHtml = typeof generatedContent === 'string' && /<[^>]+>/.test(generatedContent)
      const contentHtmlToSave = looksLikeHtml ? generatedContent : null

      const insertData = {
        title,
        slug,
        version,
        // If content is already HTML, store it. Otherwise let the editor convert markdown to HTML.
        content_html: contentHtmlToSave,
        content_markdown: generatedContent,
        status: 'draft',
        // Ensure the draft is associated with the user's organization
        organization_id: organization?.id || integration.organization_id,
        author_id: session.user.id,
        source_ticket_ids: filteredIssues.slice(0, 50).map(i => i.identifier),
        integration_id: integration.id
      }
      
      console.log('[Linear Generation] Attempting to insert release note:', {
        title: insertData.title,
        organization_id: insertData.organization_id,
        author_id: insertData.author_id,
        contentLength: insertData.content_markdown?.length || 0
      })
      
      const { data: inserted, error: insertError } = await supabase
        .from('release_notes')
        .insert([insertData])
        .select('id')
        .single()
        
      if (insertError) {
        console.error('[Linear Generation] Database insertion failed:', insertError)
      } else if (inserted?.id) {
        draftId = inserted.id
        console.log('[Linear Generation] Successfully created draft with ID:', draftId)
      } else {
        console.error('[Linear Generation] No ID returned from insertion')
      }
    } catch (e) {
      console.error('Failed to save draft release note:', e)
    }

    const response = {
      success: true,
      content: generatedContent,
      stats: {
        teams,
        totalIssues,
        dateRange
      },
      draftId
    }
    
    console.log('[Linear Generation] Returning response:', {
      success: response.success,
      contentLength: response.content?.length || 0,
      draftId: response.draftId,
      hasContent: !!response.content
    })
    
    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
