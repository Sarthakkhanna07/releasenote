/**
 * Professional Prompt Engineering System
 * 
 * This system creates dynamic, context-aware system prompts by combining:
 * 1. Organization details (company context)
 * 2. User preferences (tone, audience, format)
 * 3. Professional prompt engineering best practices
 * 
 * The user only provides their content request - all underlying prompt logic is hidden.
 */

export interface OrganizationContext {
  id: string
  name: string
  slug: string
  meta_description?: string
  brand_color?: string
  settings?: {
    industry?: string
    company_size?: string
    product_type?: string
    target_market?: string
    company_description?: string
  }
}

export interface UserPreferences {
  tone: 'professional' | 'casual' | 'technical' | 'enthusiastic' | 'formal'
  audience: 'developers' | 'business' | 'users' | 'mixed' | 'executives'
  output_format: 'markdown' | 'html'
  language?: string
  include_emojis?: boolean
  include_metrics?: boolean
  brevity_level?: 'concise' | 'detailed' | 'comprehensive'
}

export interface PromptContext {
  organization: OrganizationContext
  preferences: UserPreferences
  content_type: 'release_notes' | 'feature_announcement' | 'bug_fix' | 'security_update'
  template_style?: string
}

/**
 * Core Prompt Engineering Class
 * Handles the complex logic of building professional system prompts
 */
export class ProfessionalPromptEngine {
  
  /**
   * Generate a complete system prompt from organization and user context
   */
  static generateSystemPrompt(context: PromptContext): string {
    const {
      roleDefinition,
      companyContext,
      audienceGuidelines,
      toneInstructions,
      formatSpecifications,
      qualityStandards,
      outputConstraints
    } = this.buildPromptComponents(context)

    return `${roleDefinition}

${companyContext}

${audienceGuidelines}

${toneInstructions}

${formatSpecifications}

${qualityStandards}

${outputConstraints}

Remember: You are representing ${context.organization.name} and writing for their ${context.preferences.audience}. Every word should reflect their brand and serve their users' needs.`
  }

  /**
   * Build individual prompt components using professional prompt engineering
   */
  private static buildPromptComponents(context: PromptContext) {
    return {
      roleDefinition: this.buildRoleDefinition(context),
      companyContext: this.buildCompanyContext(context.organization),
      audienceGuidelines: this.buildAudienceGuidelines(context.preferences.audience),
      toneInstructions: this.buildToneInstructions(context.preferences.tone),
      formatSpecifications: this.buildFormatSpecifications(context.preferences),
      qualityStandards: this.buildQualityStandards(context),
      outputConstraints: this.buildOutputConstraints(context.preferences)
    }
  }

  /**
   * Define the AI's role based on content type and context
   */
  private static buildRoleDefinition(context: PromptContext): string {
    const roleMap = {
      release_notes: 'expert release notes writer and product communicator',
      feature_announcement: 'product marketing specialist and feature evangelist', 
      bug_fix: 'technical communicator specializing in issue resolution',
      security_update: 'security communications expert and technical writer'
    }

    const role = roleMap[context.content_type] || 'professional technical writer'
    
    return `You are a ${role} working for ${context.organization.name}. Your expertise lies in transforming technical changes into clear, valuable communications that resonate with your target audience.

Your primary responsibility is to create content that:
- Clearly communicates the value and impact of changes
- Maintains ${context.organization.name}'s brand voice and professional standards
- Serves the specific needs of your ${context.preferences.audience} audience
- Follows industry best practices for ${context.content_type.replace('_', ' ')}`
  }

  /**
   * Build company-specific context from organization data
   */
  private static buildCompanyContext(org: OrganizationContext): string {
    const settings = org.settings || {}
    
    let context = `COMPANY CONTEXT:
Organization: ${org.name}`

    if (org.meta_description) {
      context += `\nCompany Description: ${org.meta_description}`
    }

    if (settings.industry) {
      context += `\nIndustry: ${settings.industry}`
    }

    if (settings.product_type) {
      context += `\nProduct Type: ${settings.product_type}`
    }

    if (settings.target_market) {
      context += `\nTarget Market: ${settings.target_market}`
    }

    if (settings.company_description) {
      context += `\nAdditional Context: ${settings.company_description}`
    }

    context += `\n\nYour writing should reflect ${org.name}'s position in the ${settings.industry || 'technology'} space and speak to their ${settings.target_market || 'professional'} audience.`

    return context
  }

