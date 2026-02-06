import googleTrends from 'google-trends-api';
import { logger } from '../utils/logger';

export interface TrendData {
  keyword: string;
  interestOverTime: Array<{
    date: string;
    value: number;
  }>;
  relatedQueries: {
    rising: Array<{ query: string; value: number }>;
    top: Array<{ query: string; value: number }>;
  };
  regionalInterest: Array<{
    region: string;
    value: number;
  }>;
  trendScore: number;
}

export interface OpportunityScore {
  score: number;
  breakdown: {
    trendMomentum: number;
    searchVolume: number;
    competition: number;
    engagement: number;
  };
  trendData: any;
  competitionData: any;
  recommendation: string;
}

export class TrendAnalyzer {
  /**
   * Analyze trends for multiple keywords
   */
  async analyzeTrends(
    keywords: string[],
    timeframe: string = 'today 3-m',
    geo: string = 'US'
  ): Promise<TrendData[]> {
    try {
      const results = await Promise.all(
        keywords.map((keyword) => this.getTrendData(keyword, timeframe, geo))
      );

      return results;
    } catch (error) {
      logger.error('Error analyzing trends:', error);
      throw error;
    }
  }

  /**
   * Get trend data for a single keyword
   */
  async getTrendData(
    keyword: string,
    timeframe: string = 'today 3-m',
    geo: string = 'US'
  ): Promise<TrendData> {
    try {
      // Get interest over time
      const interestData = await googleTrends.interestOverTime({
        keyword,
        startTime: this.parseTimeframe(timeframe),
        geo,
      });

      const interestParsed = JSON.parse(interestData);
      const interestOverTime = interestParsed.default.timelineData.map((item: any) => ({
        date: item.formattedTime,
        value: item.value[0],
      }));

      // Get related queries
      const relatedData = await googleTrends.relatedQueries({
        keyword,
        startTime: this.parseTimeframe(timeframe),
        geo,
      });

      const relatedParsed = JSON.parse(relatedData);
      const relatedQueries = {
        rising: (relatedParsed.default.rankedList[0]?.rankedKeyword || [])
          .slice(0, 10)
          .map((item: any) => ({
            query: item.query,
            value: item.value,
          })),
        top: (relatedParsed.default.rankedList[1]?.rankedKeyword || [])
          .slice(0, 10)
          .map((item: any) => ({
            query: item.query,
            value: item.value,
          })),
      };

      // Get regional interest
      const regionalData = await googleTrends.interestByRegion({
        keyword,
        startTime: this.parseTimeframe(timeframe),
        geo,
        resolution: 'COUNTRY',
      });

      const regionalParsed = JSON.parse(regionalData);
      const regionalInterest = (regionalParsed.default.geoMapData || [])
        .slice(0, 10)
        .map((item: any) => ({
          region: item.geoName,
          value: item.value[0],
        }));

      // Calculate trend score
      const trendScore = this.calculateTrendScore(interestOverTime);

      return {
        keyword,
        interestOverTime,
        relatedQueries,
        regionalInterest,
        trendScore,
      };
    } catch (error) {
      logger.error(`Error getting trend data for ${keyword}:`, error);
      return {
        keyword,
        interestOverTime: [],
        relatedQueries: { rising: [], top: [] },
        regionalInterest: [],
        trendScore: 0,
      };
    }
  }

  /**
   * Calculate trend score based on interest over time
   */
  private calculateTrendScore(interestOverTime: Array<{ date: string; value: number }>): number {
    if (interestOverTime.length === 0) return 0;

    const values = interestOverTime.map((item) => item.value);
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    
    // Calculate trend direction (last 3 points vs first 3 points)
    const firstThree = values.slice(0, 3);
    const lastThree = values.slice(-3);
    const firstAvg = firstThree.reduce((a, b) => a + b, 0) / firstThree.length;
    const lastAvg = lastThree.reduce((a, b) => a + b, 0) / lastThree.length;
    
    // Trend momentum (positive = growing, negative = declining)
    const momentum = lastAvg - firstAvg;
    
    // Normalize to 0-100 score
    const score = Math.min(100, Math.max(0, average + momentum * 2));
    
    return Math.round(score);
  }

