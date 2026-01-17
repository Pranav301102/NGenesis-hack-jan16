// Core types for Meta-Genesis system

export interface AgentRequest {
  user_intent: string;
  target_url: string;
  personality?: 'professional' | 'aggressive' | 'friendly';
  agent_name?: string;
  template_id?: string;
  output_format?: 'view' | 'json' | 'csv' | 'api' | 'text' | 'image' | 'both';
}

export interface BuildManifest {
  agent_name: string;
  description: string;
  files: FileDefinition[];
  agentql_queries: Record<string, string>;
  icon_prompt: string;
}

export interface FileDefinition {
  filename: string;
  code_content: string;
  file_type: 'python' | 'typescript' | 'json';
}

export interface TimelineEvent {
  timestamp: string;
  event_name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  details?: string;
}

export interface AgentGenerationStatus {
  agent_id: string;
  status: 'initializing' | 'planning' | 'decomposing' | 'fabricating' | 'verifying' | 'reviewing' | 'deploying' | 'monitoring' | 'completed' | 'failed';
  timeline: TimelineEvent[];
  icon_url?: string;
  agent_files?: string[];
  error?: string;
  // Context for execution
  context?: {
    target_url: string;
    user_intent: string;
    personality: string;
  };
  // Prize-related features
  yutori_scout_id?: string;
  code_quality_score?: number;
  test_data_generated?: boolean;
  monitoring_active?: boolean;
}

export interface FreepikMysticRequest {
  prompt: string;
  aspect_ratio?: 'square_1_1' | 'classic_4_3' | 'traditional_3_4' | 'widescreen_16_9' | 'social_story_9_16';
  style_reference?: string;
  structure_reference?: string;
  structure_strength?: number;
  resolution?: '1k' | '2k' | '4k';
  model?: 'realism' | 'fluid' | 'zen' | 'flexible' | 'super_real' | 'editorial_portraits';
  creative_detailing?: number;
  webhook_url?: string;
}

export interface FreepikMysticResponse {
  data: {
    task_id: string;
    status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    generated: string[];
    has_nsfw?: boolean[];
  };
}

export interface GeminiPromptContext {
  user_intent: string;
  target_url: string;
  personality: string;
  agentql_docs: string;
  cline_docs: string;
}

// Extended types for prize integrations
export interface AgentRequestExtended extends AgentRequest {
  enable_monitoring?: boolean; // Yutori
  generate_test_data?: boolean; // Fabricate
  run_code_review?: boolean; // Macroscope
  autonomous_mode?: boolean; // Cline
}

export interface YutoriScoutInfo {
  task_id: string;
  status: string;
  query: string;
  created_at: string;
}

export interface TestDataInfo {
  generated: boolean;
  rows: number;
  validation_passed: boolean;
}

export interface CodeReviewInfo {
  score: number;
  issues_found: number;
  complexity: string;
  summary: string;
}
