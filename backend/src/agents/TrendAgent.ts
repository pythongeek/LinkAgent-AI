import googleTrends from 'google-trends-api';
import { BaseAgent } from './BaseAgent';
import { logger } from '../utils/logger';

export interface TrendData {
  query: string;
  interestOverTime: any[]; // Simplified for now
  relatedTopics: any[];
  relatedQueries: any[];
  insight?: string;
}

export class TrendAgent extends BaseAgent {
  constructor() {
    super();
  }

  async analyzeTrends(topic: string): Promise<TrendData | null> {
    logger.info(`[TrendAgent] Analyzing trends for: ${topic}`);

    try {
      // 1. Get Google Trends data
      const trends = await this.fetchGoogleTrends(topic);

      // 2. Synthesize with LLM for "LinkedIn Relevance"
      const synthesized = await this.synthesizeTrends(topic, trends);

      return synthesized;
    } catch (error) {
      logger.error('Error in TrendAgent:', error);
      // Fallback to LLM-only trends if API fails
      return this.synthesizeTrends(topic, null);
    }
  }

  private async fetchGoogleTrends(topic: string): Promise<any> {
    try {
      const results = await googleTrends.interestOverTime({ keyword: topic });
      return JSON.parse(results);
    } catch (error) {
      logger.warn('Google Trends API failed, continuing with fallback:', error);
      return null;
    }
  }

  private async synthesizeTrends(topic: string, rawData: any): Promise<TrendData> {
    const prompt = `Analyze the current trends for the topic "${topic}" to help rank on LinkedIn.

    ${rawData ? `Here is some raw Google Trends data: ${JSON.stringify(rawData).substring(0, 1000)}...` : 'I do not have real-time Google Trends data available right now, so please use your knowledge of general industry trends.'}

    Identify:
    1. The specific angle or sub-topic that is currently resonating with professionals.
    2. Key buzzwords or phrases to include for SEO.
    3. The "sentiment" around this topic (e.g., skeptical, excited, fearful).

    Return in JSON:
    {
      "query": "${topic}",
      "interestOverTime": [],
      "relatedTopics": ["trend1", "trend2"],
      "relatedQueries": ["query1", "query2"],
      "insight": "Specific advice on how to ride this trend on LinkedIn"
    }`;

    return this.generateJSON<TrendData>(prompt);
  }
}
