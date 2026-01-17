import axios from 'axios';

export interface YutoriScoutRequest {
  query: string;
  start_timestamp?: number;
  output_interval?: string; // e.g., "1h", "24h"
  webhook_url?: string;
}

export interface YutoriScoutResponse {
  task_id: string;
  status: 'active' | 'pending' | 'completed';
  created_at: string;
}

export interface YutoriTaskStatus {
  task_id: string;
  status: string;
  results?: any[];
  last_updated?: string;
}

/**
 * Yutori API Integration - Creates persistent web monitoring agents
 */
export class YutoriMonitor {
  private apiKey: string;
  private baseUrl = 'https://api.yutori.com/v1';  // Correct base URL with /v1
  private webhookUrl?: string;

  constructor(apiKey: string, webhookUrl?: string) {
    this.apiKey = apiKey;
    this.webhookUrl = webhookUrl;
  }

  /**
   * Create a persistent monitoring Scout
   * Scouts continuously monitor web pages for changes
   */
  async createScout(request: YutoriScoutRequest): Promise<YutoriScoutResponse> {
    console.log('[Yutori] Creating Scout for:', request.query);

    try {
      // Build request body - only include webhook_url if it's a valid URL
      const webhookUrl = request.webhook_url || this.webhookUrl;
      const requestBody: any = {
        query: request.query,
        start_timestamp: request.start_timestamp || Math.floor(Date.now() / 1000),
        output_interval: request.output_interval ? this.parseInterval(request.output_interval) : 3600,
        skip_email: true  // Skip email notifications for API usage
      };

      // Only add webhook_url if it's a valid URL (not empty or placeholder)
      if (webhookUrl && webhookUrl.startsWith('http')) {
        requestBody.webhook_url = webhookUrl;
      }

      const response = await axios.post(
        `${this.baseUrl}/scouting/tasks`,
        requestBody,
        {
          headers: {
            'X-API-Key': this.apiKey,  // FIXED: Use X-API-Key instead of Bearer
            'Content-Type': 'application/json'
          }
        }
      );

      // Log full response for debugging
      console.log('[Yutori] Scout created - full response:', JSON.stringify(response.data, null, 2));

      // Handle different possible response structures
      const taskId = response.data.task_id || 
                     response.data.id || 
                     response.data.taskId ||
                     (response.data.task && response.data.task.id) ||
                     'unknown';

      const status = response.data.status || 'active';

      console.log('[Yutori] Extracted task_id:', taskId);

      return {
        task_id: taskId,
        status: status,
        created_at: new Date().toISOString()
      };

    } catch (error: any) {
      const errorDetails = error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      } : { message: error.message };

      console.error('[Yutori] Error creating scout:', JSON.stringify(errorDetails, null, 2));

      if (error.response?.status === 403) {
        console.error('[Yutori] Authentication failed. Please check:');
        console.error('  1. API key is valid and activated');
        console.error('  2. Account has necessary permissions');
        console.error('  3. Trial period has not expired');
      }

      throw new Error(`Failed to create Yutori Scout: ${error.message}`);
    }
  }

  /**
   * Get status and results from a Scout
   */
  async getScoutStatus(taskId: string): Promise<YutoriTaskStatus> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/scouting/tasks/${taskId}`,
        {
          headers: {
            'X-API-Key': this.apiKey  // FIXED: Use X-API-Key
          }
        }
      );

      return {
        task_id: taskId,
        status: response.data.status,
        results: response.data.results,
        last_updated: response.data.last_updated
      };

    } catch (error: any) {
      console.error('[Yutori] Error getting scout status:', error.message);
      throw error;
    }
  }

  /**
   * List all active Scouts
   */
  async listScouts(): Promise<YutoriTaskStatus[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/scouting/tasks`,
        {
          headers: {
            'X-API-Key': this.apiKey  // FIXED: Use X-API-Key
          }
        }
      );

      return response.data.tasks || [];

    } catch (error: any) {
      console.error('[Yutori] Error listing scouts:', error.message);
      return [];
    }
  }

  /**
   * Stop a Scout from monitoring
   */
  async stopScout(taskId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/scouting/tasks/${taskId}`,
        {
          headers: {
            'X-API-Key': this.apiKey  // FIXED: Use X-API-Key
          }
        }
      );

      console.log('[Yutori] Scout stopped:', taskId);

    } catch (error: any) {
      console.error('[Yutori] Error stopping scout:', error.message);
      throw error;
    }
  }

  /**
   * Generate enhanced query for better monitoring
   */
  generateMonitoringQuery(userIntent: string, targetUrl: string): string {
    // Extract key monitoring terms
    const keywords = userIntent.toLowerCase();

    let query = userIntent;

    // Add context for better monitoring
    if (keywords.includes('price')) {
      query += ` - Monitor price changes and notify on significant drops`;
    } else if (keywords.includes('stock') || keywords.includes('availability')) {
      query += ` - Track availability and notify when back in stock`;
    } else if (keywords.includes('content') || keywords.includes('article')) {
      query += ` - Monitor for new content updates and additions`;
    } else {
      query += ` - Monitor for any significant changes`;
    }

    query += ` on ${targetUrl}`;

    return query;
  }

  setWebhookUrl(url: string) {
    this.webhookUrl = url;
  }

  /**
   * Parse interval string to seconds
   * Supports: '30m', '1h', '24h', '1d', or raw seconds
   */
  private parseInterval(interval: string | number): number {
    if (typeof interval === 'number') return interval;

    const match = interval.match(/^(\d+)(m|h|d)$/);
    if (!match) return 3600; // Default 1 hour

    const [, value, unit] = match;
    const val = parseInt(value);

    switch (unit) {
      case 'm': return Math.max(val * 60, 1800);   // Minimum 30 minutes
      case 'h': return val * 3600;
      case 'd': return val * 86400;
      default: return 3600;
    }
  }
}
