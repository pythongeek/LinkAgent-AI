import { GoogleGenerativeAI } from '@google/generative-ai';
import { Persona } from '@prisma/client';
import { PersonaService } from './personaService';
import { ResearchService } from './researchService';
import { TrendAnalyzer } from './trendAnalyzer';
import { LinkedInScraper } from './linkedinScraper';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ContentGenerationOptions {
  topic: string;
  contentType: 'post' | 'carousel' | 'article' | 'poll';
  persona?: Persona | null;
  outline?: any;
  researchDepth: 'quick' | 'deep';
  includeImages: boolean;
  targetAudience?: string;
  keywords?: string[];
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
  seoScore: number;
  hookSuggestions: string[];
  bestPostingTime: string;
  linkedinOptimization: any;
  competitiveAnalysis: any;
}

export interface ContentSuggestion {
  title: string;
  angle: string;
  outline: any;
  format: string;
  targetAudience: string;
}

/**
 * Enhanced Multi-Agent Content Generation System for LinkedIn Ranking
 * 
 * Agents:
 * 1. Research Agent - Gathers real-time data from multiple sources
 * 2. Trend Agent - Analyzes LinkedIn trends and hashtags
 * 3. Competitor Analysis Agent - Studies top-performing posts
 * 4. SEO/Keywords Agent - Optimizes for discoverability
 * 5. Hook Specialist Agent - Creates scroll-stopping hooks
 * 6. Content Writer Agent - Creates platform-optimized content
 * 7. Editing Agent - Polishes for maximum engagement
 * 8. Fact Checker Agent - Verifies claims with sources
 * 9. Visual Agent - Creates compelling images
 * 10. Timing Agent - Determines best posting times
 * 11. Engagement Predictor Agent - Predicts performance
 */
export class ContentGenerationService {
  private researchService: ResearchService;
  private trendAnalyzer: TrendAnalyzer;
  private linkedinScraper: LinkedInScraper;

  constructor() {
    this.researchService = new ResearchService();
    this.trendAnalyzer = new TrendAnalyzer();
    this.linkedinScraper = new LinkedInScraper();
  }

  /**
   * Main content generation method - orchestrates all agents
   */
  async generateContent(options: ContentGenerationOptions): Promise<GeneratedContent> {
    const { topic, contentType, persona, outline, researchDepth, includeImages, targetAudience, keywords } = options;

    try {
      // Phase 1: Research, Trend Analysis & Timing (Parallel)
      logger.info(`[Phase 1] Research, Trend Analysis & Timing for: ${topic}`);
      
      const [researchData, trendData, competitiveAnalysis, bestPostingTime] = await Promise.all([
        this.researchAgent(topic, researchDepth),
        this.trendAgent(topic),
        this.competitorAnalysisAgent(topic),
        this.timingAgent(targetAudience),
      ]);

      // Phase 2: SEO & Keywords
      logger.info(`[Phase 2] SEO Optimization`);
      const seoData = await this.seoAgent(topic, keywords || [], researchData);

      // Phase 3: Hook Generation (Multiple hooks for A/B testing)
      logger.info(`[Phase 3] Hook Generation`);
      const hookSuggestions = await this.hookAgent(topic, researchData, persona);

      // Phase 4: Content Writing with best hook
      logger.info(`[Phase 4] Content Writing`);
      const draft = await this.writingAgent({
        topic,
        contentType,
        persona,
        outline,
        researchData,
        seoData,
        bestHook: hookSuggestions[0],
        targetAudience,
      });

      // Phase 5: Editing for engagement
      logger.info(`[Phase 5] Editing & Optimization`);
      const edited = await this.editingAgent(draft, contentType, seoData);

      // Phase 6: Fact Checking
      logger.info(`[Phase 6] Fact Checking`);
      const verified = await this.factCheckAgent(edited, researchData.sources);

      // Phase 7 & 9: Visual Content & Engagement Prediction (Parallel)
      logger.info(`[Phase 7 & 9] Visual Content & Engagement Prediction`);

      const visualContentPromise = includeImages
        ? this.visualAgent(topic, verified.content, persona)
        : Promise.resolve([]);

      const engagementPredictionPromise = this.engagementPredictorAgent(verified.content, contentType, hookSuggestions);

      const [imagePrompts, engagementData] = await Promise.all([
        visualContentPromise,
        engagementPredictionPromise,
      ]);

      return {
        title: verified.title,
        content: verified.content,
        outline: verified.outline,
        researchData,
        sources: verified.sources,
        images: [],
        imagePrompts,
        engagementPrediction: engagementData.score,
        seoScore: seoData.score,
        hookSuggestions,
        bestPostingTime,
        linkedinOptimization: {
          hashtags: seoData.hashtags,
          keywords: seoData.keywords,
          mentions: seoData.mentions,
          formattedContent: verified.formattedContent,
        },
        competitiveAnalysis,
      };
    } catch (error) {
      logger.error('Content generation error:', error);
      throw error;
    }
  }

