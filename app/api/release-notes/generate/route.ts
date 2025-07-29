import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { GitHubService } from "@/lib/integrations/github"
import { AIService } from "@/lib/services/ai.service"

export async function POST(request: NextRequest) {
    try {
        const supabase = createRouteHandlerClient({ cookies })
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { repository, dataSources, template, instructions, version, releaseDate } = body

        if (!repository || !dataSources) {
            return NextResponse.json({ error: "Repository and data sources are required" }, { status: 400 })
        }

        console.log('🤖 AI Generation API: Starting professional generation process...')
        console.log('📊 Repository:', repository.full_name)
        console.log('📋 Data Sources:', dataSources)
        console.log('🎨 Template:', template)
        console.log('📝 Instructions:', instructions)

        // Get user's organization for context
        let organizationId: string | null = null
        let organizationContext = ''

        try {
            const { data: memberData } = await supabase
                .from("organization_members")
                .select("organization_id, organizations(id, name)")
                .eq("user_id", session.user.id)
                .single()

            if (memberData) {
                organizationId = memberData.organization_id

                // Get organization AI context
                const { data: orgContext } = await supabase
                    .from('organization_ai_context')
                    .select('context')
                    .eq('organization_id', organizationId)
                    .single()

                organizationContext = orgContext?.context || ''
                console.log('🏢 Organization context loaded')
            }
        } catch (orgError) {
            console.log('⚠️ No organization context available')
        }

        try {
            // Step 1: Get comprehensive context data for professional prompt engineering
            console.log('🔍 Gathering comprehensive context data...')

            // Get organization data for context
            const { data: orgData } = await supabase
                .from('organizations')
                .select(`
                    id, name, slug, meta_description, brand_color, settings,
                    logo_url, custom_domain, meta_title, meta_image_url
                `)
                .eq('id', organizationId)
                .single()

            // Get AI context preferences
            const { data: aiContextData } = await supabase
                .from('ai_context')
                .select('*')
                .eq('organization_id', organizationId)
                .single()

            // Step 2: Get GitHub integration and fetch repository data
            const { data: integration } = await supabase
                .from('integrations')
                .select('encrypted_credentials')
                .eq('type', 'github')
                .eq('organization_id', organizationId || session.user.id)
                .single()

            if (!integration?.encrypted_credentials?.access_token) {
                throw new Error('GitHub integration not found')
            }

            const github = new GitHubService(integration.encrypted_credentials.access_token)
            const [owner, repo] = repository.full_name.split('/')

            console.log('📊 Fetching repository data from GitHub...')

            // Fetch selected commits with full details
            let selectedCommitsData: any[] = []
            if (dataSources.selectedCommits && dataSources.selectedCommits.length > 0) {
                try {
                    // Get all commits first
                    const allCommits = await github.getCommits(owner, repo, {
                        since: dataSources.dateRange?.from,
                        until: dataSources.dateRange?.to,
                        sha: dataSources.branch,
                        per_page: 100
                    })

                    // Filter to only selected commits
                    selectedCommitsData = allCommits.filter(commit =>
                        dataSources.selectedCommits.includes(commit.sha)
                    )

                    console.log(`✅ Fetched ${selectedCommitsData.length} selected commits`)
                } catch (error) {
                    console.warn('Failed to fetch commits:', error)
                }
            }

            // Step 3: Build professional context-aware prompts
            console.log('🧠 Building professional AI prompts with full context...')

            // Import the professional prompt engine
            const { getAiProvider } = await import('@/lib/ai')
            const { buildPromptContext, ProfessionalPromptEngine } = await import('@/lib/ai/prompt-engine')

            const aiProvider = getAiProvider()

            // Build comprehensive prompt context
            const promptContext = await buildPromptContext(
                orgData || {
                    id: organizationId,
                    name: 'Your Organization',
                    slug: 'your-org',
                    settings: {}
                },
                aiContextData || {
                    tone: 'professional',
                    audience: 'mixed',
                    output_format: 'markdown',
                    include_metrics: true,
                    brevity_level: 'detailed'
                },
                'release_notes'
            )

            // Generate professional system prompt
            let systemPrompt = ProfessionalPromptEngine.generateSystemPrompt(promptContext)

            // Enhance system prompt with template-specific instructions
            if (template && typeof template === 'object') {
                systemPrompt += `\n\nTEMPLATE REQUIREMENTS:
Template: ${template.name} (${template.category})
Description: ${template.description}

${template.system_prompt}

Template Sections Required:
${JSON.parse(template.content).sections.map((section: any) =>
                    `- ${section.name} (${section.type}): ${section.prompt}`
                ).join('\n')}

Example Output Style:
${template.example_output}

Tone Override: ${template.tone}
Audience Override: ${template.target_audience}
Output Format: ${template.output_format}`
            }

            // Add organization AI context if available
            if (organizationContext) {
                systemPrompt += `\n\nORGANIZATION AI CONTEXT:
${organizationContext}

Use this context to ensure the release notes align with the organization's voice, industry, and communication style.`
            }

            // Step 4: Build comprehensive user prompt from data sources
            let userPrompt = ''

            // Add version and release information
            if (version || releaseDate) {
                userPrompt += `Create release notes for ${repository.full_name}`
                if (version) userPrompt += ` version ${version}`
                if (releaseDate) userPrompt += ` (releasing on ${new Date(releaseDate).toLocaleDateString()})`
                userPrompt += '\n\n'
            }

            // Add selected commits with rich context
            if (selectedCommitsData.length > 0) {
                userPrompt += `SELECTED COMMITS (${selectedCommitsData.length} changes):\n`
                selectedCommitsData.forEach((commit: any, index: number) => {
                    userPrompt += `${index + 1}. **${commit.message.split('\n')[0]}**\n`
                    userPrompt += `   - Author: ${commit.author?.name || 'Unknown'}\n`
                    userPrompt += `   - Date: ${new Date(commit.author?.date || commit.commit?.author?.date).toLocaleDateString()}\n`
                    userPrompt += `   - SHA: ${commit.sha.substring(0, 7)}\n`
                    if (commit.message.includes('\n')) {
                        const description = commit.message.split('\n').slice(1).join('\n').trim()
                        if (description) {
                            userPrompt += `   - Details: ${description}\n`
                        }
                    }
                    userPrompt += '\n'
                })
            }

            // Add additional changes if provided
            if (dataSources.additionalChanges?.trim()) {
                userPrompt += `ADDITIONAL CHANGES:\n${dataSources.additionalChanges.trim()}\n\n`
            }

            // Add special instructions if provided
            if (instructions?.trim()) {
                userPrompt += `SPECIAL INSTRUCTIONS:\n${instructions.trim()}\n\n`
            }

            // Add repository context
            userPrompt += `REPOSITORY CONTEXT:
- Repository: ${repository.full_name}
- Branch: ${dataSources.branch || 'main'}
- Date Range: ${dataSources.dateRange?.from} to ${dataSources.dateRange?.to}
- Total Selected Changes: ${selectedCommitsData.length} commits`

            if (dataSources.additionalChanges?.trim()) {
                userPrompt += ` + additional changes`
            }

            userPrompt += `\n\nFOCUS AREAS:
- Emphasize user-facing improvements and new capabilities
- Highlight the value and impact of each change
- Group related changes logically
- Maintain professional tone while being engaging
- Include technical context where relevant for the audience`

            // Add template-specific user prompt if available
            if (template && typeof template === 'object') {
                const templateContent = JSON.parse(template.content)
                userPrompt += `\n\nTEMPLATE REQUIREMENTS:
Follow the "${template.name}" template structure with these sections:
${templateContent.sections.map((section: any) =>
                    `- ${section.name}: ${section.prompt}${section.example ? `\n  Example: ${section.example}` : ''}`
                ).join('\n')}

${template.user_prompt_template.replace('{version}', version || 'latest').replace('{changes}', 'the commits and changes listed above')}`
            }

            console.log('📝 System Prompt Length:', systemPrompt.length, 'characters')
            console.log('📝 User Prompt Length:', userPrompt.length, 'characters')

            // Step 5: Generate with enhanced context-aware AI
            let generationResult
            const startTime = Date.now()

            // Check if provider supports enhanced context-aware generation
            if ('generateWithContext' in aiProvider && typeof aiProvider.generateWithContext === 'function') {
                // Use enhanced context-aware generation if available
                console.log('🚀 Using enhanced context-aware generation')
                const generatedContent = await aiProvider.generateWithContext(
                    userPrompt,
                    orgData,
                    aiContextData,
                    {
                        contentType: 'release_notes',
                        maxTokens: 3000,
                        temperature: 0.3
                    }
                )

                console.log('✨ Enhanced AI generation completed')

                generationResult = {
                    content: generatedContent,
                    metadata: {
                        provider: 'gemini',
                        processingTime: Date.now() - startTime
                    }
                }
            } else {
                // Fallback to template-based generation
                console.log('🔄 Using template-based generation fallback')
                const generatedContent = await aiProvider.generateWithTemplate(
                    systemPrompt,
                    userPrompt,
                    {
                        tone: aiContextData?.tone || template?.tone || 'professional',
                        targetAudience: aiContextData?.audience || template?.target_audience || 'mixed',
                        outputFormat: aiContextData?.output_format || template?.output_format || 'markdown',
                        maxTokens: 3000,
                        temperature: 0.3
                    }
                )

                generationResult = {
                    content: generatedContent,
                    metadata: {
                        provider: 'gemini',
                        processingTime: Date.now() - startTime
                    }
                }
            }

            const generatedContent = generationResult.content
            console.log('✨ AI generation completed:', {
                provider: generationResult.metadata.provider,
                processingTime: generationResult.metadata.processingTime
            })

            // Step 4: Save the generated content as a draft using existing release notes store structure
            console.log('💾 Saving generated content...')
            const { data: draftData, error: draftError } = await supabase
                .from('release_notes')
                .insert({
                    title: `Release Notes ${version || 'v1.0.0'}`,
                    slug: `release-notes-${version || 'v1-0-0'}-${Date.now()}`,
                    content_markdown: generatedContent,
                    version: version || 'v1.0.0',
                    status: 'draft',
                    author_id: session.user.id,
                    organization_id: organizationId
                })
                .select()
                .single()

            if (draftError) {
                console.error('❌ Failed to save draft:', draftError)
                throw new Error('Failed to save generated content')
            }

            console.log('✅ AI Generation completed successfully, draft saved:', draftData.id)

            return NextResponse.json({
                success: true,
                content: generatedContent,
                draftId: draftData.id,
                metadata: {
                    repository: repository.full_name,
                    version: version || 'v1.0.0',
                    generatedAt: new Date().toISOString(),
                    template: typeof template === 'object' ? template.name : 'AI Decided',
                    aiGenerated: true,
                    wordCount: generatedContent.split(/\s+/).length,
                    sectionsCount: (generatedContent.match(/^#{2,3}\s+/gm) || []).length
                }
            })

        } catch (serviceError) {
            console.error('AI Generation service error:', serviceError)
            
            // Return the actual error instead of falling back to mock data
            return NextResponse.json({
                error: "AI generation failed",
                details: serviceError instanceof Error ? serviceError.message : 'Unknown AI service error',
                suggestion: "Please check your AI service configuration (GEMINI_API_KEY) and try again"
            }, { status: 500 })
        }

    } catch (error) {
        console.error("❌ AI Generation API error:", error)
        return NextResponse.json({
            error: "Failed to generate release notes",
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}