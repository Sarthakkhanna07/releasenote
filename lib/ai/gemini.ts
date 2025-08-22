import axios from 'axios';
import { AiProvider } from './types';
import { ProfessionalPromptEngine, buildPromptContext, type PromptContext } from './prompt-engine';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface CommitData {
  message: string;
  sha?: string;
}

export class GeminiProvider implements AiProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY not set');
    }
  }

  private async callGemini(messages: { role: string; content: string }[], maxTokens = 2000, temperature = 0.7): Promise<string> {
    type GeminiResponse = {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>
        }
      }>
    };

    const response = await axios.post<GeminiResponse>(
      `${GEMINI_API_URL}?key=${this.apiKey}`,
      {
        contents: [
          {
            parts: messages.map((m) => ({ text: m.content })),
          },
        ],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      }
    );
    const candidates = response.data?.candidates;
    const text = candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No response generated from Gemini');
    }
    return text;
  }

  async generateText(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<string> {
    const messages = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });
    return this.callGemini(messages, options?.maxTokens || 2000, options?.temperature || 0.7);
  }

  async generateReleaseNotes(
    commits: CommitData[],
    options?: {
      template?: string;
      tone?: 'professional' | 'casual' | 'technical';
      includeBreakingChanges?: boolean;
    }
  ): Promise<string> {
    const tone = options?.tone || 'professional';
    const template = options?.template || 'traditional';
    const systemPrompt = `You are an expert at writing release notes. Generate ${tone} release notes based on the provided commits and GitHub data.\n\nTemplate Style: ${template}\n- Traditional: Standard format with clear sections\n- Modern: Engaging format with emojis and visual appeal\n- Minimal: Concise bullet points\n- Technical: Detailed technical information\n\nGuidelines:\n- Focus on user-facing changes and improvements\n- Group related changes together\n- Use clear, professional language\n- Highlight breaking changes if any\n- Include relevant technical details for developers\n- Format as clean HTML that can be rendered in a rich text editor`;
    const commitsText = commits
      .map((commit) => `- ${commit.message} (${commit.sha?.substring(0, 7) || 'unknown'})`)
      .join('\n');
    const prompt = `Generate release notes for these commits:\n\n${commitsText}\n\nAdditional context:\n- Tone: ${tone}\n- Template: ${template}\n- Include breaking changes: ${options?.includeBreakingChanges ? 'Yes' : 'No'}\n\nPlease generate well-formatted release notes in HTML format.`;
    return this.generateText(prompt, {
      systemPrompt,
      maxTokens: 3000,
      temperature: 0.3,
    });
  }

  async improveContent(content: string, instructions?: string): Promise<string> {
    const systemPrompt = `You are an expert content editor. Improve the provided content while maintaining its core meaning and structure. Make it more professional, clear, and engaging.`;
    const prompt = instructions
      ? `Improve this content with these specific instructions: "${instructions}"\n\nContent:\n${content}`
      : `Improve this content:\n\n${content}`;
    return this.generateText(prompt, {
      systemPrompt,
      maxTokens: 2500,
      temperature: 0.4,
    });
  }

  async generateWithTemplate(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      template?: string;
      tone?: 'professional' | 'casual' | 'technical' | 'enthusiastic' | 'formal';
      targetAudience?: 'developers' | 'business' | 'users' | 'mixed';
      outputFormat?: 'markdown' | 'html';
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    return this.generateText(userPrompt, {
      systemPrompt,
      maxTokens: options?.maxTokens || 3000,
      temperature: options?.temperature || 0.3,
    });
  }

  async generateFromPrompt(
    prompt: string,
    options?: {
      template?: string;
      tone?: 'professional' | 'casual' | 'technical' | 'enthusiastic' | 'formal';
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    const systemPrompt = `You are an expert content writer. Generate high-quality content based on the user's prompt.\\n\\nTone: ${options?.tone || 'professional'}\\nTemplate: ${options?.template || 'traditional'}\\n\\nProvide well-structured, engaging content that matches the requested tone and style.`;
    return this.generateText(prompt, {
      systemPrompt,
      maxTokens: options?.maxTokens || 2500,
      temperature: options?.temperature || 0.4,
    });
  }

  async generateFromPrompts(
    prompts: { systemPrompt: string; userPrompt: string },
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> {
    return this.generateText(prompts.userPrompt, {
      systemPrompt: prompts.systemPrompt,
      maxTokens: options?.maxTokens || 3000,
      temperature: options?.temperature || 0.3,
    });
  }

  /**
   * NEW: Professional context-aware generation
   * Uses organization details and user preferences to create dynamic system prompts
   */
  async generateWithContext(
    userPrompt: string,
    organizationData: any,
    aiContextData: any,
    options?: {
      contentType?: 'release_notes' | 'feature_announcement' | 'bug_fix' | 'security_update';
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    try {
      // Build professional system prompt from organization and user context
      const context = await buildPromptContext(
        organizationData,
        aiContextData,
        options?.contentType || 'release_notes'
      );

      const systemPrompt = ProfessionalPromptEngine.generateSystemPrompt(context);

      // Generate content using the professional system prompt
      return this.generateText(userPrompt, {
        systemPrompt,
        maxTokens: options?.maxTokens || 3000,
        temperature: options?.temperature || 0.3,
      });
    } catch (error) {
      console.error('Context-aware generation error:', error);
      // Fallback to basic generation if context building fails
      return this.generateFromPrompt(userPrompt, {
        tone: aiContextData?.tone || 'professional',
        maxTokens: options?.maxTokens || 3000,
        temperature: options?.temperature || 0.3,
      });
    }
  }

  /**
   * NEW: Enhanced release notes generation using professional prompts
   * Replaces the old hard-coded approach with context-aware generation
   */
  async generateReleaseNotesWithContext(
    commits: CommitData[],
    organizationData: any,
    aiContextData: any,
    options?: {
      includeBreakingChanges?: boolean;
      additionalContext?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    try {
      // Format commits for the user prompt
      const commitsText = commits
        .map((commit) => `- ${commit.message} (${commit.sha?.substring(0, 7) || 'unknown'})`)
        .join('\n');

      // Build user prompt with commits and context
      let userPrompt = `Create release notes for the following changes:

${commitsText}`;

      if (options?.additionalContext) {
        userPrompt += `\n\nAdditional context:\n${options.additionalContext}`;
      }

      if (options?.includeBreakingChanges) {
        userPrompt += `\n\nNote: Please pay special attention to any breaking changes and highlight them appropriately.`;
      }

      userPrompt += `\n\nFocus on the value and impact of these changes for users.`;

      // Use context-aware generation
      return this.generateWithContext(
        userPrompt,
        organizationData,
        aiContextData,
        {
          contentType: 'release_notes',
          maxTokens: options?.maxTokens || 3000,
          temperature: options?.temperature || 0.3,
        }
      );
    } catch (error) {
      console.error('Enhanced release notes generation error:', error);
      // Fallback to original method if enhanced generation fails
      return this.generateReleaseNotes(commits, {
        tone: aiContextData?.tone || 'professional',
        template: 'traditional',
        includeBreakingChanges: options?.includeBreakingChanges,
      });
    }
  }
}

export const geminiProvider = new GeminiProvider(); 