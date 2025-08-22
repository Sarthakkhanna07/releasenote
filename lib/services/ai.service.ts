import { getAiProvider } from '@/lib/ai';
import { AiProvider } from '@/lib/ai/types';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

export class AIService {
  private aiProvider: AiProvider;

  constructor() {
    this.aiProvider = getAiProvider();
  }

  async generate(systemPrompt: string, userPrompt: string, options?: { model?: string; maxTokens?: number; temperature?: number }): Promise<string> {
    if (!this.aiProvider) {
      throw new Error('AI provider not initialized');
    }

    // Ensure generateFromPrompts exists on the provider before calling it
    if (typeof this.aiProvider.generateFromPrompts !== 'function') {
        throw new Error('The configured AI provider does not support the required generateFromPrompts method.');
    }

    return this.aiProvider.generateFromPrompts({ systemPrompt, userPrompt }, options);
  }
}
