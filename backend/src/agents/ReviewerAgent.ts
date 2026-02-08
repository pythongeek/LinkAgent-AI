import { BaseAgent } from './BaseAgent';
import { ContentDraft } from './WriterAgent';
import { logger } from '../utils/logger';

interface ReviewResult {
  score: number;
  critique: string[];
  suggestions: string[];
  improvedContent?: string;
}

export class ReviewerAgent extends BaseAgent {
  async reviewDraft(draft: ContentDraft): Promise<ReviewResult> {
    logger.info(`[ReviewerAgent] Reviewing draft`);

    const prompt = `Review this LinkedIn post draft and provide a critique and score based on its potential to go viral.

    DRAFT:
    ${draft.content}

    CRITERIA (0-100 scale):
    1. Hook Strength (Is it scroll-stopping? Does it create curiosity or conflict?)
    2. Readability (Short sentences, clean formatting, easy to scan on mobile?)
    3. Value per Word (Is it concise? Does it teach something new or valuable?)
    4. Call to Action (Does it explicitly ask for engagement/comments?)
    5. Emotional Resonance (Does it make the reader feel something?)

    Tasks:
    1. Provide a specific score out of 100.
    2. List 3 specific weaknesses.
    3. Provide 3 concrete suggestions for improvement (e.g., "Change line 1 to...").
    4. **Rewrite the post** incorporating all your suggestions for maximum impact.

    Return JSON:
    {
      "score": 85,
      "critique": ["Weak hook", "Too much jargon"],
      "suggestions": ["Start with a question", "Use shorter paragraphs"],
      "improvedContent": "The rewritten, optimized version of the post..."
    }`;

    return this.generateJSON<ReviewResult>(prompt);
  }
}
