import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Smart import endpoint for URL-based template creation
export async function POST(request: NextRequest) {
    try {
        const supabase = createRouteHandlerClient({ cookies })
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { url, contentType = 'auto' } = body

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 })
        }

        console.log('🔍 Smart Import API: Looking up organization for user:', session.user.id)

        // Professional multi-tenant organization resolution
        let organizationId: string | null = null

        // Step 1: Try to get user's organization membership
        const { data: memberData, error: memberError } = await supabase
            .from("organization_members")
            .select("organization_id, organizations(id, name)")
            .eq("user_id", session.user.id)
            .single()

        if (memberData && !memberError) {
            organizationId = memberData.organization_id
            console.log('✅ Smart Import API: Found user organization membership:', organizationId)
        } else {
            console.log('⚠️ Smart Import API: No organization membership found, trying alternatives...')

            // Step 2: Check if user has any organizations they own
            const { data: ownedOrgs, error: ownedError } = await supabase
                .from("organizations")
                .select("id, name")
                .eq("created_by", session.user.id)
                .limit(1)
                .single()

            if (ownedOrgs && !ownedError) {
                organizationId = ownedOrgs.id
                console.log('✅ Smart Import API: Found user-owned organization:', organizationId)

                // Auto-add user to their own organization if not already a member
                const { error: memberInsertError } = await supabase
                    .from("organization_members")
                    .insert({
                        user_id: session.user.id,
                        organization_id: organizationId,
                        role: 'admin'
                    })
                    .select()
                    .single()

                if (!memberInsertError) {
                    console.log('✅ Smart Import API: Auto-added user to their organization')
                }
            } else {
                console.log('⚠️ Smart Import API: No owned organizations found, creating default organization...')

                // Step 3: Create a default organization for the user (professional SaaS approach)
                const defaultOrgName = `${session.user.email?.split('@')[0] || 'User'}'s Organization`

                const { data: newOrg, error: createOrgError } = await supabase
                    .from("organizations")
                    .insert({
                        name: defaultOrgName,
                        created_by: session.user.id,
                        settings: {}
                    })
                    .select()
                    .single()

                if (newOrg && !createOrgError) {
                    organizationId = newOrg.id
                    console.log('✅ Smart Import API: Created default organization:', organizationId)

                    // Add user as admin of the new organization
                    const { error: memberInsertError } = await supabase
                        .from("organization_members")
                        .insert({
                            user_id: session.user.id,
                            organization_id: organizationId,
                            role: 'admin'
                        })
                        .select()
                        .single()

                    if (!memberInsertError) {
                        console.log('✅ Smart Import API: Added user as admin of new organization')
                    }
                } else {
                    console.error('❌ Smart Import API: Failed to create default organization:', createOrgError)
                    return NextResponse.json({
                        error: "Unable to resolve organization. Please contact support.",
                        debug: {
                            userId: session.user.id,
                            memberError: memberError?.message,
                            ownedError: ownedError?.message,
                            createOrgError: createOrgError?.message
                        }
                    }, { status: 500 })
                }
            }
        }

        if (!organizationId) {
            console.error('❌ Smart Import API: Failed to resolve organization ID')
            return NextResponse.json({
                error: "Unable to resolve organization. Please contact support."
            }, { status: 500 })
        }

        console.log('✅ Smart Import API: Using organization:', organizationId)

        console.log('🚀 Smart Import API: Starting content extraction for URL:', url)

        // Step 1: Extract content from URL
        const extractedContent = await extractContentFromUrl(url, contentType)
        console.log('📊 Smart Import API: Content extraction result:', extractedContent)

        if (!extractedContent.success) {
            console.error('❌ Smart Import API: Content extraction failed:', extractedContent.error)
            return NextResponse.json({
                error: extractedContent.error || "Failed to extract content from URL"
            }, { status: 400 })
        }

        console.log('🧠 Smart Import API: Starting AI analysis...')

        // Step 2: Analyze content with AI
        const analysisResult = await analyzeContentWithAI(extractedContent.content, url)
        console.log('📋 Smart Import API: AI analysis result:', analysisResult)

        if (!analysisResult.success || !analysisResult.analysis) {
            console.error('❌ Smart Import API: AI analysis failed:', analysisResult.error)
            return NextResponse.json({
                error: analysisResult.error || "Failed to analyze content"
            }, { status: 500 })
        }

        const analysis = analysisResult.analysis
        console.log('✅ Smart Import API: Analysis sections created:', analysis.sections)
        console.log('📝 Smart Import API: Template suggestions:', {
            name: analysis.suggestedName,
            category: analysis.suggestedCategory,
            sectionsCount: analysis.sections?.length
        })

        // Step 3: Return structured template data for preview
        return NextResponse.json({
            success: true,
            extractedContent: extractedContent.content,
            analysis: analysis,
            suggestedTemplate: {
                name: analysis.suggestedName,
                description: analysis.suggestedDescription,
                category: analysis.suggestedCategory,
                icon: analysis.suggestedIcon,
                content: JSON.stringify({
                    sections: analysis.sections
                }),
                tone: analysis.suggestedTone,
                target_audience: analysis.suggestedAudience,
                output_format: analysis.suggestedFormat,
                system_prompt: analysis.systemPrompt,
                user_prompt_template: analysis.userPromptTemplate,
                example_output: analysis.exampleOutput,
                uses_org_ai_context: false,
                is_default: false,
                organization_id: organizationId
            }
        })

    } catch (error) {
        console.error("Smart import error:", error)
        return NextResponse.json({
            error: "Failed to process smart import"
        }, { status: 500 })
    }
}

