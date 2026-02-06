import { GoogleGenerativeAI } from '@google/generative-ai';
import { Persona } from '@prisma/client';
import { PersonaService } from './personaService';
import { ResearchService } from './researchService';
import { logger } from '../utils/logger';

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
 * 1. Research Agent - Gathers data from multiple sources
 * 2. Writing Agent - Creates platform-optimized content
 * 3. Editing Agent - Polishes for maximum engagement
 * 4. Fact Checker - Verifies claims with sources
 */
export class ContentGenerationService {
  private researchService: ResearchService;

  constructor() {
    this.researchService = new ResearchService();
  }

  /**
   * Main content generation method
   * Orchestrates all agents
   */
  async generateContent(options: ContentGenerationOptions): Promise<GeneratedContent> {
    const { topic, contentType, persona, outline, researchDepth, includeImages } = options;

    try {
      // Step 1: Research Agent
      logger.info(`[Research Agent] Starting research for: ${topic}`);
      const researchData = await this.researchAgent(topic, researchDepth);

      // Step 2: Writing Agent
      logger.info(`[Writing Agent] Creating content`);
      const draft = await this.writingAgent({
        topic,
        contentType,
        persona,
        outline,
        researchData,
      });

      // Step 3: Editing Agent
      logger.info(`[Editing Agent] Optimizing content`);
      const edited = await this.editingAgent(draft, contentType);

      // Step 4: Fact Checker Agent
      logger.info(`[Fact Checker] Verifying claims`);
      const verified = await this.factCheckAgent(edited, researchData.sources);

      // Generate images if requested
      let images: string[] = [];
      let imagePrompts: string[] = [];
      if (includeImages && verified.imagePrompts) {
        imagePrompts = verified.imagePrompts;
        // Images will be generated separately via the images API
      }

      // Predict engagement
      const engagementPrediction = await this.predictEngagement(verified.content, contentType);

      return {
        title: verified.title,
        content: verified.content,
        outline: verified.outline,
        researchData,
        sources: verified.sources,
        images,
        imagePrompts,
        engagementPrediction,
      };
    } catch (error) {
      logger.error('Content generation error:', error);
      throw error;
    }
  }

