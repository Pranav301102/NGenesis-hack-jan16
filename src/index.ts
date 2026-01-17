import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import ngrok from 'ngrok';
import path from 'path';
import fs from 'fs';
import { MetaGenesisOrchestratorEnhanced } from './orchestrator-enhanced';
import { AgentRequest } from './types';
import { templates } from './templates';
import * as db from './db';
import { TinyFishAutomation } from './tinyfish';
import { FreepikGenerator } from './freepik';
import { YutoriMonitor } from './yutori';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize TinyFish/Mino API
const tinyfish = new TinyFishAutomation(process.env.AGENTQL_API_KEY || '');
console.log('✓ TinyFish/Mino automation enabled');

// Initialize Freepik for image generation
const freepik = process.env.FREEPIK_API_KEY 
  ? new FreepikGenerator(process.env.FREEPIK_API_KEY)
  : null;

// Initialize Yutori for monitoring
const yutori = process.env.YUTORI_API_KEY
  ? new YutoriMonitor(process.env.YUTORI_API_KEY, process.env.WEBHOOK_URL)
  : null;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// CORS for Retool
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Extend Request type with user
interface AuthRequest extends Request {
  user?: { userId: number; email: string };
}

// Auth middleware
function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = db.verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }

  req.user = decoded;
  next();
}

// Optional auth - doesn't fail if no token, but sets user if valid
function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = db.verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}

// Simple Gemini rate limiter (free tier: 15 requests/minute)
const geminiRateLimiter = {
  calls: [] as number[],
  maxCalls: 10,  // Be conservative
  windowMs: 60000,  // 1 minute
  
  async throttle(): Promise<void> {
    const now = Date.now();
    // Remove calls older than window
    this.calls = this.calls.filter(t => now - t < this.windowMs);
    
    if (this.calls.length >= this.maxCalls) {
      const oldestCall = this.calls[0];
      const waitTime = this.windowMs - (now - oldestCall) + 1000;
      console.log(`[Rate Limiter] Throttling Gemini API for ${Math.ceil(waitTime/1000)}s`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.calls = this.calls.filter(t => Date.now() - t < this.windowMs);
    }
    
    this.calls.push(Date.now());
  }
};

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Initialize orchestrator with integrations
console.log('\n⚡ Initializing NGenesis Integrations:');
const orchestrator = new MetaGenesisOrchestratorEnhanced(
  process.env.GEMINI_API_KEY || '',
  process.env.FREEPIK_API_KEY || '',
  process.env.STYLE_REFERENCE_URL,
  process.env.YUTORI_API_KEY,
  process.env.FABRICATE_API_KEY,
  process.env.MACROSCOPE_API_KEY,
  process.env.WEBHOOK_URL
);
console.log('✓ All integrations loaded\n');

// ==================== AUTH ENDPOINTS ====================

// Register
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const result = db.registerUser(email, password, name);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const result = db.loginUser(email, password);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(401).json(result);
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = db.getUserById(req.user!.userId);
  
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// ==================== EXISTING ENDPOINTS ====================

// Health check endpoint
app.get('/ping', (req: Request, res: Response) => {
  res.json({ status: 'pong', timestamp: new Date().toISOString() });
});

// Templates endpoint
app.get('/api/templates', (req: Request, res: Response) => {
  res.json(templates);
});

// Generate plan only (for review)
app.post('/genesis/plan', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { user_intent, target_url } = req.body;

    if (!user_intent) {
      return res.status(400).json({
        error: 'Missing required field: user_intent'
      });
    }

    // Use Gemini to generate execution plan
    const geminiAPI = orchestrator['gemini'];
    const model = geminiAPI['model'];
    
    const planPrompt = `You are an AI agent planning system. Create a detailed technical execution plan for this task:

TASK: "${user_intent}"
TARGET: "${target_url || 'Not specified'}"

Generate a structured plan with the following sections:

## 🎯 OBJECTIVE
What data will be extracted and why

## 🛠️ TECHNICAL APPROACH

### Web Automation Stack:
- **Tool**: TinyFish/Mino API (Cloud-based)
- **Mode**: Serverless browser automation
- **Features**: Self-healing selectors, AI-powered extraction

### Execution Flow:
1. Call TinyFish/Mino REST API
2. Send target URL: ${target_url || 'target URL'}
3. Send goal description in natural language
4. API runs browser in cloud and extracts data
5. Process and structure results
6. Return JSON response

## 🔍 AUTOMATION GOAL

Describe the extraction goal:
\`\`\`
Extract the following from the page:
- Item 1
- Item 2
- etc.
\`\`\`

## 📊 EXPECTED OUTPUT FORMAT

Show the JSON structure:
\`\`\`json
{
  "field_name": "sample value",
  "timestamp": "2026-01-16T12:00:00Z"
}
\`\`\`

## 🌐 API CALL PREVIEW

TinyFish/Mino API request:
\`\`\`python
import requests

response = requests.post(
    'https://mino.ai/v1/automation/run',
    headers={'X-API-Key': api_key},
    json={
        'url': '${target_url || 'target_url'}',
        'goal': 'Extract the data as specified'
    }
)
\`\`\`

## ⚠️ POTENTIAL CHALLENGES
- List any issues (dynamic content, authentication, etc.)

Format this clearly with sections and code blocks.`;

    await geminiRateLimiter.throttle();
    const result = await model.generateContent(planPrompt);
    const plan = result.response.text();

    res.json({
      success: true,
      plan: plan,
      user_intent,
      target_url
    });

  } catch (error: any) {
    console.error('[Server] Plan generation error:', error);
    res.status(500).json({
      error: 'Plan generation failed',
      details: error.message
    });
  }
});

