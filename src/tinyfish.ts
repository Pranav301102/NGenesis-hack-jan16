import axios from 'axios';

export interface MinoAutomationRequest {
  url: string;
  goal: string;
}

export interface MinoAutomationResponse {
  success: boolean;
  result: any;
  error?: string;
}

/**
 * TinyFish/Mino API Integration
 * Self-healing web automation using AI
 *
 * API Docs: https://docs.mino.ai/
 */
export class TinyFishAutomation {
  private apiKey: string;
  private baseUrl = 'https://mino.ai/v1/automation';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Run a web automation task using SSE endpoint (recommended by docs)
   * Endpoint: POST https://mino.ai/v1/automation/run-sse
   */
  async runAutomation(url: string, goal: string): Promise<MinoAutomationResponse> {
    console.log(`[TinyFish] Running SSE automation on: ${url}`);
    console.log(`[TinyFish] Goal: ${goal}`);
    console.log(`[TinyFish] API Key: ${this.apiKey.substring(0, 10)}...`);

    try {
      // Use SSE endpoint as shown in official docs
      const response = await axios.post(
        `${this.baseUrl}/run-sse`,
        {
          url,
          goal
        },
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 60000, // 60 second timeout (reduced from 120)
          responseType: 'text' // SSE returns text stream
        }
      );

      console.log('[TinyFish] Response received, status:', response.status);
      console.log('[TinyFish] Raw response length:', response.data?.length || 0);
      
      // Parse SSE response - look for COMPLETE event with resultJson
      const responseText = response.data;
      let finalResult: any = null;
      
      // SSE format: data: {...}\n\n
      const dataLines = responseText.split('\n').filter((line: string) => line.startsWith('data: '));
      
      console.log(`[TinyFish] Found ${dataLines.length} SSE data events`);
      
      for (const line of dataLines) {
        try {
          const jsonStr = line.replace('data: ', '').trim();
          if (jsonStr) {
            const eventData = JSON.parse(jsonStr);
            console.log(`[TinyFish] Event type: ${eventData.type || eventData.status || 'unknown'}`);
            
            // Look for COMPLETE event with resultJson (per docs)
            if (eventData.type === 'COMPLETE' || eventData.status === 'COMPLETED') {
              finalResult = eventData.resultJson || eventData.result || eventData;
              console.log('[TinyFish] Got COMPLETE event with results');
            }
            // Also capture any result data
            if (eventData.resultJson) {
              finalResult = eventData.resultJson;
            }
          }
        } catch (e) {
          // Skip non-JSON lines
        }
      }

      if (finalResult) {
        console.log('[TinyFish] Automation completed successfully');
        return {
          success: true,
          result: finalResult
        };
      } else {
        console.log('[TinyFish] No result found in SSE response');
        // Return raw response for debugging
        return {
          success: false,
          result: { rawResponse: responseText.substring(0, 500) },
          error: 'No COMPLETE event with resultJson found in SSE response'
        };
      }

    } catch (error: any) {
      // Handle timeout specifically
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.error('[TinyFish] Request timed out after 60 seconds');
        return {
          success: false,
          result: null,
          error: 'Request timed out after 60 seconds'
        };
      }
      
      const errorDetails = error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: typeof error.response.data === 'string' 
          ? error.response.data.substring(0, 200) 
          : error.response.data
      } : { message: error.message, code: error.code };

      console.error('[TinyFish] Automation error:', JSON.stringify(errorDetails, null, 2));

      return {
        success: false,
        result: null,
        error: error.response?.data?.message || error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Run automation with callback for streaming events
   */
  async runAutomationSSE(url: string, goal: string, onEvent?: (event: any) => void): Promise<MinoAutomationResponse> {
    console.log(`[TinyFish] Running SSE automation with callback on: ${url}`);

    try {
      const response = await axios.post(
        `${this.baseUrl}/run-sse`,
        {
          url,
          goal
        },
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 120000,
          responseType: 'text'
        }
      );

      // Parse SSE response
      const lines = response.data.split('\n');
      let result: any = null;

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(line.slice(6));
            if (onEvent) onEvent(eventData);
            result = eventData;
          } catch (e) {
            // Skip non-JSON lines
          }
        }
      }

      return {
        success: true,
        result
      };

    } catch (error: any) {
      console.error('[TinyFish] SSE automation error:', error.message);
      return {
        success: false,
        result: null,
        error: error.message
      };
    }
  }

  /**
   * Extract structured data from a webpage
   */
  async extractData(url: string, dataDescription: string): Promise<MinoAutomationResponse> {
    const goal = `Extract the following data and respond in JSON format: ${dataDescription}`;
    return this.runAutomation(url, goal);
  }

  /**
   * Scrape specific content from a page
   */
  async scrapeContent(url: string, contentType: string): Promise<MinoAutomationResponse> {
    const goal = `Find and extract all ${contentType}. Respond in JSON format: { "result": [...] }`;
    return this.runAutomation(url, goal);
  }

  /**
   * Monitor a page for specific content
   */
  async checkForContent(url: string, contentDescription: string): Promise<MinoAutomationResponse> {
    const goal = `Check if ${contentDescription} exists on the page. Respond with: { "found": true/false, "details": "..." }`;
    return this.runAutomation(url, goal);
  }
}