  /**
   * Research Agent
   * Gathers data from multiple sources
   */
  private async researchAgent(topic: string, depth: 'quick' | 'deep'): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Research the topic: "${topic}"

Tasks:
1. Find latest statistics and data (with sources)
2. Identify expert opinions and thought leaders
3. Locate case studies or real-world examples
4. Find relevant research papers or industry reports
5. Identify common misconceptions
6. Find trending subtopics

${depth === 'deep' ? 'Provide comprehensive research with at least 10 sources.' : 'Provide key insights with 5-7 sources.'}

Return your findings in this JSON format:
{
  "statistics": [
    {"fact": "statistic", "source": "source name", "url": "url if available"}
  ],
  "expertOpinions": [
    {"expert": "name", "opinion": "quote", "source": "source"}
  ],
  "caseStudies": [
    {"title": "case study name", "summary": "brief description", "source": "source"}
  ],
  "sources": [
    {"title": "source name", "url": "url", "credibility": "high/medium/low"}
  ],
  "subtopics": ["subtopic1", "subtopic2"],
  "keyInsights": ["insight1", "insight2"]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        statistics: [],
        expertOpinions: [],
        caseStudies: [],
        sources: [],
        subtopics: [],
        keyInsights: [],
      };
    } catch (error) {
      logger.error('Research agent error:', error);
      return {
        statistics: [],
        expertOpinions: [],
        caseStudies: [],
        sources: [],
        subtopics: [],
        keyInsights: [],
      };
    }
  }

  /**
   * Writing Agent
   * Creates platform-optimized content
   */
  private async writingAgent(params: {
    topic: string;
    contentType: string;
    persona?: Persona | null;
    outline?: any;
    researchData: any;
  }): Promise<any> {
    const { topic, contentType, persona, outline, researchData } = params;

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      let prompt = '';

      if (persona) {
        // Use persona system prompt
        prompt = `${persona.systemPrompt}\n\n`;
      }

      prompt += `Create a LinkedIn ${contentType} about "${topic}".

Research Data:
${JSON.stringify(researchData, null, 2)}

${outline ? `Follow this outline: ${JSON.stringify(outline)}` : ''}

Content Type Requirements:
${this.getContentTypeRequirements(contentType)}

Requirements:
1. Start with an attention-grabbing hook
2. Use proper LinkedIn formatting (short paragraphs, line breaks)
3. Include 2-3 relevant emojis strategically
4. Incorporate research data naturally
5. Share unique insights or perspectives
6. Include 3-5 key takeaways
7. End with a compelling call-to-action
8. Total length: ${this.getContentLength(contentType)}

Also provide:
- A title for this content
- 2-3 image generation prompts that match the visual style
- An outline of the content structure

Return in JSON format:
{
  "title": "Content Title",
  "content": "Full LinkedIn content",
  "outline": {"sections": [...]},
  "imagePrompts": ["prompt1", "prompt2"]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        title: topic,
        content: text,
        outline: {},
        imagePrompts: [],
      };
    } catch (error) {
      logger.error('Writing agent error:', error);
      return {
        title: topic,
        content: 'Error generating content.',
        outline: {},
        imagePrompts: [],
      };
    }
  }

  /**
   * Editing Agent
   * Polishes content for maximum engagement
   */
  private async editingAgent(draft: any, contentType: string): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Edit and optimize this LinkedIn ${contentType} for maximum engagement:

ORIGINAL CONTENT:
${draft.content}

Editing Tasks:
1. Strengthen the hook (first line must stop the scroll)
2. Improve readability (shorter sentences, better flow)
3. Enhance formatting (line breaks, bullet points)
4. Optimize emoji usage (2-3 strategic placements)
5. Strengthen the call-to-action
6. Fix any grammar or spelling issues
7. Ensure tone is consistent and authentic
8. Check that key points are clear and memorable

Return the edited content in the same JSON format with improvements noted.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON or return original with edits
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...draft, ...JSON.parse(jsonMatch[0]) };
      }

      return { ...draft, content: text };
    } catch (error) {
      logger.error('Editing agent error:', error);
      return draft;
    }
  }

  /**
   * Fact Checker Agent
   * Verifies claims with sources
   */
  private async factCheckAgent(content: any, sources: any[]): Promise<any> {
    try {
      const model = genAI.getGenerativeAI({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Fact-check this LinkedIn content:

CONTENT:
${content.content}

AVAILABLE SOURCES:
${JSON.stringify(sources, null, 2)}

Tasks:
1. Identify all factual claims in the content
2. Verify each claim against available sources
3. Flag any unverifiable claims
4. Suggest replacements for questionable claims
5. Ensure all statistics have sources

Return in JSON format:
{
  "verified": true/false,
  "claims": [
    {"claim": "...", "verified": true/false, "source": "..."}
  ],
  "suggestedChanges": ["..."],
  "content": "updated content if changes needed"
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const factCheck = JSON.parse(jsonMatch[0]);
        return {
          ...content,
          ...factCheck,
          sources: sources,
        };
      }

      return { ...content, sources };
    } catch (error) {
      logger.error('Fact check agent error:', error);
      return { ...content, sources };
    }
  }

  /**
   * Predict engagement score
   */
  private async predictEngagement(content: string, contentType: string): Promise<number> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Analyze this LinkedIn ${contentType} and predict its engagement potential:

CONTENT:
${content}

Rate on a scale of 0-100 based on:
- Hook strength (0-25)
- Value provided (0-25)
- Readability (0-25)
- Call-to-action (0-25)

Return only a number between 0-100.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const score = parseInt(response.text().match(/\d+/)?.[0] || '50');

      return Math.min(100, Math.max(0, score));
    } catch (error) {
      logger.error('Engagement prediction error:', error);
      return 50;
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

  /**
   * Get content type requirements
   */
  private getContentTypeRequirements(contentType: string): string {
    const requirements: Record<string, string> = {
      post: `- 150-300 words
- Single topic focus
- Strong personal perspective
- Engaging hook in first line`,
      carousel: `- 8-12 slides
- One key point per slide
- Visual-first approach
- First slide is the hook
- Each slide: headline + 1-2 sentences`,
      article: `- 800-1500 words
- Comprehensive coverage
- Clear structure with headings
- Include introduction and conclusion
- Multiple sections with subheadings`,
      poll: `- Question format
- 2-4 options
- Encourages engagement
- Follow-up in comments`,
    };

    return requirements[contentType] || requirements.post;
  }

  /**
   * Get content length based on type
   */
  private getContentLength(contentType: string): string {
    const lengths: Record<string, string> = {
      post: '150-300 words',
      carousel: '50-80 words per slide',
      article: '800-1500 words',
      poll: '1 question + 2-4 options',
    };

    return lengths[contentType] || '150-300 words';
  }
}