// New orchestration endpoint - analyzes task and determines which tools to use
app.post('/genesis/orchestrate', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { user_intent, target_url, output_format, selected_tools } = req.body;

    if (!user_intent) {
      return res.status(400).json({
        error: 'Missing required field: user_intent'
      });
    }

    const geminiAPI = orchestrator['gemini'];
    const model = geminiAPI['model'];
    
    // Use user-selected tools if provided, otherwise determine automatically
    let toolsData: { tools_used: Array<{name: string, usage: string}>, workflow_summary: string } = { 
      tools_used: [], 
      workflow_summary: '' 
    };
    
    if (selected_tools && Array.isArray(selected_tools) && selected_tools.length > 0) {
      // User manually selected tools - use those directly
      const toolDescriptions: Record<string, string> = {
        gemini: 'AI reasoning, planning, and text generation',
        tinyfish: 'Web automation and data extraction',
        freepik: 'AI image generation',
        yutori: 'Continuous monitoring and alerts',
        fabricate: 'Synthetic test data generation',
        macroscope: 'Code analysis and review'
      };
      
      toolsData.tools_used = selected_tools.map((toolId: string) => ({
        name: toolId,
        usage: toolDescriptions[toolId] || 'General purpose tool'
      }));
      toolsData.workflow_summary = `Using user-selected tools: ${selected_tools.join(', ')}`;
      
      console.log('[Server] Using user-selected tools:', selected_tools);
    } else {
      // Auto-detect tools (original behavior)
      const toolAnalysisPrompt = `You are an AI orchestrator that determines which tools to use for a task.

AVAILABLE TOOLS:
1. **Gemini** - AI reasoning, planning, text generation, summarization
2. **TinyFish** - Self-healing web scraping, data extraction from websites
3. **Freepik** - AI image generation (for blog images, illustrations, graphics)
4. **Yutori** - Continuous monitoring, watching for changes over time, alerts

USER TASK: "${user_intent}"
${target_url ? `TARGET URL: "${target_url}"` : ''}
OUTPUT FORMAT: "${output_format || 'text'}"

Analyze the task and respond with a JSON object:
{
  "tools_used": [
    {"name": "gemini", "usage": "brief description of how this tool will be used"},
    {"name": "tinyfish", "usage": "brief description"},
    ...
  ],
  "workflow_summary": "2-3 sentence summary of the overall workflow",
  "requires_monitoring": true/false,
  "requires_image": true/false
}

Only include tools that are actually needed. Be specific about usage.`;

      await geminiRateLimiter.throttle();
      const toolResult = await model.generateContent(toolAnalysisPrompt);
      const toolAnalysis = toolResult.response.text();
      
      // Extract JSON from response
      const jsonMatch = toolAnalysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          toolsData = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error('[Server] Failed to parse tool analysis:', e);
        }
      }
    }

    // Now generate the full orchestration plan
    const planPrompt = `You are an AI agent orchestrator. Create a detailed execution plan for this multi-tool task:

TASK: "${user_intent}"
${target_url ? `TARGET URL: "${target_url}"` : ''}
OUTPUT FORMAT: "${output_format || 'text'}"

TOOLS BEING USED:
${toolsData.tools_used.map((t: any) => `- ${t.name}: ${t.usage}`).join('\n')}

Generate a clear orchestration plan:

## 🎯 MISSION OBJECTIVE
What the user will receive at the end

## 🔄 ORCHESTRATION FLOW
Step-by-step how the tools will work together:

${toolsData.tools_used.some((t: any) => t.name === 'tinyfish') ? `### Step 1: Data Collection (TinyFish/Mino)
- What data will be scraped
- The automation goal` : ''}

${toolsData.tools_used.some((t: any) => t.name === 'gemini') ? `### Step 2: AI Processing (Gemini 2.0)
- How the data will be analyzed/summarized
- What insights will be generated` : ''}

${toolsData.tools_used.some((t: any) => t.name === 'freepik') ? `### Step 3: Image Generation (Freepik)
- What image will be created
- Style and composition details` : ''}

${toolsData.tools_used.some((t: any) => t.name === 'yutori') ? `### Step 4: Monitoring Setup (Yutori)
- What will be monitored
- How often and what triggers alerts` : ''}

## 📊 EXPECTED OUTPUT
Show what the final output will look like

## ⏱️ ESTIMATED TIME
How long each step will take

Be concise and actionable. Format with clear sections.`;

    await geminiRateLimiter.throttle();
    const planResult = await model.generateContent(planPrompt);
    const plan = planResult.response.text();

    res.json({
      success: true,
      plan: plan,
      tools_used: toolsData.tools_used,
      workflow_summary: toolsData.workflow_summary,
      requires_monitoring: (toolsData as any).requires_monitoring || false,
      requires_image: (toolsData as any).requires_image || false,
      user_intent,
      target_url
    });

  } catch (error: any) {
    console.error('[Server] Orchestration planning error:', error);
    res.status(500).json({
      error: 'Orchestration planning failed',
      details: error.message
    });
  }
});

