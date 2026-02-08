import { GoogleGenerativeAI } from '@google/generative-ai';
import { Persona } from '@prisma/client';
import { ResearchService } from './researchService';
import { logger } from '../utils/logger';
import { TrendAgent } from '../agents/TrendAgent';
import { StrategyAgent } from '../agents/StrategyAgent';
import { ResearchAgent } from '../agents/ResearchAgent';
import { WriterAgent } from '../agents/WriterAgent';
import { ReviewerAgent } from '../agents/ReviewerAgent';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ContentGenerationOptions {
  topic: string;
  contentType: 'post' | 'carousel' | 'article' | 'poll';
  persona?: Persona | null;
  outline?: any;
  researchDepth: 'quick' | 'deep';
  includeImages: boolean;
}

export interface GeneratedContent {
  title: string;
  content: string;
  outline: any;
  researchData: any;
  sources: any[];
  images?: string[];
  imagePrompts?: string[];
  engagementPrediction: number;
}

export interface ContentSuggestion {
  title: string;
  angle: string;
  outline: any;
  format: string;
  targetAudience: string;
}

/**
 * Multi-Agent Content Generation System
 * 
 * Agents:
 * 1. Trend Agent - Analyzes current trends
 * 2. Research Agent - Gathers data from multiple sources
 * 3. Strategy Agent - Develops viral strategy
 * 4. Writer Agent - Creates platform-optimized content
 * 5. Reviewer Agent - Polishes for maximum engagement
 */
export class ContentGenerationService {
  private trendAgent: TrendAgent;
  private strategyAgent: StrategyAgent;
  private researchAgent: ResearchAgent;
  private writerAgent: WriterAgent;
  private reviewerAgent: ReviewerAgent;

  constructor() {
    this.trendAgent = new TrendAgent();
    this.strategyAgent = new StrategyAgent();
    this.researchAgent = new ResearchAgent();
    this.writerAgent = new WriterAgent();
    this.reviewerAgent = new ReviewerAgent();
  }

  /**
   * Main content generation method
   * Orchestrates all agents
   */
  async generateContent(options: ContentGenerationOptions): Promise<GeneratedContent> {
    const { topic, contentType, persona, outline, researchDepth, includeImages } = options;

    try {
      // Step 1: Analyze Trends & Conduct Research (Parallel)
      logger.info(`[ContentGeneration] Step 1: Research & Trends for ${topic}`);
      const [trendData, researchData] = await Promise.all([
        this.trendAgent.analyzeTrends(topic),
        this.researchAgent.conductResearch(topic, researchDepth)
      ]);

      // Step 2: Develop Strategy
      logger.info(`[ContentGeneration] Step 2: Strategy`);
      // Use fallback if trendData is null (handled in agent but good to be safe)
      const safeTrendData = trendData || { query: topic, interestOverTime: [], relatedTopics: [], relatedQueries: [] };
      const strategy = await this.strategyAgent.developStrategy(topic, safeTrendData, persona);

      // Step 3: Write Draft
      logger.info(`[ContentGeneration] Step 3: Drafting`);
      const draft = await this.writerAgent.draftContent(topic, strategy, researchData, persona);

      // Step 4: Review & Refine
      logger.info(`[ContentGeneration] Step 4: Reviewing`);
      const review = await this.reviewerAgent.reviewDraft(draft);

      const finalContent = review.improvedContent || draft.content;

      return {
        title: draft.title,
        content: finalContent,
        outline: { strategy, review }, // Storing strategy and review in outline for visibility
        researchData,
        sources: researchData.sources,
        images: [],
        imagePrompts: draft.imagePrompts,
        engagementPrediction: review.score,
      };
    } catch (error) {
      logger.error('Content generation error:', error);
      throw error;
    }
  }

  /**
   * Generate content suggestions based on gaps
   */
  async generateSuggestions(topic: string, gaps: any): Promise<ContentSuggestion[]> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Generate 5 content ideas for LinkedIn about "${topic}" based on these content gaps:

GAPS:
${JSON.stringify(gaps, null, 2)}

For each idea, provide:
1. A compelling title
2. The unique angle/perspective
3. Content outline (3-5 key points)
4. Recommended format (post, carousel, article)
5. Target audience

Return in JSON format:
{
  "suggestions": [
    {
      "title": "...",
      "angle": "...",
      "outline": {"sections": [...]},
      "format": "post/carousel/article",
      "targetAudience": "..."
    }
  ]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.suggestions || [];
      }

      return [];
    } catch (error) {
      logger.error('Generate suggestions error:', error);
      return [];
    }
  }

  /**
   * Regenerate a specific section
   */
  async regenerateSection(content: string, section: string, instructions: string): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Regenerate this section of a LinkedIn post:

FULL CONTENT:
${content}

SECTION TO REGENERATE: ${section}

INSTRUCTIONS:
${instructions}

Provide only the regenerated section, maintaining the same tone and style.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      logger.error('Regenerate section error:', error);
      return content;
    }
  }
}