// Content extraction service
async function extractContentFromUrl(url: string, contentType: string) {
    try {
        // Validate URL
        const urlObj = new URL(url)

        // Check if it's a supported domain/format
        const supportedDomains = ['github.com', 'gitlab.com', 'bitbucket.org']
        const isSupported = supportedDomains.some(domain => urlObj.hostname.includes(domain))

        if (!isSupported && contentType === 'auto') {
            // For non-supported domains, try generic web scraping
            return await extractGenericWebContent(url)
        }

        // Handle GitHub releases specifically
        if (urlObj.hostname.includes('github.com') && url.includes('/releases')) {
            return await extractGitHubReleases(url)
        }

        // Handle GitHub repository README
        if (urlObj.hostname.includes('github.com') && !url.includes('/releases')) {
            return await extractGitHubReadme(url)
        }

        // Fallback to generic extraction
        return await extractGenericWebContent(url)

    } catch (error) {
        console.error("Content extraction error:", error)
        return {
            success: false,
            error: "Invalid URL or failed to extract content"
        }
    }
}

// GitHub releases extraction
async function extractGitHubReleases(url: string) {
    try {
        console.log("Extracting GitHub releases from:", url)

        // Convert GitHub releases URL to API URL
        const urlParts = url.split('/')
        const owner = urlParts[3]
        const repo = urlParts[4]

        console.log("Owner:", owner, "Repo:", repo)

        if (!owner || !repo) {
            throw new Error("Invalid GitHub URL format")
        }

        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases`
        console.log("API URL:", apiUrl)

        const response = await fetch(apiUrl, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Smart-Template-Import/1.0'
            }
        })

        console.log("GitHub API response status:", response.status)

        if (!response.ok) {
            const errorText = await response.text()
            console.error("GitHub API error response:", errorText)
            throw new Error(`GitHub API error: ${response.status} - ${errorText}`)
        }

        const releases = await response.json()
        console.log("Found releases:", releases.length)

        if (!releases || releases.length === 0) {
            return {
                success: false,
                error: "No releases found for this repository"
            }
        }

        // Get the latest 3 releases for analysis
        const recentReleases = releases.slice(0, 3)
        const content = recentReleases.map((release: any) => ({
            version: release.tag_name,
            title: release.name || release.tag_name,
            date: release.published_at,
            body: release.body || '',
            url: release.html_url
        }))

        const rawText = recentReleases
            .map((r: any) => `${r.name || r.tag_name}\n${r.body || 'No description provided'}`)
            .join('\n\n---\n\n')

        console.log("Successfully extracted releases content")

        return {
            success: true,
            content: {
                type: 'github_releases',
                source: url,
                data: content,
                rawText: rawText
            }
        }

    } catch (error) {
        console.error("GitHub releases extraction error:", error)
        return {
            success: false,
            error: `Failed to extract GitHub releases: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
    }
}