  // ==================== AGENT IMPLEMENTATIONS ====================

  /**
   * Research Agent - Enhanced with real-time data gathering
   */
  private async researchAgent(topic: string, depth: 'quick' | 'deep'): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Research the topic: "${topic}" thoroughly for LinkedIn content.

Tasks:
1. Find latest statistics and data (2024-2025 preferred, with sources)
2. Identify expert opinions and thought leaders in this space
3. Locate case studies or real-world examples with numbers
4. Find relevant research papers or industry reports
5. Identify common misconceptions and debunk them
6. Find trending subtopics and angles
7. Get current market size and growth projections
8. Find recent news (last 30 days)

${depth === 'deep' ? 'Provide comprehensive research with 15+ sources, 5+ statistics with citations, 3+ case studies.' : 'Provide key insights with 7-10 sources, 3+ statistics with citations.'}

Return JSON format:
{
  "statistics": [{"fact": "...", "value": "...", "source": "...", "url": "...", "date": "..."}],
  "expertOpinions": [{"expert": "...", "opinion": "...", "source": "...", "profile": "..."}],
  "caseStudies": [{"company": "...", "results": "...", "metrics": "...", "source": "..."}],
  "researchPapers": [{"title": "...", "authors": "...", "year": "...", "url": "..."}],
  "newsItems": [{"headline": "...", "source": "...", "date": "...", "url": "..."}],
  "misconceptions": [...],
  "subtopics": [...],
  "keyInsights": [...],
  "marketData": {"size": "...", "growth": "...", "source": "..."},
  "sources": [{"title": "...", "url": "...", "credibility": "high/medium/low"}]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return this.getEmptyResearch();
    } catch (error) {
      logger.error('Research agent error:', error);
      return this.getEmptyResearch();
    }
  }

  private getEmptyResearch() {
    return {
      statistics: [],
      expertOpinions: [],
      caseStudies: [],
      researchPapers: [],
      newsItems: [],
      misconceptions: [],
      subtopics: [],
      keyInsights: [],
      marketData: {},
      sources: [],
    };
  }

  /**
   * Trend Agent - Analyzes LinkedIn trends and suggests hashtags
   */
  private async trendAgent(topic: string): Promise<any> {
    try {
      // Get Google Trends data
      const trendData = await this.trendAnalyzer.getTrendData(topic);
      
      // Get trending topics for context
      const trendingTopics = await this.trendAnalyzer.getTrendingTopics('business', 10);

      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Analyze trends for LinkedIn content about: "${topic}"

TREND DATA:
${JSON.stringify(trendData, null, 2)}

TRENDING TOPICS:
${JSON.stringify(trendingTopics, null, 2)}

Return JSON:
{
  "trendingAngles": [{"angle": "...", "momentum": 0-100}],
  "recommendedHashtags": ["#...", "#...", "#..."],
  "relatedTopics": [...],
  "contentOpportunities": [...],
  "timingRecommendation": "...",
  "viralityScore": 0-100
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return { trendingAngles: [], recommendedHashtags: [], relatedTopics: [], contentOpportunities: [] };
    } catch (error) {
      logger.error('Trend agent error:', error);
      return { trendingAngles: [], recommendedHashtags: [], relatedTopics: [], contentOpportunities: [] };
    }
  }

  /**
   * Competitor Analysis Agent - Studies top-performing posts
   */
  private async competitorAnalysisAgent(topic: string): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Analyze what makes top-performing LinkedIn content about "${topic}" successful.

Consider:
1. Common patterns in viral posts about this topic
2. What hooks work best
3. Optimal content length
4. Best formats (text, carousel, video, article)
5. Common mistakes to avoid
6. Engagement drivers

Return JSON:
{
  "winningFormats": [...],
  "effectiveHooks": [...],
  "avoidMistakes": [...],
  "engagementDrivers": [...],
  "optimalLength": "...",
  "bestPractices": [...],
  "benchmarkPosts": [{"description": "...", "whyItWorked": "..."}]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return { winningFormats: [], effectiveHooks: [], avoidMistakes: [], engagementDrivers: [] };
    } catch (error) {
      logger.error('Competitor analysis agent error:', error);
      return { winningFormats: [], effectiveHooks: [], avoidMistakes: [], engagementDrivers: [] };
    }
  }

  /**
   * SEO/Keywords Agent - Optimizes for discoverability
   */
  private async seoAgent(topic: string, userKeywords: string[], researchData: any): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      // Extract keywords from research
      const researchKeywords = researchData.subtopics || [];
      const allKeywords = [...new Set([...userKeywords, ...researchKeywords])];

      const prompt = `Create SEO optimization for LinkedIn content about "${topic}"

TOPICS/CONTEXT:
${JSON.stringify(researchData.keyInsights, null, 2)}

ALREADY TARGETED KEYWORDS:
${JSON.stringify(allKeywords, null, 2)}

LinkedIn SEO is different from Google. Focus on:
1. Keywords people search on LinkedIn
2. Hashtags (3-5 relevant, 1 broad, 2-3 specific)
3. Industry-specific terms
4. Job titles and roles
5. Problems and solutions

Return JSON:
{
  "keywords": [{"keyword": "...", "priority": "high/medium/low", "searchVolume": "..."}],
  "hashtags": [...],
  "mentions": [...],
  "seoScore": 0-100,
  "titleOptimization": "...",
  "descriptionOptimization": "...",
  "linkedinSpecificTips": [...]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return { keywords: [], hashtags: [], mentions: [], seoScore: 50 };
    } catch (error) {
      logger.error('SEO agent error:', error);
      return { keywords: [], hashtags: [], mentions: [], seoScore: 50 };
    }
  }

  /**
   * Hook Specialist Agent - Creates multiple scroll-stopping hooks
   */
  private async hookAgent(topic: string, researchData: any, persona?: Persona | null): Promise<string[]> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const personaContext = persona ? `Write in the voice of ${persona.name}: ` : '';

      const prompt = `${personaContext}Create 5 different attention-grabbing hooks for a LinkedIn post about "${topic}"

