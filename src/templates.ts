export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'monitoring' | 'scraping' | 'research' | 'automation';
  requiredPlugins: string[];
  defaultIntent: string;
  placeholders: {
    [key: string]: string;
  };
  examples: string[];
}

export const templates: AgentTemplate[] = [
  {
    id: 'price-monitor',
    name: 'Price Monitor',
    description: 'Track product prices and get alerts on changes',
    icon: '💰',
    category: 'monitoring',
    requiredPlugins: ['agentql', 'yutori'],
    defaultIntent: 'Monitor {product} prices on {website} and alert on drops',
    placeholders: {
      product: 'Product name (e.g., iPhone 15)',
      website: 'Website URL',
      customization: 'Alert conditions (optional)'
    },
    examples: ['iPhone on Amazon', 'Tesla stock', 'GPU prices on Newegg']
  },
  {
    id: 'news-tracker',
    name: 'News Tracker',
    description: 'Monitor news sites for specific topics',
    icon: '📰',
    category: 'monitoring',
    requiredPlugins: ['agentql', 'yutori'],
    defaultIntent: 'Track news about {topic} on {website}',
    placeholders: {
      topic: 'News topic (e.g., AI, Climate)',
      website: 'News website URL'
    },
    examples: ['AI releases on TechCrunch', 'Climate news on BBC']
  },
  {
    id: 'data-scraper',
    name: 'Data Scraper',
    description: 'Extract data from websites into structured format',
    icon: '🔍',
    category: 'scraping',
    requiredPlugins: ['agentql'],
    defaultIntent: 'Extract {data_type} from {website}',
    placeholders: {
      data_type: 'Type of data (e.g., Product listings)',
      website: 'Target website URL'
    },
    examples: ['Product listings', 'Job postings', 'Real estate data']
  },
  {
    id: 'content-aggregator',
    name: 'Content Aggregator',
    description: 'Gather content from multiple sources',
    icon: '📚',
    category: 'research',
    requiredPlugins: ['agentql'],
    defaultIntent: 'Collect {content_type} from {website} and other sources like {sources}',
    placeholders: {
      content_type: 'Content type (e.g., Blog posts)',
      sources: 'Other sources (optional)',
      website: 'Primary Website URL'
    },
    examples: ['Blog posts on AI', 'Research papers', 'Social media posts']
  },
  {
    id: 'form-filler',
    name: 'Form Automation',
    description: 'Automatically fill out web forms',
    icon: '📝',
    category: 'automation',
    requiredPlugins: ['agentql'],
    defaultIntent: 'Fill {form_type} on {website} with provided data',
    placeholders: {
      form_type: 'Form type (e.g., Survey)',
      website: 'Website with the form'
    },
    examples: ['Survey submissions', 'Application forms']
  },
  {
    id: 'custom-agent',
    name: 'Custom Agent',
    description: 'Build your own agent from scratch',
    icon: '🛠️',
    category: 'automation',
    requiredPlugins: ['agentql'],
    defaultIntent: '{custom_intent}',
    placeholders: {
      custom_intent: 'Describe what your agent should do',
      website: 'Target website URL'
    },
    examples: []
  }
];

export function getTemplateById(id: string): AgentTemplate | undefined {
  return templates.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string): AgentTemplate[] {
  return templates.filter(t => t.category === category);
}