// GitHub README extraction
async function extractGitHubReadme(url: string) {
    try {
        const urlParts = url.split('/')
        const owner = urlParts[3]
        const repo = urlParts[4]

        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/readme`

        const response = await fetch(apiUrl, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Smart-Template-Import/1.0'
            }
        })

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`)
        }

        const readme = await response.json()
        const content = Buffer.from(readme.content, 'base64').toString('utf-8')

        return {
            success: true,
            content: {
                type: 'github_readme',
                source: url,
                data: { content, encoding: readme.encoding },
                rawText: content
            }
        }

    } catch (error) {
        console.error("GitHub README extraction error:", error)
        return {
            success: false,
            error: "Failed to extract GitHub README"
        }
    }
}

// Generic web content extraction
async function extractGenericWebContent(url: string) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Smart-Template-Import/1.0'
            }
        })

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`)
        }

        const html = await response.text()

        // Basic HTML parsing to extract text content
        // Remove script and style tags
        const cleanHtml = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()

        return {
            success: true,
            content: {
                type: 'web_content',
                source: url,
                data: { html: cleanHtml },
                rawText: cleanHtml
            }
        }

    } catch (error) {
        console.error("Generic extraction error:", error)
        return {
            success: false,
            error: "Failed to extract web content"
        }
    }
}

// AI content analysis service with real Gemini integration
async function analyzeContentWithAI(content: any, sourceUrl: string) {
    try {
        console.log('🤖 Smart Import API: Starting real AI analysis with Gemini...')

        const rawText = content.rawText || ''
        const contentType = content.type || 'unknown'

        // Try real AI analysis first
        try {
            const realAIAnalysis = await performRealAIAnalysis(rawText, contentType, sourceUrl)
            if (realAIAnalysis.success) {
                console.log('✅ Smart Import API: Real AI analysis successful')
                return realAIAnalysis
            }
        } catch (aiError) {
            console.warn('⚠️ Smart Import API: Real AI analysis failed, falling back to pattern matching:', aiError)
        }

        // Fallback to pattern matching if AI fails
        console.log('🔄 Smart Import API: Using pattern matching fallback')
        const analysis = await performContentAnalysis(rawText, contentType, sourceUrl)

        return {
            success: true,
            analysis
        }

    } catch (error) {
        console.error("❌ Smart Import API: AI analysis error:", error)
        return {
            success: false,
            error: "Failed to analyze content with AI"
        }
    }
}

// Real AI analysis using Gemini
async function performRealAIAnalysis(text: string, contentType: string, sourceUrl: string) {
    try {
        // Check if we have Gemini API key
        const geminiApiKey = process.env.GEMINI_API_KEY
        if (!geminiApiKey) {
            console.log('⚠️ Smart Import API: No Gemini API key found, skipping real AI analysis')
            throw new Error('No Gemini API key configured')
        }

        console.log('🤖 Smart Import API: Calling Gemini API for content analysis...')

        const prompt = `Analyze the following GitHub release notes content and create a professional template structure:

CONTENT TO ANALYZE:
${text.substring(0, 4000)} ${text.length > 4000 ? '...' : ''}

SOURCE: ${sourceUrl}