// Main agent genesis endpoint (now with optional auth)
app.post('/genesis', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const agentRequest: AgentRequest = req.body;

    // Validate request - target_url is now optional for some tasks
    if (!agentRequest.user_intent) {
      return res.status(400).json({
        error: 'Missing required field: user_intent'
      });
    }

    console.log('[Server] Genesis request received:', agentRequest);

    // Create agent (async)
    const agentId = await orchestrator.createAgent(agentRequest);

    // Save to database if user is authenticated
    if (req.user) {
      db.saveAgent({
        id: agentId,
        user_id: req.user.userId,
        name: agentRequest.agent_name,
        template_id: agentRequest.template_id,
        user_intent: agentRequest.user_intent,
        target_url: agentRequest.target_url,
        status: 'initializing',
        output_format: agentRequest.output_format || 'view'
      });
    }

    res.json({
      success: true,
      agent_id: agentId,
      message: 'Agent generation started',
      status_url: `/status/${agentId}`
    });

  } catch (error: any) {
    console.error('[Server] Error:', error);
    res.status(500).json({
      error: 'Agent generation failed',
      details: error.message
    });
  }
});

// Get status of specific agent
app.get('/status/:agentId', (req: Request, res: Response) => {
  const agentId = req.params.agentId as string;

  const status = orchestrator.getStatus(agentId);

  if (!status) {
    return res.status(404).json({
      error: 'Agent not found'
    });
  }

  res.json(status);
});

