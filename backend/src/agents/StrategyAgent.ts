import { BaseAgent } from './BaseAgent';
import { TrendData } from './TrendAgent';
import { logger } from '../utils/logger';

export interface Strategy {
  hook: string;
  angle: string;
  structure: 'PAS' | 'AIDA' | 'Listicle' | 'Story' | 'Contra';
  keywords: string[];
  targetAudience: string;
  callToAction: string;
  emotionalTrigger: string;
}

export class StrategyAgent extends BaseAgent {
  async developStrategy(topic: string, trendData: TrendData, persona: any): Promise<Strategy> {
    logger.info(`[StrategyAgent] Developing strategy for: ${topic}`);

    const prompt = `Develop a "Viral LinkedIn Strategy" for a post about "${topic}".

    Target Audience Profile:
    ${persona ? JSON.stringify(persona) : 'General Professional Audience'}

    Trend Insights:
    ${JSON.stringify(trendData)}

    Your Goal: maximize engagement (likes, comments, shares) and dwell time.

    Tasks:
    1. Create a "Scroll-Stopping Hook" (first 1-2 lines). It must be controversial, surprising, or deeply relatable.
    2. Choose the best structure (e.g., PAS: Problem-Agitation-Solution, AIDA: Attention-Interest-Desire-Action, Storytelling, Contrarian View).
    3. Identify 3-5 keywords for LinkedIn algorithm ranking.
    4. Define the primary emotional trigger (e.g., Fear of Missing Out, Professional Validation, Anger/Frustration with status quo).
    5. Craft a specific Call to Action (CTA) that encourages *comments* (not just likes).

    Return JSON:
    {
      "hook": "The exact first 2 lines of the post",
      "angle": "Brief description of the unique perspective",
      "structure": "PAS",
      "keywords": ["keyword1", "keyword2"],
      "targetAudience": "Description of who this is for",
      "callToAction": "Specific question or instruction for the reader",
      "emotionalTrigger": "The core emotion"
    }`;

    return this.generateJSON<Strategy>(prompt);
  }
}