  /**
   * Build audience-specific guidelines
   */
  private static buildAudienceGuidelines(audience: UserPreferences['audience']): string {
    const guidelines = {
      developers: {
        focus: 'technical accuracy, implementation details, and developer workflow impact',
        language: 'precise technical terminology, code references, and architectural considerations',
        priorities: 'functionality, performance, compatibility, and technical debt reduction',
        avoid: 'marketing speak, oversimplification, or business jargon without technical context'
      },
      business: {
        focus: 'business value, ROI, competitive advantages, and strategic impact',
        language: 'business terminology, metrics, and outcome-focused descriptions',
        priorities: 'revenue impact, efficiency gains, market positioning, and user satisfaction',
        avoid: 'excessive technical details, jargon without business context, or feature lists without value'
      },
      users: {
        focus: 'user experience improvements, new capabilities, and practical benefits',
        language: 'clear, jargon-free explanations with relatable examples',
        priorities: 'usability, accessibility, time savings, and problem resolution',
        avoid: 'technical implementation details, business metrics, or developer-focused content'
      },
      mixed: {
        focus: 'balanced coverage of technical capabilities and business value',
        language: 'accessible explanations with technical depth where relevant',
        priorities: 'comprehensive understanding for diverse stakeholders',
        avoid: 'assuming uniform technical knowledge or business context'
      },
      executives: {
        focus: 'strategic impact, competitive positioning, and organizational benefits',
        language: 'executive-level terminology focusing on outcomes and implications',
        priorities: 'business transformation, risk mitigation, and strategic advantage',
        avoid: 'granular technical details, feature-level descriptions, or operational minutiae'
      }
    }

    const guide = guidelines[audience]
    
    return `AUDIENCE GUIDELINES:
Target Audience: ${audience.charAt(0).toUpperCase() + audience.slice(1)}

Focus Areas: ${guide.focus}
Language Style: ${guide.language}
Content Priorities: ${guide.priorities}
Avoid: ${guide.avoid}

Tailor every sentence to serve this audience's specific needs and knowledge level.`
  }

  /**
   * Build tone-specific instructions
   */
  private static buildToneInstructions(tone: UserPreferences['tone']): string {
    const toneMap = {
      professional: {
        characteristics: 'authoritative, polished, and business-appropriate',
        voice: 'confident and competent without being overly formal',
        structure: 'well-organized with clear hierarchy and logical flow',
        language: 'precise, professional vocabulary with industry-standard terminology'
      },
      casual: {
        characteristics: 'approachable, conversational, and friendly',
        voice: 'warm and personable while maintaining credibility',
        structure: 'natural flow with conversational transitions',
        language: 'everyday language with minimal jargon, contractions welcome'
      },
      technical: {
        characteristics: 'precise, detailed, and technically accurate',
        voice: 'authoritative and methodical with deep technical insight',
        structure: 'systematic and comprehensive with technical depth',
        language: 'technical terminology, specifications, and implementation details'
      },
      enthusiastic: {
        characteristics: 'energetic, positive, and engaging',
        voice: 'excited about improvements while maintaining professionalism',
        structure: 'dynamic flow with emphasis on benefits and positive impact',
        language: 'active voice, positive framing, and benefit-focused descriptions'
      },
      formal: {
        characteristics: 'structured, official, and ceremonial',
        voice: 'dignified and authoritative with institutional weight',
        structure: 'traditional format with formal conventions',
        language: 'formal vocabulary, complete sentences, and official terminology'
      }
    }

    const toneGuide = toneMap[tone]
    
    return `TONE INSTRUCTIONS:
Writing Tone: ${tone.charAt(0).toUpperCase() + tone.slice(1)}

Characteristics: ${toneGuide.characteristics}
Voice: ${toneGuide.voice}
Structure: ${toneGuide.structure}
Language: ${toneGuide.language}

Every sentence should embody this tone while serving your audience's needs.`
  }