Please analyze this content and respond with a JSON object containing:
{
  "suggestedName": "A descriptive template name",
  "suggestedDescription": "Brief description of what this template is for",
  "suggestedCategory": "software",
  "suggestedIcon": "🐙",
  "suggestedTone": "professional",
  "suggestedAudience": "developers", 
  "suggestedFormat": "markdown",
  "sections": [
    {
      "id": "unique-id",
      "name": "Section Name",
      "type": "features|bugfixes|breaking|improvements|security|technical",
      "required": true/false,
      "prompt": "AI prompt for this section",
      "example": "Example content for this section"
    }
  ],
  "systemPrompt": "System prompt for AI",
  "userPromptTemplate": "User prompt template",
  "exampleOutput": "Example release notes output"
}

Analyze the actual content to determine what sections are needed. Look for patterns like:
- New features, additions, enhancements
- Bug fixes, issues resolved
- Breaking changes, deprecations
- Performance improvements, optimizations
- Security updates
- Technical changes, dependencies

Create realistic prompts and examples based on the actual content patterns you see.`

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ Smart Import API: Gemini API error:', response.status, errorText)
            throw new Error(`Gemini API error: ${response.status}`)
        }

        const result = await response.json()
        console.log('📊 Smart Import API: Gemini API response received')

        const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text
        if (!aiText) {
            throw new Error('No content in Gemini response')
        }

        // Parse JSON from AI response
        const jsonMatch = aiText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            throw new Error('No JSON found in AI response')
        }

        const aiAnalysis = JSON.parse(jsonMatch[0])
        console.log('🧠 Smart Import API: AI analysis parsed successfully')

        // Add unique IDs to sections if missing
        aiAnalysis.sections = aiAnalysis.sections.map((section: any, index: number) => ({
            ...section,
            id: section.id || `ai-${Date.now()}-${index}`
        }))

        return {
            success: true,
            analysis: aiAnalysis
        }

    } catch (error) {
        console.error('❌ Smart Import API: Real AI analysis failed:', error)
        throw error
    }
}

// Content analysis logic - Properly analyze GitHub releases
async function performContentAnalysis(text: string, contentType: string, sourceUrl: string) {
    console.log("Analyzing content for template creation...")

    // Define our template section structure according to our architecture
    interface TemplateSection {
        id: string;
        name: string;
        type: 'features' | 'improvements' | 'bugfixes' | 'breaking' | 'security' | 'technical' | 'contact' | 'custom';
        required: boolean;
        prompt: string;
        example: string;
    }

    // Analyze GitHub releases content
    const templateSections: TemplateSection[] = []

    if (contentType === 'github_releases') {
        console.log('🔍 Smart Import API: Analyzing GitHub releases content...')
        console.log('📄 Smart Import API: Content preview:', text.substring(0, 500) + '...')

        // Analyze the actual release notes content more intelligently
        const textLower = text.toLowerCase()

        // Parse actual GitHub release sections from the content
        const releaseLines = text.split('\n').filter(line => line.trim())
        const detectedSections = new Set<string>()

        // Look for actual section headers in GitHub releases (like "## Core Changes", "### Bug Fixes", etc.)
        for (const line of releaseLines) {
            const trimmedLine = line.trim().toLowerCase()

            // Check for markdown headers that indicate sections
            if (trimmedLine.match(/^#+\s+/)) {
                const sectionName = trimmedLine.replace(/^#+\s+/, '').trim()
                console.log('🔍 Smart Import API: Found section header:', sectionName)
                detectedSections.add(sectionName)
            }

            // Also check for bullet points or numbered lists that might indicate section content
            if (trimmedLine.match(/^[-*•]\s+/) || trimmedLine.match(/^\d+\.\s+/)) {
                const content = trimmedLine.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '').trim()
                console.log('🔍 Smart Import API: Found list item:', content.substring(0, 50) + '...')
            }
        }

        console.log('🔍 Smart Import API: All detected sections:', Array.from(detectedSections))

        // Now check for specific patterns based on what we actually found
        const hasFeatures = Array.from(detectedSections).some(section =>
            section.includes('feature') || section.includes('new') || section.includes('added') || section.includes('enhancement')
        )
        const hasBugFixes = Array.from(detectedSections).some(section =>
            section.includes('fix') || section.includes('bug') || section.includes('patch')
        )
        const hasBreaking = Array.from(detectedSections).some(section =>
            section.includes('breaking') || section.includes('deprecat') || section.includes('removed')
        )
        const hasImprovements = Array.from(detectedSections).some(section =>
            section.includes('improve') || section.includes('performance') || section.includes('optimization')
        )
        const hasSecurity = Array.from(detectedSections).some(section =>
            section.includes('security') || section.includes('vulnerability')
        )
        const hasCore = Array.from(detectedSections).some(section =>
            section.includes('core') || section.includes('internal')
        )
        const hasMisc = Array.from(detectedSections).some(section =>
            section.includes('misc') || section.includes('miscellaneous') || section.includes('other')
        )
        const hasDocs = Array.from(detectedSections).some(section =>
            section.includes('doc') || section.includes('documentation')
        )

        console.log('🔍 Smart Import API: Content analysis results:', {
            hasFeatures, hasBugFixes, hasBreaking, hasImprovements, hasSecurity,
            hasCore, hasMisc, hasDocs
        })

        // Create sections based on ACTUAL content analysis - be more specific
        console.log('🎯 Smart Import API: Creating sections based on actual content patterns...')

        // Only create sections if there's strong evidence in the content
        if (hasFeatures && (textLower.includes('new feature') || textLower.includes('added feature') || textLower.includes('feature:'))) {
            console.log('✅ Smart Import API: Adding Features section (strong evidence found)')
            templateSections.push({
                id: `features-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: "New Features",
                type: 'features',
                required: true,
                prompt: "List the new features and enhancements added in this release. Focus on user-facing improvements and new capabilities.",
                example: "• Added dark mode support\n• New dashboard analytics\n• Enhanced search functionality"
            })
        }

        if (hasBugFixes && (textLower.includes('bug fix') || textLower.includes('fixed:') || textLower.includes('fix:'))) {
            console.log('✅ Smart Import API: Adding Bug Fixes section (strong evidence found)')
            templateSections.push({
                id: `bugfixes-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: "Bug Fixes",
                type: 'bugfixes',
                required: true,
                prompt: "List the bugs that were fixed in this release. Include any stability improvements and issue resolutions.",
                example: "• Fixed login redirect issue\n• Resolved memory leak in data processing\n• Fixed UI rendering on mobile devices"
            })
        }

        if (hasBreaking && (textLower.includes('breaking change') || textLower.includes('breaking:') || textLower.includes('deprecated'))) {
            console.log('✅ Smart Import API: Adding Breaking Changes section (strong evidence found)')
            templateSections.push({
                id: `breaking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: "Breaking Changes",
                type: 'breaking',
                required: true,
                prompt: "List any breaking changes that may affect existing users or integrations. Include migration instructions.",
                example: "• API endpoint /v1/users deprecated, use /v2/users\n• Configuration format changed\n• Minimum Node.js version now 18+"
            })
        }

        if (hasSecurity && (textLower.includes('security fix') || textLower.includes('vulnerability') || textLower.includes('cve-'))) {
            console.log('✅ Smart Import API: Adding Security section (strong evidence found)')
            templateSections.push({
                id: `security-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: "Security Updates",
                type: 'security',
                required: true,
                prompt: "List security fixes and improvements. Be specific about what was addressed without revealing vulnerabilities.",
                example: "• Fixed authentication bypass vulnerability\n• Updated dependencies with security patches\n• Enhanced input validation"
            })
        }

        // Handle specific patterns found in Next.js and similar projects
        if (hasCore) {
            console.log('✅ Smart Import API: Adding Core Changes section (core changes detected)')
            templateSections.push({
                id: `technical-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: "Core Changes",
                type: 'technical',
                required: true,
                prompt: "List core framework changes, internal improvements, and technical modifications.",
                example: "• Refactored internal routing system\n• Updated core dependencies\n• Improved build performance"
            })
        }

        if (hasMisc) {
            console.log('✅ Smart Import API: Adding Miscellaneous section (misc changes detected)')
            templateSections.push({
                id: `improvements-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: "Miscellaneous Changes",
                type: 'improvements',
                required: false,
                prompt: "List miscellaneous improvements, minor fixes, and other changes that don't fit other categories.",
                example: "• Updated documentation\n• Minor code cleanup\n• Dependency updates"
            })
        }

        if (hasDocs) {
            console.log('✅ Smart Import API: Adding Documentation section (docs changes detected)')
            templateSections.push({
                id: `technical-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: "Documentation",
                type: 'technical',
                required: false,
                prompt: "List documentation updates, README changes, and guide improvements.",
                example: "• Updated API documentation\n• Added new examples\n• Fixed typos in guides"
            })
        }

        console.log('📊 Smart Import API: Created sections based on actual content:', templateSections.map(s => s.name))
    }

    // If no sections detected, create default ones
    if (templateSections.length === 0) {
        templateSections.push(
            {
                id: `features-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: "New Features",
                type: 'features',
                required: true,
                prompt: "List the new features and enhancements added in this release.",
                example: "• Feature 1\n• Feature 2"
            },
            {
                id: `bugfixes-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: "Bug Fixes",
                type: 'bugfixes',
                required: true,
                prompt: "List the bugs that were fixed in this release.",
                example: "• Fixed issue 1\n• Fixed issue 2"
            }
        )
    }

    // Generate suggestions based on analysis
    const suggestions = generateTemplateSuggestions(templateSections, contentType, sourceUrl, text)

    return {
        sections: templateSections,
        ...suggestions
    }
}

