import { ContentGenerationService } from '../src/services/contentGeneration';
import { logger } from '../src/utils/logger';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

async function main() {
  console.log('Testing ContentGenerationService...');

  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set!');
    process.exit(1);
  }

  const service = new ContentGenerationService();

  try {
    const result = await service.generateContent({
      topic: 'The future of remote work',
      contentType: 'article',
      researchDepth: 'quick',
      includeImages: false,
    });

    console.log('Success:', result);
  } catch (error) {
    console.error('Error generating content:', error);
  }
}

main();
