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
      structure_strength: 40,
      resolution: '4k'
    };

    // Add style reference if available
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

      const taskId = response.data.task_id;
      console.log('[Freepik] Task created:', taskId);

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

        const status = response.data.status;

        if (status === 'completed') {
          return response.data.image_url;
        } else if (status === 'failed') {
          throw new Error('Image generation failed');
        }

        // Wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error: any) {
        if (i === maxAttempts - 1) {
          throw error;
        }
      }
    }

    throw new Error('Image generation timeout');
  }

  setStyleReference(url: string) {
    this.styleReferenceUrl = url;
  }
}