function isLikelySectionHeader(text: string): boolean {
    // Common patterns for section headers
    const patterns = [
        /^#+\s+/,  // Markdown headers
        /^[A-Z][^a-z]*:?\s*$/,  // ALL CAPS or Title Case
        /^(New|Added|Fixed|Changed|Removed|Deprecated|Security|Features?|Bug\s*Fixes?|Breaking\s*Changes?|Improvements?)/i,
        /^\*\*[^*]+\*\*:?\s*$/,  // Bold text
        /^-+\s*[A-Z]/,  // Dashed headers
    ]

    return patterns.some(pattern => pattern.test(text))
}

function detectSectionType(header: string): string | null {
    const headerLower = header.toLowerCase()

    // More specific detection for release notes
    if (headerLower.includes('new feature') || headerLower.includes('added') || headerLower.includes('enhancement')) {
        return 'features'
    }
    if (headerLower.includes('bug fix') || headerLower.includes('fixed') || headerLower.includes('resolve')) {
        return 'bugfixes'
    }
    if (headerLower.includes('breaking') || headerLower.includes('breaking change')) {
        return 'breaking'
    }
    if (headerLower.includes('improve') || headerLower.includes('performance') || headerLower.includes('optimization')) {
        return 'improvements'
    }
    if (headerLower.includes('security') || headerLower.includes('vulnerability')) {
        return 'security'
    }
    if (headerLower.includes('deprecat') || headerLower.includes('removed')) {
        return 'technical'
    }

    // Skip invalid sections
    return null
}

