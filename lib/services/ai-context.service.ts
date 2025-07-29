/**
 * AI Context Service
 * 
 * Handles fetching and managing organization and AI context data
 * for professional prompt generation
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export interface OrganizationData {
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

export interface AIContextData {
  id?: string
  organization_id: string
  system_prompt?: string
  user_prompt_template?: string
  tone: 'professional' | 'casual' | 'technical' | 'enthusiastic' | 'formal'
  audience: 'developers' | 'business' | 'users' | 'mixed' | 'executives'
  output_format: 'markdown' | 'html'
  language?: string
  include_emojis?: boolean
  include_metrics?: boolean
  brevity_level?: 'concise' | 'detailed' | 'comprehensive'
  example_output?: string
  created_at?: string
  updated_at?: string
}

export class AIContextService {
  
  /**
   * Get organization data for the current user
   */
  static async getOrganizationData(userId: string): Promise<OrganizationData | null> {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      
      // Get user's organization through membership
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .single()

      if (memberError || !memberData) {
        console.error('Failed to get organization membership:', memberError)
        return null
      }

      // Get organization details using your actual schema
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          slug,
          description,
          meta_description,
          brand_color,
          settings
        `)
        .eq('id', memberData.organization_id)
        .single()

      if (orgError || !orgData) {
        console.error('Failed to get organization data:', orgError)
        return null
      }

      return {
        id: orgData.id,
        name: orgData.name,
        slug: orgData.slug,
        meta_description: orgData.meta_description || orgData.description, // Use description as fallback
        brand_color: orgData.brand_color,
        settings: orgData.settings || {}
      }
    } catch (error) {
      console.error('Error fetching organization data:', error)
      return null
    }
  }

  /**
   * Get AI context data for an organization
   */
  static async getAIContextData(organizationId: string): Promise<AIContextData | null> {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      
      const { data: aiContext, error } = await supabase
        .from('ai_context')
        .select('*')
        .eq('organization_id', organizationId)
        .single()

      if (error) {
        // If no AI context exists, return default values
        if (error.code === 'PGRST116') {
          return this.getDefaultAIContext(organizationId)
        }
        console.error('Failed to get AI context:', error)
        return null
      }

      return {
        id: aiContext.id,
        organization_id: aiContext.organization_id,
        system_prompt: aiContext.system_prompt,
        user_prompt_template: aiContext.user_prompt_template,
        tone: aiContext.tone || 'professional',
        audience: aiContext.audience || 'mixed',
        output_format: aiContext.output_format || 'markdown',
        language: aiContext.language || 'English',
        include_emojis: aiContext.include_emojis || false,
        include_metrics: aiContext.include_metrics || true,
        brevity_level: aiContext.brevity_level || 'detailed',
        example_output: aiContext.example_output,
        created_at: aiContext.created_at,
        updated_at: aiContext.updated_at
      }
    } catch (error) {
      console.error('Error fetching AI context data:', error)
      return this.getDefaultAIContext(organizationId)
    }
  }

  /**
   * Get default AI context when none exists
   */
  private static getDefaultAIContext(organizationId: string): AIContextData {
    return {
      organization_id: organizationId,
      tone: 'professional',
      audience: 'mixed',
      output_format: 'markdown',
      language: 'English',
      include_emojis: false,
      include_metrics: true,
      brevity_level: 'detailed'
    }
  }

  /**
   * Get complete context for AI generation (organization + AI context)
   */
  static async getCompleteContext(userId: string): Promise<{
    organization: OrganizationData | null
    aiContext: AIContextData | null
  }> {
    const organization = await this.getOrganizationData(userId)
    
    if (!organization) {
      return { organization: null, aiContext: null }
    }

    const aiContext = await this.getAIContextData(organization.id)
    
    return { organization, aiContext }
  }

  /**
   * Create or update AI context for an organization
   */
  static async upsertAIContext(
    organizationId: string,
    contextData: Partial<AIContextData>
  ): Promise<AIContextData | null> {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      
      const { data, error } = await supabase
        .from('ai_context')
        .upsert({
          organization_id: organizationId,
          ...contextData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'organization_id'
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to upsert AI context:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error upserting AI context:', error)
      return null
    }
  }

  /**
   * Validate AI context data
   */
  static validateAIContext(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    const validTones = ['professional', 'casual', 'technical', 'enthusiastic', 'formal']
    const validAudiences = ['developers', 'business', 'users', 'mixed', 'executives']
    const validFormats = ['markdown', 'html']
    const validBrevityLevels = ['concise', 'detailed', 'comprehensive']

    if (data.tone && !validTones.includes(data.tone)) {
      errors.push(`Invalid tone. Must be one of: ${validTones.join(', ')}`)
    }

    if (data.audience && !validAudiences.includes(data.audience)) {
      errors.push(`Invalid audience. Must be one of: ${validAudiences.join(', ')}`)
    }

    if (data.output_format && !validFormats.includes(data.output_format)) {
      errors.push(`Invalid output format. Must be one of: ${validFormats.join(', ')}`)
    }

    if (data.brevity_level && !validBrevityLevels.includes(data.brevity_level)) {
      errors.push(`Invalid brevity level. Must be one of: ${validBrevityLevels.join(', ')}`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}