RESEARCH CONTEXT:
${JSON.stringify(researchData.keyInsights?.slice(0, 5), null, 2)}

Effective LinkedIn hooks use:
1. Bold claims or statistics
2. Personal stories
3. Contrarian viewpoints
4. How-to or actionable tips
5. Questions that spark curiosity
6. Numbers and data
7. Vulnerability or struggle

Return ONLY a JSON array of strings:
["Hook 1...", "Hook 2...", "Hook 3...", "Hook 4...", "Hook 5..."]`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback hooks
      return [
        `🚨 ${topic}: Here's what nobody tells you`,
        `I spent weeks researching ${topic}. Here's what I found:`,
        `${topic} is changing fast. Here's why it matters:`,
        `Most people get ${topic} wrong. Here's the right way:`,
        `If you're not talking about ${topic}, you're missing out.`,
      ];
    } catch (error) {
      logger.error('Hook agent error:', error);
      return [`Here's the truth about ${topic}:`, `Let's talk about ${topic}.`, `${topic} is the future.`];
    }
  }

  /**
   * Content Writer Agent - Creates platform-optimized content
   */
  private async writingAgent(params: {
    topic: string;
    contentType: string;
    persona?: Persona | null;
    outline?: any;
    researchData: any;
    seoData: any;
    bestHook: string;
    targetAudience?: string;
  }): Promise<any> {
    const { topic, contentType, persona, outline, researchData, seoData, bestHook, targetAudience } = params;

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      let prompt = '';

      if (persona) {
        prompt = `${persona.systemPrompt}\n\n`;
      }

      prompt += `Create a LinkedIn ${contentType} about "${topic}".

USE THIS HOOK (must be first line):
${bestHook}

TARGET AUDIENCE: ${targetAudience || 'Professionals interested in this topic'}

RESEARCH DATA:
${JSON.stringify(researchData, null, 2)}

SEO REQUIREMENTS:
- Keywords: ${seoData.keywords?.map((k: any) => k.keyword).join(', ')}
- Hashtags: ${seoData.hashtags?.join(' ')}

${outline ? `FOLLOW THIS OUTLINE: ${JSON.stringify(outline)}` : ''}

CONTENT TYPE REQUIREMENTS:
${this.getContentTypeRequirements(contentType)}

STRUCTURE:
1. Hook (already provided) - Make it bold!
2. Problem/Stakes - Why should readers care?
3. Solution/Insight - What did you find/learn?
4. Evidence - Support with research data
5. Key Takeaways - 3-5 actionable points
6. Call-to-Action - Engage readers

Format for LinkedIn:
- Short paragraphs (1-3 sentences max)
- Strategic line breaks
- 2-3 emojis for visual breaks
- Bold text for emphasis
- Bullet points for lists

Return JSON:
{
  "title": "Compelling title (max 150 chars)",
  "content": "Full content with hook as first line",
  "outline": {"sections": [...]},
  "formattedContent": "Same content with **bold** formatting added"
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return { title: topic, content: text, outline: {}, formattedContent: text };
    } catch (error) {
      logger.error('Writing agent error:', error);
      return { title: topic, content: 'Error generating content.', outline: {}, formattedContent: '' };
    }
  }

  /**
   * Editing Agent - Optimizes for maximum engagement
   */
  private async editingAgent(draft: any, contentType: string, seoData: any): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Edit and optimize this LinkedIn ${contentType} for MAXIMUM engagement and LinkedIn algorithm favor.

ORIGINAL CONTENT:
${draft.content}

FORMATTED CONTENT (with bold):
${draft.formattedContent}

SEO DATA:
${JSON.stringify(seoData, null, 2)}

Editing Tasks:
1. Strengthen the hook (first line must stop the scroll)
2. Improve readability (shorter sentences, better flow)
3. Enhance formatting (line breaks, bullet points)
4. Optimize emoji usage (strategic, not excessive)
5. Strengthen the call-to-action
6. Add emotional triggers (curiosity, urgency, FOMO)
7. Ensure the first 3 lines are compelling (LinkedIn shows this in preview)
8. Add 3-5 relevant hashtags at the end
9. Check for "clickbait" promises vs delivery
10. Ensure authentic voice (avoid corporate speak)

Return JSON:
{
  "content": "Edited content",
  "formattedContent": "Content with **bold** formatting",
  "improvements": [...],
  "engagementTips": [...]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...draft, ...JSON.parse(jsonMatch[0]) };
      }

      return draft;
    } catch (error) {
      logger.error('Editing agent error:', error);
      return draft;
    }
  }

  /**
   * Fact Checker Agent - Verifies claims with sources
   */
  private async factCheckAgent(content: any, sources: any[]): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Fact-check this LinkedIn content:

CONTENT:
${content.content}

AVAILABLE SOURCES:
${JSON.stringify(sources, null, 2)}

Tasks:
1. Identify all factual claims (statistics, percentages, dates, names)
2. Verify each claim against sources
3. Flag any claims that can't be verified
4. Suggest alternatives for questionable claims
5. Ensure all statistics have sources

Return JSON:
{
  "verified": true/false,
  "claims": [{"claim": "...", "verified": true/false, "sourceMatch": "...", "confidence": 0-100}],
  "unverifiedClaims": [...],
  "suggestedChanges": [...],
  "content": "Updated content with verified claims only",
  "disclaimer": "Optional: Add note about sources if needed"
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const factCheck = JSON.parse(jsonMatch[0]);
        return { ...content, ...factCheck, sources };
      }

      return { ...content, verified: true, sources };
    } catch (error) {
      logger.error('Fact check agent error:', error);
      return { ...content, verified: false, sources };
    }
  }

  /**
   * Visual Agent - Creates compelling image prompts
   */
  private async visualAgent(topic: string, content: string, persona?: Persona | null): Promise<string[]> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const visualStyle = persona?.visualDNA ? 
        `Style: ${persona.visualDNA.style}, Colors: ${persona.visualDNA.colorScheme}, Aesthetics: ${persona.visualDNA.aesthetics}` : 
        'Style: Professional, clean, modern LinkedIn imagery';

      const prompt = `Create 3 image generation prompts for a LinkedIn post about "${topic}"

POST CONTENT SUMMARY:
${content.substring(0, 500)}

${visualStyle}

Requirements:
1. Each prompt should work with AI image generators
2. Include style, mood, colors, composition
3. Make it professional yet eye-catching
4. Text overlay optional (for quote graphics)
5. Match LinkedIn's professional aesthetic

Return JSON:
{
  "prompts": [
    "Prompt for featured image...",
    "Prompt for supporting illustration...",
    "Prompt for quote/summary graphic..."
  ]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.prompts || [];
      }

      return [`Professional illustration for ${topic}`, `Abstract representation of ${topic}`, `Data visualization for ${topic}`];
    } catch (error) {
      logger.error('Visual agent error:', error);
      return [`${topic} illustration`];
    }
  }

  /**
   * Timing Agent - Determines best posting times
   */
  private async timingAgent(targetAudience?: string): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `What's the best time to post LinkedIn content for: "${targetAudience || 'General B2B professional audience'}"?

Consider:
- Time zones (primarily US/EU/Asia?)
- Work hours vs commute times
- LinkedIn algorithm behavior
- Engagement patterns

Return JSON:
{
  "bestTimes": [
    {"day": "Tuesday", "time": "9:00 AM EST", "reason": "..."},
    {"day": "Wednesday", "time": "12:00 PM EST", "reason": "..."}
  ],
  "worstTimes": [...],
  "generalRecommendation": "..."
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.bestTimes?.[0]?.day + ' ' + parsed.bestTimes?.[0]?.time || 'Tuesday 9:00 AM EST';
      }

      return 'Tuesday 9:00 AM EST (Best overall engagement)';
    } catch (error) {
      logger.error('Timing agent error:', error);
      return 'Tuesday 9:00 AM EST';
    }
  }

  /**
   * Engagement Predictor Agent - Predicts performance
   */
  private async engagementPredictorAgent(content: string, contentType: string, hookSuggestions: string[]): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const preview = content.substring(0, 300);

      const prompt = `Analyze this LinkedIn ${contentType} and predict engagement potential:

PREVIEW (first 300 chars):
${preview}

AVAILABLE HOOKS:
${hookSuggestions.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Rate on 0-100 scale based on:
- Hook strength (0-25): Does it stop the scroll?
- Value proposition (0-25): Clear benefit to reader?
- Readability (0-25): Easy to consume?
- Emotional trigger (0-25): Creates curiosity/FOMO/action?
- Call-to-action (0-25): Clear next step?

Return JSON:
{
  "score": 0-100,
  "breakdown": {
    "hook": 0-25,
    "value": 0-25,
    "readability": 0-25,
    "emotion": 0-25,
    "cta": 0-25
  },
  "strengths": [...],
  "weaknesses": [...],
  "improvementSuggestions": [...],
  "predictedImpressions": "...",
  "predictedEngagement": "..."
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return { score: 50, breakdown: {} };
    } catch (error) {
      logger.error('Engagement predictor error:', error);
      return { score: 50, breakdown: {} };
    }
  }

  // ==================== HELPER METHODS ====================

  private getContentTypeRequirements(contentType: string): string {
    const requirements: Record<string, string> = {
      post: `- 150-300 words
- Single topic focus
- Strong personal perspective
- Engaging hook in first line
- 3-5 key takeaways
- Clear call-to-action`,
      carousel: `- 8-12 slides
- One key point per slide
- Visual-first approach
- First slide is the hook
- Each slide: headline + 1-2 sentences
- Consistent design throughout`,
      article: `- 800-1500 words
- Comprehensive coverage
- Clear structure with headings
- Include introduction and conclusion
- Multiple sections with subheadings
- Data and examples throughout`,
      poll: `- Clear question format
- 2-4 options (mix of obvious and surprising)
- Encourages engagement in comments
- Follow-up context in post
- Tags relevant people/companies`,
    };

    return requirements[contentType] || requirements.post;
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