function generateTemplateSuggestions(sections: any[], contentType: string, sourceUrl: string, text: string) {
    // Generate professional template name based on repository
    const domain = new URL(sourceUrl).hostname
    let suggestedName = `Professional Release Notes Template`
    let repoName = ''

    // Try to extract repository name for better naming
    if (sourceUrl.includes('github.com')) {
        const urlParts = sourceUrl.split('/')
        const owner = urlParts[3]
        const repo = urlParts[4]
        if (owner && repo) {
            repoName = repo
            // Create a more professional name
            const formattedRepo = repo.charAt(0).toUpperCase() + repo.slice(1)
            suggestedName = `${formattedRepo} Release Notes Template`
        }
    }

    // Determine category based on content analysis (using database-compliant values)
    let suggestedCategory = 'technical'
    const textLower = text.toLowerCase()

    if (textLower.includes('marketing') || textLower.includes('announcement') || textLower.includes('launch')) {
        suggestedCategory = 'marketing'
    } else if (textLower.includes('changelog') || textLower.includes('changes') || textLower.includes('release')) {
        suggestedCategory = 'changelog'
    } else if (textLower.includes('api') || textLower.includes('library') || textLower.includes('framework') || textLower.includes('developer')) {
        suggestedCategory = 'technical'
    } else if (textLower.includes('modern') || textLower.includes('clean') || textLower.includes('ui') || textLower.includes('design')) {
        suggestedCategory = 'modern'
    } else if (textLower.includes('traditional') || textLower.includes('classic') || textLower.includes('standard')) {
        suggestedCategory = 'traditional'
    } else if (textLower.includes('minimal') || textLower.includes('simple') || textLower.includes('basic')) {
        suggestedCategory = 'minimal'
    } else {
        suggestedCategory = 'technical'
    }

    // Suggest icon based on source and content
    let suggestedIcon = '🚀'
    if (sourceUrl.includes('github.com')) {
        suggestedIcon = '🐙'
    } else if (sourceUrl.includes('gitlab.com')) {
        suggestedIcon = '🦊'
    } else if (sourceUrl.includes('bitbucket.org')) {
        suggestedIcon = '🪣'
    }

    // Override icon based on category (using database-compliant categories)
    if (suggestedCategory === 'marketing') {
        suggestedIcon = '�'
    } else if (suggestedCategory === 'technical') {
        suggestedIcon = '⚙️'
    } else if (suggestedCategory === 'security') {
        suggestedIcon = '�'
    } else if (suggestedCategory === 'product') {
        suggestedIcon = '🎯'
    } else if (suggestedCategory === 'marketing') {
        suggestedIcon = '📢'
    } else if (suggestedCategory === 'enterprise') {
        suggestedIcon = '🏢'
    }

    // Generate dynamic prompts based on actual content and detected sections
    const sectionTypes = sections.map(s => s.type)
    const sectionNames = sections.map(s => s.name)
    const hasFeatures = sectionTypes.includes('features')
    const hasBugFixes = sectionTypes.includes('bugfixes')
    const hasBreaking = sectionTypes.includes('breaking')
    const hasCore = sectionNames.some(name => name.toLowerCase().includes('core'))
    const hasMisc = sectionNames.some(name => name.toLowerCase().includes('misc'))

    // Dynamic system prompt based on actual content
    let systemPrompt = `You are a professional release notes writer for ${repoName || 'software'} releases. `

    if (hasCore && hasMisc) {
        systemPrompt += "Focus on clearly organizing core framework changes and miscellaneous improvements. "
    } else if (hasFeatures && hasBugFixes) {
        systemPrompt += "Focus on clearly separating new features from bug fixes. "
    } else if (hasCore) {
        systemPrompt += "Focus on technical and internal changes that affect the core system. "
    }

    if (hasBreaking) {
        systemPrompt += "Pay special attention to breaking changes and provide clear migration guidance. "
    }

    // Customize tone based on project type (using database-compliant categories)
    if (suggestedCategory === 'technical') {
        systemPrompt += "Write in a technical tone suitable for developers and technical users. "
    } else if (suggestedCategory === 'marketing') {
        systemPrompt += "Write in an engaging, user-friendly tone suitable for announcements. "
    } else if (suggestedCategory === 'modern') {
        systemPrompt += "Write in a clean, modern tone suitable for contemporary software releases. "
    } else if (suggestedCategory === 'traditional') {
        systemPrompt += "Write in a formal, traditional tone suitable for established software projects. "
    } else if (suggestedCategory === 'minimal') {
        systemPrompt += "Write in a concise, minimal tone focusing on essential information. "
    } else if (suggestedCategory === 'changelog') {
        systemPrompt += "Write in a structured, detailed tone suitable for comprehensive change documentation. "
    } else {
        systemPrompt += "Write in a clear, professional tone suitable for software release communications. "
    }

    systemPrompt += "Use bullet points and clear categorization."

    // Dynamic user prompt template based on detected sections
    let userPromptTemplate = "Create release notes for version {{version}} with the following changes:\n\n{{changes}}\n\n"
    if (sectionNames.length > 0) {
        userPromptTemplate += `Organize the content into these sections: ${sectionNames.join(', ')}. `
    }
    userPromptTemplate += "Format with clear bullet points and appropriate headers."

    // Generate example output based on actual sections
    const exampleOutput = generateExampleOutput(sections)

    // Generate professional description based on category and content
    let suggestedDescription = `Professional release notes template for ${repoName || 'software'} projects`

    if (suggestedCategory === 'technical') {
        suggestedDescription = `Technical release notes template emphasizing development and infrastructure changes`
    } else if (suggestedCategory === 'marketing') {
        suggestedDescription = `Marketing-oriented release notes template for announcements and user engagement`
    } else if (suggestedCategory === 'modern') {
        suggestedDescription = `Modern release notes template with clean design and contemporary formatting`
    } else if (suggestedCategory === 'traditional') {
        suggestedDescription = `Traditional release notes template with formal structure and comprehensive documentation`
    } else if (suggestedCategory === 'minimal') {
        suggestedDescription = `Minimal release notes template focusing on essential information and clean presentation`
    } else if (suggestedCategory === 'changelog') {
        suggestedDescription = `Comprehensive changelog template for detailed release documentation`
    } else {
        suggestedDescription = `Professional release notes template with clear communication for all audiences`
    }

    // Dynamic tone based on content analysis (using database-compliant values)
    let suggestedTone = 'professional'
    if (textLower.includes('casual') || textLower.includes('friendly') || textLower.includes('user') || textLower.includes('customer')) {
        suggestedTone = 'casual'
    } else if (textLower.includes('technical') || textLower.includes('internal') || hasCore) {
        suggestedTone = 'technical'
    } else if (textLower.includes('formal') || textLower.includes('security') || textLower.includes('critical')) {
        suggestedTone = 'formal'
    } else if (textLower.includes('exciting') || textLower.includes('amazing') || textLower.includes('enthusiastic')) {
        suggestedTone = 'enthusiastic'
    }

    // Dynamic audience based on content and category (using database-compliant values)
    let suggestedAudience = 'developers'
    if (suggestedCategory === 'marketing') {
        suggestedAudience = 'users'
    } else if (suggestedCategory === 'technical') {
        suggestedAudience = 'developers'
    } else if (suggestedCategory === 'modern' || suggestedCategory === 'minimal') {
        suggestedAudience = 'mixed'
    } else if (textLower.includes('business') || textLower.includes('enterprise')) {
        suggestedAudience = 'business'
    } else if (hasCore || hasMisc) {
        suggestedAudience = 'developers'
    } else {
        suggestedAudience = 'mixed'
    }

    // Dynamic format based on content structure (using database-compliant values)
    let suggestedFormat = 'markdown'
    if (textLower.includes('html') || textLower.includes('<') || textLower.includes('web')) {
        suggestedFormat = 'html'
    }
    // Note: Only 'markdown' and 'html' are allowed by database constraint

    console.log('🎯 Smart Import API: Dynamic suggestions generated:', {
        tone: suggestedTone,
        audience: suggestedAudience,
        format: suggestedFormat,
        category: suggestedCategory
    })

    return {
        suggestedName,
        suggestedDescription,
        suggestedCategory,
        suggestedIcon,
        suggestedTone,
        suggestedAudience,
        suggestedFormat,
        systemPrompt,
        userPromptTemplate,
        exampleOutput
    }
}

function generateExampleOutput(sections: any[]): string {
    let output = "# Release Notes v1.0.0\n\n"

    for (const section of sections.slice(0, 3)) { // Limit to first 3 sections
        output += `## ${section.name}\n\n`
        // Use the example from the section instead of trying to access content
        const exampleLines = section.example.split('\n')
        for (const line of exampleLines.slice(0, 2)) { // Limit to 2 items per section
            if (line.trim()) {
                output += `${line}\n`
            }
        }
        output += '\n'
    }

    return output.trim()
}