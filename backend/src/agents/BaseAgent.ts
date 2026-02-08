import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

export abstract class BaseAgent {
  protected genAI: GoogleGenerativeAI;
  protected modelName: string = 'gemini-2.0-flash-exp';

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  protected async generateText(prompt: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      logger.error(`Error generating text in ${this.constructor.name}:`, error);
      throw error;
    }
  }

  protected async generateJSON<T>(prompt: string): Promise<T> {
    try {
      const text = await this.generateText(prompt + "\n\nReturn the result in valid JSON format.");
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as T;
      }
      throw new Error("No JSON found in response");
    } catch (error) {
      logger.error(`Error generating JSON in ${this.constructor.name}:`, error);
      throw error;
    }
  }
}
