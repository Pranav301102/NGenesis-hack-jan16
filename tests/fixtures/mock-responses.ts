import { BuildManifest, AgentRequest, FreepikMysticResponse } from '../../src/types';

export const mockAgentRequest: AgentRequest = {
  user_intent: 'Track product prices on Amazon',
  target_url: 'https://www.amazon.com/dp/B08N5WRWNW',
  personality: 'professional',
  agent_name: 'amazon_tracker'
};

export const mockBuildManifest: BuildManifest = {
  agent_name: 'amazon_price_tracker',
  description: 'Tracks product prices on Amazon',
  files: [
    {
      filename: 'amazon_price_tracker.py',
      code_content: `import agentql
from playwright.sync_api import sync_playwright
import json
from datetime import datetime

def run_agent():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = agentql.wrap(browser.new_page())
        page.goto('https://www.amazon.com/dp/B08N5WRWNW')
        page.wait_for_load_state('networkidle')

        query = """
        {
          product_name
          product_price
          product_rating
        }
        """

        elements = page.query_elements(query)
        results = {
          'product': str(elements.product_name.text_content()),
          'price': str(elements.product_price.text_content()),
          'rating': str(elements.product_rating.text_content()),
          'timestamp': datetime.now().isoformat()
        }

        print(json.dumps(results, indent=2))
        with open('agent_output.json', 'w') as f:
            json.dump(results, f, indent=2)

        browser.close()

if __name__ == '__main__':
    run_agent()`,
      file_type: 'python'
    }
  ],
  agentql_queries: {
    main_query: `{
  product_name
  product_price
  product_rating
}`
  },
  icon_prompt: 'Futuristic icon for an Amazon Price Tracker Agent, electric blue, shopping cart symbol, minimalist, 4k, cyberpunk aesthetic'
};

export const mockGeminiResponse = {
  response: {
    text: () => JSON.stringify(mockBuildManifest)
  }
};

export const mockFreepikCreateResponse = {
  data: {
    task_id: 'test-task-123',
    status: 'pending'
  }
};

export const mockFreepikStatusResponse = {
  data: {
    task_id: 'test-task-123',
    status: 'completed',
    image_url: 'https://example.com/generated-icon.png'
  }
};

export const mockValidPythonCode = `import agentql
from playwright.sync_api import sync_playwright

def run_agent():
    print("Hello, World!")

if __name__ == '__main__':
    run_agent()
`;

export const mockInvalidPythonCode = `import agentql
from playwright.sync_api import sync_playwright

def run_agent(
    print("Missing closing parenthesis"

if __name__ == '__main__'
    run_agent()
`;
