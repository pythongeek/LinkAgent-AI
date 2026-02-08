import { BaseAgent } from './BaseAgent';
import { ResearchData } from './ResearchAgent';
import { Strategy } from './StrategyAgent';
import { Persona } from '@prisma/client';
import { logger } from '../utils/logger';

export interface ContentDraft {
  title: string;
  content: string;
  imagePrompts: string[];
}

export class WriterAgent extends BaseAgent {
  async draftContent(
    topic: string,
    strategy: Strategy,
    research: ResearchData,
    persona?: Persona | null
  ): Promise<ContentDraft> {
    logger.info(`[WriterAgent] Drafting content for: ${topic}`);

    const prompt = `Write a viral LinkedIn post about "${topic}" based on the following strategy and research.

    STRATEGY:
    ${JSON.stringify(strategy, null, 2)}

    RESEARCH:
    ${JSON.stringify(research, null, 2)}

    PERSONA / VOICE:
    ${persona ? persona.systemPrompt : 'Professional, insightful, and authentic voice.'}

    REQUIREMENTS:
    1. Hook: Use the hook from the Strategy exactly or improve it slightly for maximum punch.
    2. Structure: Follow the ${strategy.structure} structure strictly.
    3. Formatting: Use short paragraphs (1-2 sentences), bullet points, and 2-3 emojis.
    4. Integration: Incorporate at least 1 statistic and 1 expert opinion from research naturally.
    5. Ending: End with the specific Call to Action defined in the Strategy.
    6. Tone: Must be conversational yet authoritative. No corporate jargon ("synergy", "paradigm shift").
    7. Length: 150-300 words (optimized for mobile).
    8. Keywords: Naturally include the keywords: ${strategy.keywords.join(', ')}.

    Also generate 2-3 prompts for an AI image generator to create a relevant visual.

    Return JSON:
    {
      "title": "Compelling Title",
      "content": "Full post text here...",
      "imagePrompts": ["A minimalist illustration of...", "A futuristic concept of..."]
    }`;

    return this.generateJSON<ContentDraft>(prompt);
  }
}