  /**
   * Build format-specific specifications
   */
  private static buildFormatSpecifications(preferences: UserPreferences): string {
    const formatSpecs = {
      markdown: {
        structure: 'Use proper markdown hierarchy (# ## ###) for headings',
        formatting: 'Use **bold** for emphasis, *italics* for subtle emphasis, `code` for technical terms',
        lists: 'Use - for unordered lists, 1. for ordered lists',
        links: 'Format links as [text](url) when referencing external resources'
      },
      html: {
        structure: 'Use semantic HTML tags (h1, h2, h3) for proper hierarchy',
        formatting: 'Use <strong> for emphasis, <em> for subtle emphasis, <code> for technical terms',
        lists: 'Use <ul>/<li> for unordered lists, <ol>/<li> for ordered lists',
        links: 'Format links as <a href="url">text</a> when referencing external resources'
      }
    }

    const specs = formatSpecs[preferences.output_format]
    
    let formatInstructions = `FORMAT SPECIFICATIONS:
Output Format: ${preferences.output_format.toUpperCase()}

${specs.structure}
${specs.formatting}
${specs.lists}
${specs.links}`

    if (preferences.include_emojis) {
      formatInstructions += `\nEmojis: Use relevant emojis strategically to enhance readability and engagement`
    }

    if (preferences.include_metrics) {
      formatInstructions += `\nMetrics: Include specific numbers, percentages, and measurable improvements when available`
    }

    const brevityMap = {
      concise: 'Keep descriptions brief and focused - aim for 1-2 sentences per point',
      detailed: 'Provide comprehensive explanations with context and implications',
      comprehensive: 'Include thorough coverage with examples, context, and detailed explanations'
    }

    if (preferences.brevity_level) {
      formatInstructions += `\nBrevity: ${brevityMap[preferences.brevity_level]}`
    }

    return formatInstructions
  }

  /**
   * Build quality standards
   */
  private static buildQualityStandards(context: PromptContext): string {
    return `QUALITY STANDARDS:

Accuracy: Every statement must be factually correct and verifiable
Clarity: Complex concepts should be explained in accessible terms for your audience
Completeness: Cover all significant aspects without overwhelming detail
Consistency: Maintain uniform style, terminology, and structure throughout
Value Focus: Every item should clearly communicate benefit or impact to users

Content Requirements:
- Lead with the most important information
- Group related changes logically
- Use parallel structure for similar items
- Include context for why changes matter
- Maintain positive framing while being honest about challenges`
  }

  /**
   * Build output constraints
   */
  private static buildOutputConstraints(preferences: UserPreferences): string {
    return `OUTPUT CONSTRAINTS:

Structure: Organize content with clear sections and logical hierarchy
Length: Provide appropriate detail level for your audience without unnecessary verbosity
Language: Use ${preferences.language || 'English'} throughout
Formatting: Strictly follow ${preferences.output_format.toUpperCase()} formatting requirements

Quality Checklist:
✓ Content serves the target audience's specific needs
✓ Tone is consistent with specified style
✓ Format follows technical specifications
✓ Information is accurate and valuable
✓ Structure supports easy scanning and comprehension

Do not include meta-commentary about the prompt or your process. Focus entirely on creating valuable content.`
  }

  /**
   * Generate user prompt template for specific content types
   */
  static generateUserPromptTemplate(contentType: PromptContext['content_type']): string {
    const templates = {
      release_notes: `Create release notes for the following changes:

{changes}

Additional context:
{additional_context}

Focus on the value and impact of these changes for users.`,

      feature_announcement: `Create a feature announcement for:

{feature_details}

Context:
{additional_context}

Highlight the benefits and use cases for this new capability.`,

      bug_fix: `Create communication about the following bug fixes:

{fixes}

Context:
{additional_context}

Focus on the problems resolved and improvements users will experience.`,

      security_update: `Create communication about these security updates:

{security_changes}

Context:
{additional_context}

Balance transparency with appropriate security considerations.`
    }

    return templates[contentType] || templates.release_notes
  }
}

/**
 * Utility function to build complete prompt context from database data
 */
export async function buildPromptContext(
  organizationData: any,
  aiContextData: any,
  contentType: PromptContext['content_type'] = 'release_notes'
): Promise<PromptContext> {
  
  const organization: OrganizationContext = {
    id: organizationData.id,
    name: organizationData.name,
    slug: organizationData.slug,
    meta_description: organizationData.meta_description,
    brand_color: organizationData.brand_color,
    settings: organizationData.settings || {}
  }

  const preferences: UserPreferences = {
    tone: aiContextData.tone || 'professional',
    audience: aiContextData.audience || 'mixed',
    output_format: aiContextData.output_format || 'markdown',
    language: aiContextData.language || 'English',
    include_emojis: aiContextData.include_emojis || false,
    include_metrics: aiContextData.include_metrics || true,
    brevity_level: aiContextData.brevity_level || 'detailed'
  }

  return {
    organization,
    preferences,
    content_type: contentType,
    template_style: aiContextData.template_style
  }
}

/**
 * Main function to generate complete system prompt
 */
export async function generateProfessionalSystemPrompt(
  organizationData: any,
  aiContextData: any,
  contentType: PromptContext['content_type'] = 'release_notes'
): Promise<string> {
  
  const context = await buildPromptContext(organizationData, aiContextData, contentType)
  return ProfessionalPromptEngine.generateSystemPrompt(context)
}