// Get all agent statuses (for Retool dashboard)
app.get('/status', optionalAuth, (req: AuthRequest, res: Response) => {
  const statuses = orchestrator.getAllStatuses();

  res.json({
    total: statuses.length,
    agents: statuses
  });
});

// Get user's agents from database
app.get('/api/my-agents', authMiddleware, (req: AuthRequest, res: Response) => {
  const agents = db.getAgentsByUser(req.user!.userId);
  const stats = db.getUserStats(req.user!.userId);
  
  res.json({
    total: agents.length,
    stats,
    agents
  });
});

// Timeline endpoint (Retool-compatible)
app.get('/timeline/:agentId', (req: Request, res: Response) => {
  const agentId = req.params.agentId as string;

  const status = orchestrator.getStatus(agentId);

  if (!status) {
    return res.status(404).json({
      error: 'Agent not found'
    });
  }

  // Return timeline in Retool-compatible format
  res.json({
    agent_id: agentId,
    status: status.status,
    events: status.timeline
  });
});

// Run agent endpoint - executes the generated agent and returns results
app.post('/agent/:agentId/run', async (req: Request, res: Response) => {
  const agentId = req.params.agentId as string;
  const useTinyfish = req.query.engine === 'tinyfish' || req.body.engine === 'tinyfish';

  const status = orchestrator.getStatus(agentId);

  if (!status) {
    return res.status(404).json({
      error: 'Agent not found'
    });
  }

  if (status.status !== 'completed') {
    return res.status(400).json({
      error: 'Agent is not ready. Wait for generation to complete.',
      current_status: status.status
    });
  }

  try {
    // Get target URL from multiple sources (prefer context)
    let targetUrl = req.body.target_url || status.context?.target_url || '';
    
    // Fallback: Try to extract URL from timeline events
    if (!targetUrl) {
      const planEvent = status.timeline?.find((e: any) => e.details?.includes('http'));
      if (planEvent?.details) {
        const urlMatch = planEvent.details.match(/https?:\/\/[^\s"']+/);
        if (urlMatch) targetUrl = urlMatch[0];
      }
    }
    
    // Get the actual user intent from context (not timeline description)
    const userIntent = status.context?.user_intent || req.body.goal || 'Extract all relevant data from the page';
    
    console.log(`[Server] Target URL for agent: ${targetUrl || 'NOT FOUND'}`);
    console.log(`[Server] User Intent: ${userIntent}`);

    // Use TinyFish/Mino API for execution (recommended)
    if (process.env.AGENTQL_API_KEY && targetUrl) {
      console.log(`[Server] Running agent via TinyFish/Mino API`);
      console.log(`[Server] URL: ${targetUrl}`);
      
      // Use the actual user intent as goal, not the plan description
      const goal = `${userIntent}. Respond in JSON format.`;
      console.log(`[Server] Goal: ${goal}`);
      
      // Call TinyFish API with 60 second timeout
      const tinyfishResult = await tinyfish.runAutomation(targetUrl, goal);

      if (tinyfishResult.success) {
        return res.json({
          success: true,
          agent_id: agentId,
          engine: 'tinyfish',
          results: tinyfishResult.result,
          message: 'Agent executed via TinyFish/Mino API'
        });
      } else {
        console.log('[Server] TinyFish API returned error:', tinyfishResult.error);
        // Continue to fallback
      }
    } else {
      console.log('[Server] Cannot run TinyFish: missing API key or target URL');
      console.log(`[Server] API Key set: ${!!process.env.AGENTQL_API_KEY}, URL: ${targetUrl || 'none'}`);
    }

    // If TinyFish failed or no URL, return demo response with helpful info
    return res.json({
      success: true,
      agent_id: agentId,
      engine: 'demo',
      results: generateSampleResults(status),
      message: targetUrl 
        ? 'TinyFish API call failed - showing demo results' 
        : 'No target URL found - showing demo results',
      target_url_found: targetUrl || null,
      tinyfish_error: 'Check server logs for API error details'
    });

  } catch (error: any) {
    console.error('[Server] Error running agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run agent',
      details: error.message,
      hint: 'Check TinyFish/Mino API key and try again'
    });
  }
});

// Multi-tool orchestration endpoint with FEEDBACK LOOP
// Gemini orchestrates all selected tools and synthesizes final output
app.post('/agent/:agentId/orchestrate', async (req: Request, res: Response) => {
  const agentId = req.params.agentId as string;
  const selectedTools = req.body.selected_tools || ['gemini', 'tinyfish'];
  
  const status = orchestrator.getStatus(agentId);
  
  if (!status) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  const results: any = {
    agent_id: agentId,
    tools_used: [],
    outputs: {},
    iterations: []
  };
  
  try {
    const targetUrl = status.context?.target_url || req.body.target_url;
    const userIntent = status.context?.user_intent || req.body.goal;
    
    console.log(`[Orchestrator] Running multi-tool pipeline with feedback loop`);
    console.log(`[Orchestrator] User Intent: ${userIntent}`);
    console.log(`[Orchestrator] Selected tools: ${selectedTools.join(', ')}`);
    
    // Get Gemini model for orchestration
    const geminiAPI = orchestrator['gemini'];
    const model = geminiAPI['model'];
    
    // ========== ITERATION 1: Initial Tool Execution ==========
    console.log('[Orchestrator] === ITERATION 1: Initial Tool Execution ===');
    results.iterations.push({ phase: 'initial_execution', started: new Date().toISOString() });
    
    // Step 1: TinyFish for web data extraction
    if (selectedTools.includes('tinyfish') && targetUrl && process.env.AGENTQL_API_KEY) {
      console.log('[Orchestrator] Step 1: TinyFish data extraction...');
      const tinyfishResult = await tinyfish.runAutomation(
        targetUrl,
        `${userIntent}. Respond in JSON format with structured data.`
      );
      
      if (tinyfishResult.success) {
        results.tools_used.push('tinyfish');
        results.outputs.tinyfish = tinyfishResult.result;
        console.log('[Orchestrator] TinyFish completed successfully');
      } else {
        results.outputs.tinyfish = { error: tinyfishResult.error };
      }
    }
    
    // Step 2: Freepik for image generation
    if (selectedTools.includes('freepik') && freepik && process.env.FREEPIK_API_KEY) {
      console.log('[Orchestrator] Step 2: Freepik image generation...');
      
      let imagePrompt = '';
      if (results.outputs.tinyfish?.ai_news_summary) {
        const summary = results.outputs.tinyfish.ai_news_summary;
        imagePrompt = `Professional blog header image for an article about AI innovation. Key themes: ${
          summary.top_5_developments?.slice(0, 3).map((d: any) => d.title).join(', ') || 'AI technology trends'
        }. Modern, futuristic, tech-inspired design with blue and purple gradients, abstract neural network patterns, 4K quality`;
      } else {
        imagePrompt = `Professional blog header image for: ${userIntent}. Modern tech design, futuristic, blue gradients, 4K quality`;
      }
      
      try {
        const imageUrl = await freepik.generateAgentIcon(imagePrompt);
        results.tools_used.push('freepik');
        results.outputs.freepik = { status: 'success', image_url: imageUrl, prompt_used: imagePrompt };
        console.log('[Orchestrator] Freepik completed successfully');
      } catch (freepikError: any) {
        results.outputs.freepik = { status: 'error', error: freepikError.message };
      }
    }
    
    // Step 3: Yutori for monitoring
    if (selectedTools.includes('yutori') && yutori && targetUrl) {
      console.log('[Orchestrator] Step 3: Yutori monitoring setup...');
      results.tools_used.push('yutori');
      results.outputs.yutori = { status: 'ready', url: targetUrl };
    }
    
    results.iterations[0].completed = new Date().toISOString();
    results.iterations[0].tools_executed = [...results.tools_used];
    
    // ========== ITERATION 2: Gemini Feedback & Synthesis ==========
    // Only run synthesis if we have actual tool outputs (avoid wasting API calls)
    const hasToolOutputs = Object.keys(results.outputs).some(k => {
      const output = results.outputs[k];
      return output && !output.error;
    });
    
    if (!hasToolOutputs) {
      console.log('[Orchestrator] No successful tool outputs - skipping synthesis to save API calls');
      results.success = true;
      results.message = 'No tools produced output. Check tool configuration.';
      return res.json(results);
    }
    
    console.log('[Orchestrator] === ITERATION 2: Gemini Feedback & Synthesis ===');
    results.iterations.push({ phase: 'gemini_synthesis', started: new Date().toISOString() });
    
    const synthesisPrompt = `You are an AI orchestrator that synthesizes outputs from multiple tools into a cohesive final result.

## ORIGINAL USER REQUEST
"${userIntent}"

## TARGET URL
${targetUrl || 'Not specified'}

## TOOL OUTPUTS

${Object.entries(results.outputs).map(([tool, output]) => `
### ${tool.toUpperCase()} Output:
\`\`\`json
${JSON.stringify(output, null, 2)}
\`\`\`
`).join('\n')}

## YOUR TASK

1. **Analyze** all tool outputs above
2. **Synthesize** a comprehensive final response that addresses the user's original request
3. **Identify** any gaps or areas that could be improved
4. **Provide** actionable recommendations

Respond with a JSON object:
{
  "final_response": {
    "summary": "Executive summary of findings",
    "key_insights": ["insight 1", "insight 2", ...],
    "detailed_content": "Full synthesized content addressing user's request",
    "generated_assets": {
      "images": ["url1", ...],
      "data": {}
    }
  },
  "quality_assessment": {
    "completeness_score": 1-10,
    "data_quality_score": 1-10,
    "missing_elements": ["element1", ...],
    "recommendations": ["rec1", ...]
  },
  "pipeline_feedback": {
    "tools_that_worked_well": ["tool1", ...],
    "tools_that_need_improvement": ["tool1", ...],
    "suggested_additional_tools": ["tool1", ...],
    "should_iterate": true/false,
    "iteration_reason": "why another iteration would help (if any)"
  }
}`;

    await geminiRateLimiter.throttle();
    const synthesisResult = await model.generateContent(synthesisPrompt);
    const synthesisText = synthesisResult.response.text();
    
    // Parse the synthesis response
    const jsonMatch = synthesisText.match(/\{[\s\S]*\}/);
    let synthesis: any = null;
    
    if (jsonMatch) {
      try {
        synthesis = JSON.parse(jsonMatch[0]);
        results.synthesis = synthesis;
        console.log('[Orchestrator] Gemini synthesis completed');
        console.log(`[Orchestrator] Completeness: ${synthesis.quality_assessment?.completeness_score}/10`);
        console.log(`[Orchestrator] Should iterate: ${synthesis.pipeline_feedback?.should_iterate}`);
      } catch (e) {
        console.error('[Orchestrator] Failed to parse synthesis:', e);
        results.synthesis = { raw_response: synthesisText };
      }
    }
    
    results.iterations[1].completed = new Date().toISOString();
    
    // ========== ITERATION 3: Optional Refinement (DISABLED to save API calls) ==========
    // Set ENABLE_REFINEMENT=true in .env to enable this
    const enableRefinement = process.env.ENABLE_REFINEMENT === 'true';
    if (enableRefinement && synthesis?.pipeline_feedback?.should_iterate && synthesis?.quality_assessment?.completeness_score < 5) {
      console.log('[Orchestrator] === ITERATION 3: Refinement Needed ===');
      results.iterations.push({ phase: 'refinement', started: new Date().toISOString() });
      
      const refinementPrompt = `Based on the previous analysis, the pipeline needs refinement.

## MISSING ELEMENTS
${synthesis.quality_assessment.missing_elements?.join(', ') || 'None identified'}

## RECOMMENDATIONS
${synthesis.quality_assessment.recommendations?.join('\n') || 'None'}

## ITERATION REASON
${synthesis.pipeline_feedback.iteration_reason || 'General improvement needed'}

Please provide an improved final response that addresses these gaps. Focus on:
1. Filling in missing information
2. Improving data quality
3. Making the output more actionable

Respond with improved content only.`;

      await geminiRateLimiter.throttle();
      const refinementResult = await model.generateContent(refinementPrompt);
      results.refinement = refinementResult.response.text();
      results.iterations[2].completed = new Date().toISOString();
      console.log('[Orchestrator] Refinement completed');
    }
    
    // ========== Final Response ==========
    results.success = true;
    results.message = `Orchestration complete with ${results.iterations.length} iterations. Used ${results.tools_used.length} tools.`;
    results.final_output = synthesis?.final_response || {
      summary: 'Pipeline completed successfully',
      tools_used: results.tools_used,
      outputs: results.outputs
    };
    
    console.log('[Orchestrator] Pipeline complete!');
    res.json(results);
    
  } catch (error: any) {
    console.error('[Orchestrator] Pipeline error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      partial_results: results
    });
  }
});

// Generate sample results based on agent type (fallback for demo)
function generateSampleResults(status: any) {
  // Extract intent from timeline to determine result type
  const events = status.timeline || [];
  const planEvent = events.find((e: any) => e.event_name?.includes('Plan Created'));
  
  // Generate contextual sample data
  return {
    timestamp: new Date().toISOString(),
    agent_id: status.agent_id,
    status: 'success',
    data: [
      {
        title: 'Sample Result 1',
        value: '$999.99',
        source: 'Target Website',
        extracted_at: new Date().toISOString()
      },
      {
        title: 'Sample Result 2',
        value: '$899.99',
        source: 'Target Website',
        extracted_at: new Date().toISOString()
      },
      {
        title: 'Sample Result 3',
        value: '$1,049.99',
        source: 'Target Website',
        extracted_at: new Date().toISOString()
      }
    ],
    metadata: {
      execution_time_ms: 1523,
      items_found: 3,
      quality_score: status.code_quality_score || 85
    }
  };
}

// Get agent files and their content
app.get('/agent/:agentId/files', (req: Request, res: Response) => {
  const agentId = req.params.agentId as string;

  const status = orchestrator.getStatus(agentId);

  if (!status) {
    return res.status(404).json({
      error: 'Agent not found'
    });
  }

  const files: { filename: string; content: string; language: string }[] = [];

  if (status.agent_files && status.agent_files.length > 0) {
    for (const filePath of status.agent_files) {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const filename = path.basename(filePath);
          const ext = path.extname(filePath).slice(1);
          const languageMap: Record<string, string> = {
            'py': 'python',
            'js': 'javascript',
            'ts': 'typescript',
            'json': 'json',
            'md': 'markdown'
          };
          files.push({
            filename,
            content,
            language: languageMap[ext] || ext
          });
        }
      } catch (err) {
        console.error(`Failed to read file: ${filePath}`, err);
      }
    }
  }

  res.json({
    agent_id: agentId,
    status: status.status,
    icon_url: status.icon_url,
    code_quality_score: status.code_quality_score,
    monitoring_active: status.monitoring_active,
    yutori_scout_id: status.yutori_scout_id,
    files
  });
});

// Yutori Scouts endpoints
app.get('/scouts', async (req: Request, res: Response) => {
  try {
    const scouts = await orchestrator.getYutoriScouts();
    res.json({
      total: scouts.length,
      scouts
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch scouts',
      details: error.message
    });
  }
});

// TinyFish/Mino Direct Automation Endpoint
app.post('/api/tinyfish/run', async (req: Request, res: Response) => {
  try {
    const { url, goal } = req.body;

    if (!url || !goal) {
      return res.status(400).json({
        error: 'Missing required fields: url and goal'
      });
    }

    console.log(`[TinyFish API] Running automation: ${goal}`);
    const result = await tinyfish.runAutomation(url, goal);

    res.json(result);

  } catch (error: any) {
    console.error('[TinyFish API] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TinyFish Extract Data endpoint
app.post('/api/tinyfish/extract', async (req: Request, res: Response) => {
  try {
    const { url, dataDescription } = req.body;

    if (!url || !dataDescription) {
      return res.status(400).json({
        error: 'Missing required fields: url and dataDescription'
      });
    }

    const result = await tinyfish.extractData(url, dataDescription);
    res.json(result);

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available tools/integrations
app.get('/api/tools', (req: Request, res: Response) => {
  res.json({
    tools: [
      {
        id: 'gemini',
        name: 'Gemini 2.5',
        description: 'AI reasoning, planning, and text generation',
        icon: '🧠',
        enabled: !!process.env.GEMINI_API_KEY,
        category: 'ai'
      },
      {
        id: 'tinyfish',
        name: 'Web Scraping',
        description: 'Extract data from any website',
        icon: '🤖',
        enabled: !!process.env.AGENTQL_API_KEY,
        category: 'automation'
      },
      {
        id: 'freepik',
        name: 'Image Generation',
        description: 'Create AI-generated images',
        icon: '🎨',
        enabled: !!process.env.FREEPIK_API_KEY,
        category: 'media'
      },
      {
        id: 'yutori',
        name: 'Continuous Monitoring',
        description: 'Watch websites for changes & alerts',
        icon: '👁️',
        enabled: !!process.env.YUTORI_API_KEY,
        category: 'monitoring'
      },
      {
        id: 'fabricate',
        name: 'Fabricate',
        description: 'Synthetic test data generation',
        icon: '🧪',
        enabled: !!process.env.FABRICATE_API_KEY,
        category: 'testing'
      },
      {
        id: 'macroscope',
        name: 'Macroscope',
        description: 'AI code review & quality analysis',
        icon: '🔍',
        enabled: true, // Always available via local analysis
        category: 'quality'
      }
    ]
  });
});

app.delete('/scouts/:taskId', async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    await orchestrator.stopYutoriScout(taskId);
    res.json({
      success: true,
      message: `Scout ${taskId} stopped`
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to stop scout',
      details: error.message
    });
  }
});

// Stats endpoint
app.get('/api/stats', (req: Request, res: Response) => {
  const statuses = orchestrator.getAllStatuses();

  const stats = {
    total_agents: statuses.length,
    completed_agents: statuses.filter(s => s.status === 'completed').length,
    active_monitoring: statuses.filter(s => s.monitoring_active).length,
    average_quality_score: Math.round(
      statuses
        .filter(s => s.code_quality_score)
        .reduce((sum, s) => sum + (s.code_quality_score || 0), 0) /
      (statuses.filter(s => s.code_quality_score).length || 1)
    ),
    integrations_active: {
      yutori: statuses.some(s => s.monitoring_active),
      scraping: true,
      image_gen: statuses.some(s => s.icon_url)
    }
  };

  res.json(stats);
});

// Start server
async function startServer() {
  app.listen(PORT, async () => {
    console.log(`\n⚡ NGenesis Server Running`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`\n🎨 Open your browser to start creating agents!`);
    
    // Optional: Try to start ngrok but don't fail if it doesn't work
    if (process.env.NGROK_AUTH_TOKEN) {
      console.log(`\n⏳ Starting ngrok tunnel...`);
      try {
        const url = await ngrok.connect({
          addr: PORT,
          authtoken: process.env.NGROK_AUTH_TOKEN
        });

        console.log(`\n✅ Ngrok tunnel active!`);
        console.log(`🌐 Public URL: ${url}`);
      } catch (error: any) {
        console.log('⚠️  Ngrok not available (running locally only)');
      }
    }
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await ngrok.kill();
  process.exit(0);
});

startServer();

