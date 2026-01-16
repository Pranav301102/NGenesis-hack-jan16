import axios from 'axios';
import { FreepikMysticRequest, FreepikMysticResponse } from './types';

export class FreepikGenerator {
  private apiKey: string;
  private baseUrl = 'https://api.freepik.com/v1/ai';
  private styleReferenceUrl?: string;

  constructor(apiKey: string, styleReferenceUrl?: string) {
    this.apiKey = apiKey;
    this.styleReferenceUrl = styleReferenceUrl;
  }

  async generateAgentIcon(prompt: string): Promise<string> {
    console.log('[Freepik] Generating agent icon...');

    const request: FreepikMysticRequest = {
      prompt: prompt,
      aspect_ratio: 'square_1_1',
      resolution: '2k',
      model: 'realism'
    };

    // Add style reference if available (as base64)
    if (this.styleReferenceUrl) {
      request.style_reference = this.styleReferenceUrl;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/mystic`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-freepik-api-key': this.apiKey
          }
        }
      );

      // Response structure: { data: { task_id, status, generated } }
      const taskId = response.data?.data?.task_id;
      console.log('[Freepik] Task created:', taskId);

      if (!taskId) {
        console.error('[Freepik] No task_id in response:', JSON.stringify(response.data, null, 2));
        throw new Error('No task_id returned from Freepik API');
      }

      // Poll for completion
      const imageUrl = await this.pollTaskStatus(taskId);
      console.log('[Freepik] Icon generated:', imageUrl);

      return imageUrl;

    } catch (error: any) {
      const errorDetails = error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : { message: error.message };

      console.error('[Freepik] Error:', JSON.stringify(errorDetails, null, 2));

      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('[Freepik] Authentication failed. Please check:');
        console.error('  1. API key is valid (should start with FPSX)');
        console.error('  2. API quota has not been exceeded');
        console.error('  3. Account is in good standing');
      }

      throw new Error(`Failed to generate icon: ${error.message}`);
    }
  }

  private async pollTaskStatus(taskId: string, maxAttempts = 30): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(
          `${this.baseUrl}/mystic/${taskId}`,
          {
            headers: {
              'x-freepik-api-key': this.apiKey
            }
          }
        );

        // Response structure: { data: { task_id, status, generated, has_nsfw } }
        const data = response.data?.data;
        const status = data?.status;

        console.log('[Freepik] Poll status:', status);

        if (status === 'COMPLETED') {
          // Images are in the 'generated' array
          const images = data?.generated;
          if (images && images.length > 0) {
            return images[0];
          }
          throw new Error('No images in completed response');
        } else if (status === 'FAILED') {
          throw new Error('Image generation failed');
        }

        // Wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error: any) {
        // Only throw on last attempt or if it's a known error
        if (i === maxAttempts - 1 || error.message.includes('failed')) {
          throw error;
        }
        // Continue polling on network errors
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    throw new Error('Image generation timeout');
  }

  setStyleReference(url: string) {
    this.styleReferenceUrl = url;
  }
}
