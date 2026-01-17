import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import { BuildManifest, GeminiPromptContext } from './types';

export class GeminiOrchestrator {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private agentqlDocs: string;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.5-flash
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Load AgentQL documentation
    const docsPath = path.join(__dirname, '../prompts/agentql_docs.md');
    this.agentqlDocs = fs.readFileSync(docsPath, 'utf-8');
  }

  async generateBuildManifest(context: GeminiPromptContext): Promise<BuildManifest> {
    const systemPrompt = this.buildSystemPrompt(context);

    console.log('[Gemini] Decomposing user intent...');

    const result = await this.model.generateContent(systemPrompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Gemini response');
    }

    const manifest: BuildManifest = JSON.parse(jsonMatch[0]);
    console.log('[Gemini] Build manifest generated:', manifest.agent_name);

    return manifest;
  }

  private buildSystemPrompt(context: GeminiPromptContext): string {
    return `# Meta-Genesis Agent Architect

You are the Architect AI for the Meta-Genesis system. Your job is to design autonomous web agents that use the TinyFish/Mino API.

## User Request
Intent: ${context.user_intent}
Target URL: ${context.target_url}
Personality: ${context.personality}

## Your Task

Analyze the user's intent and generate a BUILD MANIFEST as a JSON object. This manifest creates a Python script that uses the TinyFish/Mino REST API for web automation (NOT local Playwright).

## TinyFish/Mino API Documentation

The TinyFish/Mino API is a cloud-based web automation service. It runs the browser in the cloud, not locally.

**API Endpoint:** POST https://mino.ai/v1/automation/run
**Headers:** 
- X-API-Key: (provided at runtime)
- Content-Type: application/json

**Request Body:**
{
  "url": "https://example.com",
  "goal": "Extract all product names and prices"
}

**Response:**
{
  "success": true,
  "result": { extracted data },
  "screenshot": "base64 image"
}

## Output Format

You MUST output ONLY a valid JSON object with this exact structure:

{
  "agent_name": "descriptive_snake_case_name",
  "description": "Brief description of what this agent does",
  "files": [
    {
      "filename": "agent_name.py",
      "code_content": "complete Python script using TinyFish API",
      "file_type": "python"
    }
  ],
  "agentql_queries": {
    "main_query": "the goal description for TinyFish API"
  },
  "icon_prompt": "A prompt for generating a futuristic icon for this agent"
}

## Code Generation Rules

1. Use the TinyFish/Mino REST API via HTTP requests (requests library)
2. DO NOT use Playwright or any local browser
3. The goal should be a natural language description of what to extract
4. Keep it MINIMAL - only extract the data the user requested
5. Output results as JSON to both console and file
6. Include proper error handling
7. Read API key from environment variable AGENTQL_API_KEY

## Example for "Track Amazon prices"

{
  "agent_name": "amazon_price_tracker",
  "description": "Tracks product prices on Amazon using TinyFish API",
  "files": [{
    "filename": "amazon_price_tracker.py",
    "code_content": "import requests\\nimport json\\nimport os\\nfrom datetime import datetime\\n\\ndef run_agent():\\n    api_key = os.environ.get('AGENTQL_API_KEY')\\n    if not api_key:\\n        raise Exception('AGENTQL_API_KEY not set')\\n\\n    url = '${context.target_url}'\\n    goal = 'Extract the product name, current price, and customer rating'\\n\\n    print(f'[{datetime.now().isoformat()}] Calling TinyFish API...')\\n\\n    response = requests.post(\\n        'https://mino.ai/v1/automation/run',\\n        headers={\\n            'X-API-Key': api_key,\\n            'Content-Type': 'application/json'\\n        },\\n        json={'url': url, 'goal': goal},\\n        timeout=60\\n    )\\n\\n    if response.status_code == 200:\\n        data = response.json()\\n        results = {\\n            'data': data.get('result', {}),\\n            'timestamp': datetime.now().isoformat(),\\n            'url': url\\n        }\\n        print(json.dumps(results, indent=2))\\n        with open('agent_output.json', 'w') as f:\\n            json.dump(results, f, indent=2)\\n        print(f'[{datetime.now().isoformat()}] Agent completed successfully')\\n    else:\\n        print(f'API Error: {response.status_code} - {response.text}')\\n\\nif __name__ == '__main__':\\n    run_agent()",
    "file_type": "python"
  }],
  "agentql_queries": {
    "main_query": "Extract the product name, current price, and customer rating"
  },
  "icon_prompt": "Futuristic icon for an Amazon Price Tracker Agent, electric blue, shopping cart symbol, minimalist, 4k, cyberpunk aesthetic"
}

Now generate the manifest for the user's request. Output ONLY the JSON, no other text.`;
  }
}
