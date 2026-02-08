import { BaseAgent } from './BaseAgent';
import { logger } from '../utils/logger';

export interface ResearchData {
  statistics: { fact: string; source: string; url?: string }[];
  expertOpinions: { expert: string; opinion: string; source: string }[];
  caseStudies: { title: string; summary: string; source: string }[];
  sources: { title: string; url: string; credibility: string }[];
  subtopics: string[];
  keyInsights: string[];
}

export class ResearchAgent extends BaseAgent {
  async conductResearch(topic: string, depth: 'quick' | 'deep'): Promise<ResearchData> {
    logger.info(`[ResearchAgent] Conducting research for: ${topic} (${depth})`);

    const prompt = `Conduct comprehensive research on the topic: "${topic}" for a professional LinkedIn audience.

    Research Depth: ${depth}

    Objective: Find verifiable facts, surprising statistics, and credible expert opinions that will make the content authoritative and shareable.

    Tasks:
    1. Find 3-5 specific, quantifiable statistics (e.g., "78% of marketers...").
    2. Identify 2-3 expert quotes or thought leadership perspectives.
    3. Look for recent case studies or real-world examples.
    4. Provide sources for all claims.
    5. Identify key insights that challenge common wisdom.

    Return JSON format:
    {
      "statistics": [
        {"fact": "statistic text", "source": "source name", "url": "url if known"}
      ],
      "expertOpinions": [
        {"expert": "name", "opinion": "summary of opinion", "source": "source"}
      ],
      "caseStudies": [
        {"title": "title", "summary": "brief summary", "source": "source"}
      ],
      "sources": [
        {"title": "source name", "url": "url", "credibility": "High/Medium"}
      ],
      "subtopics": ["related subtopic 1", "subtopic 2"],
      "keyInsights": ["insight 1", "insight 2"]
    }`;

    return this.generateJSON<ResearchData>(prompt);
  }
}
