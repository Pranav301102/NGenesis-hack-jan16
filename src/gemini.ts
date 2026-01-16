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
    // Use gemini-2.5-flash (current stable, 1M token context)
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

You are the Architect AI for the Meta-Genesis system. Your job is to design autonomous web agents.

## User Request
Intent: ${context.user_intent}
Target URL: ${context.target_url}
Personality: ${context.personality}

## Your Task

Analyze the user's intent and generate a BUILD MANIFEST as a JSON object. This manifest will be used to automatically create a Python script using AgentQL.

## Tool Documentation: AgentQL

${this.agentqlDocs}

## Output Format

You MUST output ONLY a valid JSON object with this exact structure:

{
  "agent_name": "descriptive_snake_case_name",
  "description": "Brief description of what this agent does",
  "files": [
    {
      "filename": "agent_name.py",
      "code_content": "complete Python script using the base template",
      "file_type": "python"
    }
  ],
  "agentql_queries": {
    "main_query": "the AgentQL query string in GraphQL-like syntax"
  },
  "icon_prompt": "A prompt for generating a futuristic icon for this agent (e.g., 'Futuristic icon for a Price Tracking Agent, neon blue, minimalist, 4k')"
}

## Code Generation Rules

1. Use the base template structure from the AgentQL docs
2. The AgentQL query should use semantic selectors based on the target URL
3. Keep it MINIMAL - only extract the data the user requested
4. Use synchronous Playwright API (sync_playwright)
5. Output results as JSON to both console and file
6. Include proper error handling

## Example for "Track Amazon prices"

{
  "agent_name": "amazon_price_tracker",
  "description": "Tracks product prices on Amazon",
  "files": [{
    "filename": "amazon_price_tracker.py",
    "code_content": "import agentql\\nfrom playwright.sync_api import sync_playwright\\nimport json\\nfrom datetime import datetime\\n\\ndef run_agent():\\n    with sync_playwright() as p:\\n        browser = p.chromium.launch(headless=False)\\n        page = agentql.wrap(browser.new_page())\\n        page.goto('${context.target_url}')\\n        page.wait_for_load_state('networkidle')\\n        query = '''\\n        {\\n          product_name\\n          product_price\\n          product_rating\\n        }\\n        '''\\n        elements = page.query_elements(query)\\n        results = {\\n          'product': str(elements.product_name.text_content()),\\n          'price': str(elements.product_price.text_content()),\\n          'rating': str(elements.product_rating.text_content()),\\n          'timestamp': datetime.now().isoformat()\\n        }\\n        print(json.dumps(results, indent=2))\\n        with open('agent_output.json', 'w') as f:\\n            json.dump(results, f, indent=2)\\n        browser.close()\\n\\nif __name__ == '__main__':\\n    run_agent()",
    "file_type": "python"
  }],
  "agentql_queries": {
    "main_query": "{\\n  product_name\\n  product_price\\n  product_rating\\n}"
  },
  "icon_prompt": "Futuristic icon for an Amazon Price Tracker Agent, electric blue, shopping cart symbol, minimalist, 4k, cyberpunk aesthetic"
}

Now generate the manifest for the user's request. Output ONLY the JSON, no other text.`;
  }
}
