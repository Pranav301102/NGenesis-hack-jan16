import axios from 'axios';

export interface FabricateDataRequest {
  prompt: string;
  rows?: number;
  format?: 'json' | 'csv' | 'sql';
  schema?: Record<string, string>;
}

export interface FabricateDataResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed';
  data?: any[];
  download_url?: string;
}

/**
 * Tonic Fabricate Integration - Generates synthetic test data
 * Prize Category: Most Innovative Use of Tonic Fabricate ($1,000)
 */
export class TonicFabricateGenerator {
  private apiKey: string;
  private baseUrl = 'https://api.tonic.ai/fabricate/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Generate synthetic test data for agent testing
   */
  async generateTestData(request: FabricateDataRequest): Promise<any[]> {
    console.log('[Fabricate] Generating test data:', request.prompt);

    try {
      // Use Fabricate's Data Agent to generate synthetic data
      const response = await axios.post(
        `${this.baseUrl}/generate`,
        {
          prompt: request.prompt,
          rows: request.rows || 10,
          format: request.format || 'json',
          schema: request.schema
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const taskId = response.data.task_id;
      console.log('[Fabricate] Task created:', taskId);

      // Poll for completion
      const data = await this.pollTaskCompletion(taskId);

      console.log('[Fabricate] Generated', data.length, 'test records');
      return data;

    } catch (error: any) {
      console.warn('[Fabricate] API error, using fallback generator:', error.message);
      // Fallback to local generation if API fails
      return this.generateFallbackData(request);
    }
  }

  /**
   * Poll for data generation completion
   */
  private async pollTaskCompletion(taskId: string, maxAttempts = 30): Promise<any[]> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(
          `${this.baseUrl}/tasks/${taskId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            }
          }
        );

        if (response.data.status === 'completed') {
          return response.data.data;
        } else if (response.data.status === 'failed') {
          throw new Error('Data generation failed');
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        if (i === maxAttempts - 1) throw error;
      }
    }

    throw new Error('Data generation timeout');
  }

  /**
   * Generate schema-appropriate test data based on agent intent
   */
  async generateAgentTestData(agentIntent: string, targetUrl: string): Promise<any[]> {
    const prompt = this.buildPromptFromIntent(agentIntent, targetUrl);

    return this.generateTestData({
      prompt,
      rows: 5,
      format: 'json'
    });
  }

  /**
   * Build Fabricate prompt from agent intent
   */
  private buildPromptFromIntent(intent: string, url: string): string {
    const intentLower = intent.toLowerCase();

    if (intentLower.includes('price') || intentLower.includes('product')) {
      return `Generate 5 realistic e-commerce product records with fields:
        product_name (string),
        product_price (decimal with $ symbol),
        product_rating (1-5 stars),
        availability (In Stock/Out of Stock),
        seller_name (string)`;
    }

    if (intentLower.includes('article') || intentLower.includes('blog')) {
      return `Generate 5 realistic blog article records with fields:
        article_title (string),
        author (string),
        publish_date (ISO date),
        excerpt (2-3 sentences),
        read_time (e.g., "5 min read")`;
    }

    if (intentLower.includes('job') || intentLower.includes('career')) {
      return `Generate 5 realistic job posting records with fields:
        job_title (string),
        company_name (string),
        location (city, state),
        salary_range (string),
        posted_date (ISO date)`;
    }

    // Generic data
    return `Generate 5 realistic records that would be found on ${url} based on this intent: ${intent}`;
  }

  /**
   * Fallback local data generator (if API unavailable)
   */
  private generateFallbackData(request: FabricateDataRequest): any[] {
    console.log('[Fabricate] Using local fallback generator');

    const rows = request.rows || 5;
    const data: any[] = [];

    // Generate simple test data based on prompt
    for (let i = 0; i < rows; i++) {
      if (request.prompt.includes('product') || request.prompt.includes('price')) {
        data.push({
          product_name: `Test Product ${i + 1}`,
          product_price: `$${(Math.random() * 100 + 10).toFixed(2)}`,
          product_rating: `${(Math.random() * 2 + 3).toFixed(1)} stars`,
          availability: Math.random() > 0.3 ? 'In Stock' : 'Out of Stock',
          test_data: true
        });
      } else {
        data.push({
          id: i + 1,
          title: `Test Item ${i + 1}`,
          value: Math.floor(Math.random() * 1000),
          test_data: true
        });
      }
    }

    return data;
  }

  /**
   * Validate scraped data against test data
   */
  validateAgentOutput(scrapedData: any, testData: any[]): {
    passed: boolean;
    coverage: number;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check if scraped data has expected fields
    const testFields = Object.keys(testData[0] || {});
    const scrapedFields = Object.keys(scrapedData || {});

    const missingFields = testFields.filter(f => !scrapedFields.includes(f) && f !== 'test_data');

    if (missingFields.length > 0) {
      issues.push(`Missing fields: ${missingFields.join(', ')}`);
    }

    const coverage = (scrapedFields.length / testFields.length) * 100;

    return {
      passed: issues.length === 0,
      coverage: Math.min(coverage, 100),
      issues
    };
  }
}