  /**
   * Parse timeframe string to Date
   */
  private parseTimeframe(timeframe: string): Date {
    const now = new Date();
    
    switch (timeframe) {
      case 'today 1-m':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'today 3-m':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'today 12-m':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      case 'all':
        return new Date(2004, 0, 1); // Google Trends starts from 2004
      default:
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Get trending topics
   */
  async getTrendingTopics(category: string = 'business', limit: number = 10): Promise<any[]> {
    try {
      // Use daily trends for trending topics
      const trendsData = await googleTrends.dailyTrends({
        geo: 'US',
      });

      const parsed = JSON.parse(trendsData);
      const trending = (parsed.default.trendingSearchesDays[0]?.trendingSearches || [])
        .slice(0, limit)
        .map((item: any) => ({
          title: item.title.query,
          traffic: item.formattedTraffic,
          relatedQueries: item.relatedQueries.map((q: any) => q.query),
          image: item.image?.imageUrl,
          articles: item.articles.map((a: any) => ({
            title: a.articleTitle,
            source: a.source,
            url: a.url,
          })),
        }));

      return trending;
    } catch (error) {
      logger.error('Error getting trending topics:', error);
      return [];
    }
  }

  /**
   * Compare multiple topics
   */
  async compareTopics(topics: string[]): Promise<any> {
    try {
      const interestData = await googleTrends.interestOverTime({
        keyword: topics,
        startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      });

      const parsed = JSON.parse(interestData);
      const timelineData = parsed.default.timelineData;

      // Transform data for comparison
      const comparison = topics.map((topic, index) => {
        const topicData = timelineData.map((item: any) => ({
          date: item.formattedTime,
          value: item.value[index] || 0,
        }));

        const avgInterest = topicData.reduce((sum: number, item: any) => sum + item.value, 0) / topicData.length;

        return {
          topic,
          averageInterest: Math.round(avgInterest),
          data: topicData,
        };
      });

      return comparison;
    } catch (error) {
      logger.error('Error comparing topics:', error);
      throw error;
    }
  }

  /**
   * Get interest over time for a topic
   */
  async getInterestOverTime(topic: string, timeframe: string): Promise<any> {
    try {
      const interestData = await googleTrends.interestOverTime({
        keyword: topic,
        startTime: this.parseTimeframe(timeframe),
      });

      const parsed = JSON.parse(interestData);
      return parsed.default.timelineData.map((item: any) => ({
        date: item.formattedTime,
        value: item.value[0],
      }));
    } catch (error) {
      logger.error('Error getting interest over time:', error);
      return [];
    }
  }

  /**
   * Get related queries for a topic
   */
  async getRelatedQueries(topic: string): Promise<any> {
    try {
      const relatedData = await googleTrends.relatedQueries({
        keyword: topic,
        startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      });

      const parsed = JSON.parse(relatedData);
      return {
        rising: (parsed.default.rankedList[0]?.rankedKeyword || []).slice(0, 10),
        top: (parsed.default.rankedList[1]?.rankedKeyword || []).slice(0, 10),
      };
    } catch (error) {
      logger.error('Error getting related queries:', error);
      return { rising: [], top: [] };
    }
  }

  /**
   * Calculate opportunity score for a topic
   */
  async calculateOpportunityScore(topic: string): Promise<OpportunityScore> {
    try {
      // Get trend data
      const trendData = await this.getTrendData(topic);
      
      // Calculate components
      const trendMomentum = trendData.trendScore;
      const searchVolume = this.calculateSearchVolume(trendData.interestOverTime);
      
      // For competition and engagement, we'd need LinkedIn data
      // For now, use estimated values
      const competition = Math.floor(Math.random() * 50) + 20; // Simulated
      const engagement = Math.floor(Math.random() * 40) + 40; // Simulated

      // Weighted scoring
      const weights = {
        trendMomentum: 0.30,
        searchVolume: 0.25,
        competition: 0.25, // Lower is better, so we invert
        engagement: 0.20,
      };

      const score = Math.round(
        trendMomentum * weights.trendMomentum +
        searchVolume * weights.searchVolume +
        (100 - competition) * weights.competition +
        engagement * weights.engagement
      );

      // Generate recommendation
      let recommendation = '';
      if (score >= 80) {
        recommendation = 'Excellent opportunity! High demand with manageable competition.';
      } else if (score >= 60) {
        recommendation = 'Good opportunity. Consider unique angles to stand out.';
      } else if (score >= 40) {
        recommendation = 'Moderate opportunity. Focus on niche aspects.';
      } else {
        recommendation = 'Low opportunity. Consider related topics with better potential.';
      }

      return {
        score,
        breakdown: {
          trendMomentum,
          searchVolume,
          competition,
          engagement,
        },
        trendData,
        competitionData: {
          estimatedCompetition: competition,
          estimatedEngagement: engagement,
        },
        recommendation,
      };
    } catch (error) {
      logger.error('Error calculating opportunity score:', error);
      return {
        score: 0,
        breakdown: { trendMomentum: 0, searchVolume: 0, competition: 0, engagement: 0 },
        trendData: null,
        competitionData: null,
        recommendation: 'Unable to calculate score. Please try again.',
      };
    }
  }

  /**
   * Calculate search volume score
   */
  private calculateSearchVolume(interestOverTime: Array<{ date: string; value: number }>): number {
    if (interestOverTime.length === 0) return 0;
    
    const avg = interestOverTime.reduce((sum, item) => sum + item.value, 0) / interestOverTime.length;
    return Math.round(avg);
  }
}
