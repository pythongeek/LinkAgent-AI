import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { logger } from '../utils/logger';
import { Encryption } from '../utils/encryption';

// Add stealth plugin
puppeteer.use(StealthPlugin());

export interface LinkedInPost {
  id: string;
  author: string;
  authorProfile?: string;
  authorTitle?: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  timestamp?: string;
  postUrl?: string;
  mediaUrls?: string[];
}

export interface ScrapingConfig {
  minDelay: number;
  maxDelay: number;
  maxConcurrent: number;
  maxPerHour: number;
  respectRobotsTxt: boolean;
}

const DEFAULT_CONFIG: ScrapingConfig = {
  minDelay: parseInt(process.env.SCRAPER_MIN_DELAY || '3000'),
  maxDelay: 8000,
  maxConcurrent: parseInt(process.env.SCRAPER_MAX_CONCURRENT || '1'),
  maxPerHour: parseInt(process.env.SCRAPER_MAX_PER_HOUR || '20'),
  respectRobotsTxt: true,
};

export class LinkedInScraper {
  private config: ScrapingConfig;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private hourlyRequestCount: number = 0;
  private hourStartTime: number = Date.now();

  constructor(config: Partial<ScrapingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check rate limits before making a request
   */
  private async checkRateLimits(): Promise<boolean> {
    const now = Date.now();
    
    // Reset hourly counter if hour has passed
    if (now - this.hourStartTime >= 60 * 60 * 1000) {
      this.hourlyRequestCount = 0;
      this.hourStartTime = now;
    }

    // Check hourly limit
    if (this.hourlyRequestCount >= this.config.maxPerHour) {
      logger.warn('Hourly rate limit reached');
      return false;
    }

    // Add delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    const requiredDelay = this.getRandomDelay();
    
    if (timeSinceLastRequest < requiredDelay) {
      await this.sleep(requiredDelay - timeSinceLastRequest);
    }

    return true;
  }

  /**
   * Get random delay between min and max
   */
  private getRandomDelay(): number {
    return Math.floor(
      Math.random() * (this.config.maxDelay - this.config.minDelay) + this.config.minDelay
    );
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Initialize browser with human-like settings
   */
  private async initBrowser() {
    return puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ],
    });
  }

  /**
   * Login to LinkedIn using cookies
   */
  private async loginWithCookies(
    page: any,
    cookies: { liAt: string; jsessionId: string }
  ): Promise<boolean> {
    try {
      // Set cookies
      await page.setCookie(
        {
          name: 'li_at',
          value: cookies.liAt,
          domain: '.linkedin.com',
          path: '/',
          secure: true,
          httpOnly: true,
        },
        {
          name: 'JSESSIONID',
          value: cookies.jsessionId,
          domain: '.www.linkedin.com',
          path: '/',
          secure: true,
          httpOnly: false,
        }
      );

      // Navigate to LinkedIn feed to verify login
      await page.goto('https://www.linkedin.com/feed/', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Check if logged in
      const isLoggedIn = await page.evaluate(() => {
        return !document.querySelector('.sign-in-form') &&
               document.querySelector('.feed-identity-module');
      });

      return isLoggedIn;
    } catch (error) {
      logger.error('LinkedIn login error:', error);
      return false;
    }
  }

  /**
   * Scrape posts for a topic
   */
  async scrapeTopicPosts(
    topic: string,
    encryptedCookies: { liAt: string; jsessionId: string },
    limit: number = 50
  ): Promise<LinkedInPost[]> {
    // Check rate limits
    const canProceed = await this.checkRateLimits();
    if (!canProceed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Decrypt cookies
    const cookies = {
      liAt: Encryption.decrypt(encryptedCookies.liAt),
      jsessionId: Encryption.decrypt(encryptedCookies.jsessionId),
    };

    const browser = await this.initBrowser();
    const posts: LinkedInPost[] = [];

    try {
      const page = await browser.newPage();

      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Login
      const loggedIn = await this.loginWithCookies(page, cookies);
      if (!loggedIn) {
        throw new Error('Failed to login to LinkedIn. Please check your cookies.');
      }

      // Search for topic
      const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(
        topic
      )}&sortBy=date_posted`;

      await page.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for content to load
      await this.sleep(3000);

      // Scroll and collect posts
      let previousHeight = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = Math.ceil(limit / 10);

      while (posts.length < limit && scrollAttempts < maxScrollAttempts) {
        // Extract posts from current view
        const newPosts = await page.evaluate(() => {
          const postElements = document.querySelectorAll('.feed-shared-update-v2');
          const extracted: Partial<LinkedInPost>[] = [];

          postElements.forEach((post) => {
            try {
              const authorEl = post.querySelector('.update-components-actor__name');
              const authorTitleEl = post.querySelector('.update-components-actor__description');
              const contentEl = post.querySelector('.feed-shared-text');
              const likesEl = post.querySelector('.social-details-social-counts__reactions-count');
              const commentsEl = post.querySelector('.social-details-social-counts__comments');
              const timestampEl = post.querySelector('.update-components-actor__sub-description');
              const linkEl = post.querySelector('a.app-aware-link');

              // Extract media URLs
              const mediaEls = post.querySelectorAll('.feed-shared-image img, .feed-shared-video img');
              const mediaUrls = Array.from(mediaEls).map((img) => (img as HTMLImageElement).src);

              extracted.push({
                author: authorEl?.textContent?.trim() || 'Unknown',
                authorTitle: authorTitleEl?.textContent?.trim(),
                content: contentEl?.textContent?.trim() || '',
                likes: parseInt(likesEl?.textContent?.replace(/[^0-9]/g, '') || '0'),
                comments: parseInt(commentsEl?.textContent?.replace(/[^0-9]/g, '') || '0'),
                timestamp: timestampEl?.textContent?.trim(),
                postUrl: linkEl?.getAttribute('href') || undefined,
                mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
              });
            } catch (e) {
              // Skip problematic posts
            }
          });

          return extracted;
        });

        // Add unique posts
        for (const post of newPosts) {
          if (posts.length >= limit) break;
          
          // Check for duplicates
          const isDuplicate = posts.some(
            (p) => p.content === post.content && p.author === post.author
          );
          
          if (!isDuplicate && post.content) {
            posts.push({
              id: `post_${Date.now()}_${posts.length}`,
              author: post.author || 'Unknown',
              authorTitle: post.authorTitle,
              content: post.content,
              likes: post.likes || 0,
              comments: post.comments || 0,
              shares: 0,
              timestamp: post.timestamp,
              postUrl: post.postUrl,
              mediaUrls: post.mediaUrls,
            });
          }
        }

        // Scroll down
        const currentHeight = await page.evaluate(() => document.body.scrollHeight);
        
        if (currentHeight === previousHeight) {
          break; // No more content
        }

        previousHeight = currentHeight;
        
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight);
        });

        // Random delay between scrolls
        await this.sleep(this.getRandomDelay());
        scrollAttempts++;
      }

      // Update rate limit counters
      this.requestCount++;
      this.hourlyRequestCount++;
      this.lastRequestTime = Date.now();

      logger.info(`Scraped ${posts.length} posts for topic: ${topic}`);

      return posts;
    } catch (error) {
      logger.error('Error scraping LinkedIn posts:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  /**
   * Scrape a user's profile
   */
  async scrapeProfile(
    profileUrl: string,
    encryptedCookies: { liAt: string; jsessionId: string }
  ): Promise<any> {
    const canProceed = await this.checkRateLimits();
    if (!canProceed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const cookies = {
      liAt: Encryption.decrypt(encryptedCookies.liAt),
      jsessionId: Encryption.decrypt(encryptedCookies.jsessionId),
    };

    const browser = await this.initBrowser();

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      const loggedIn = await this.loginWithCookies(page, cookies);
      if (!loggedIn) {
        throw new Error('Failed to login to LinkedIn');
      }

      await page.goto(profileUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      await this.sleep(3000);

      // Extract profile data
      const profile = await page.evaluate(() => {
        const nameEl = document.querySelector('h1.text-heading-xlarge');
        const headlineEl = document.querySelector('.text-body-medium');
        const aboutEl = document.querySelector('.pv-about__summary-text');
        const bannerEl = document.querySelector('.profile-background-image img');
        const photoEl = document.querySelector('.pv-top-card-profile-picture__image');

        return {
          name: nameEl?.textContent?.trim(),
          headline: headlineEl?.textContent?.trim(),
          about: aboutEl?.textContent?.trim(),
          bannerUrl: (bannerEl as HTMLImageElement)?.src,
          photoUrl: (photoEl as HTMLImageElement)?.src,
        };
      });

      this.requestCount++;
      this.hourlyRequestCount++;
      this.lastRequestTime = Date.now();

      return profile;
    } catch (error) {
      logger.error('Error scraping profile:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  /**
   * Search for top creators in a niche
   */
  async searchTopCreators(
    niche: string,
    encryptedCookies: { liAt: string; jsessionId: string },
    limit: number = 10
  ): Promise<any[]> {
    const canProceed = await this.checkRateLimits();
    if (!canProceed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const cookies = {
      liAt: Encryption.decrypt(encryptedCookies.liAt),
      jsessionId: Encryption.decrypt(encryptedCookies.jsessionId),
    };

    const browser = await this.initBrowser();

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      const loggedIn = await this.loginWithCookies(page, cookies);
      if (!loggedIn) {
        throw new Error('Failed to login to LinkedIn');
      }

      // Search for people in niche
      const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
        niche
      )}`;

      await page.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      await this.sleep(3000);

      // Extract creator profiles
      const creators = await page.evaluate((maxResults) => {
        const elements = document.querySelectorAll('.reusable-search__result-container');
        const results: any[] = [];

        elements.forEach((el, index) => {
          if (index >= maxResults) return;

          const nameEl = el.querySelector('.app-aware-link span[dir="ltr"]');
          const titleEl = el.querySelector('.entity-result__primary-subtitle');
          const linkEl = el.querySelector('.app-aware-link');
          const imageEl = el.querySelector('.presence-entity__image');

          results.push({
            name: nameEl?.textContent?.trim(),
            title: titleEl?.textContent?.trim(),
            profileUrl: linkEl?.getAttribute('href')?.split('?')[0],
            imageUrl: (imageEl as HTMLImageElement)?.src,
          });
        });

        return results;
      }, limit);

      this.requestCount++;
      this.hourlyRequestCount++;
      this.lastRequestTime = Date.now();

      return creators.filter((c) => c.name);
    } catch (error) {
      logger.error('Error searching top creators:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  /**
   * Get scraping statistics
   */
  getStats(): {
    totalRequests: number;
    hourlyRequests: number;
    hourResetTime: number;
  } {
    return {
      totalRequests: this.requestCount,
      hourlyRequests: this.hourlyRequestCount,
      hourResetTime: this.hourStartTime + 60 * 60 * 1000 - Date.now(),
    };
  }
}
