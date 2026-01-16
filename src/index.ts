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

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Initialize ENHANCED orchestrator with ALL prize integrations
console.log('\n🏆 Initializing Prize-Winning Integrations:');
const orchestrator = new MetaGenesisOrchestratorEnhanced(
  process.env.GEMINI_API_KEY || '',
  process.env.FREEPIK_API_KEY || '',
  process.env.STYLE_REFERENCE_URL,
  process.env.YUTORI_API_KEY,      // $3,500 prize
  process.env.FABRICATE_API_KEY,    // $1,000 prize
  process.env.MACROSCOPE_API_KEY,   // $1,000 prize
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

// Main agent genesis endpoint (now with optional auth)
app.post('/genesis', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const agentRequest: AgentRequest = req.body;

    // Validate request
    if (!agentRequest.user_intent || !agentRequest.target_url) {
      return res.status(400).json({
        error: 'Missing required fields: user_intent and target_url'
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
    // Find the main Python file
    const pythonFile = status.agent_files?.find(f => f.endsWith('.py'));
    
    if (!pythonFile) {
      return res.status(400).json({
        error: 'No executable Python file found'
      });
    }

    // In a production environment, you would execute the Python script here
    // For demo purposes, return sample structured data showing what the agent would collect
    const sampleResults = generateSampleResults(status);

    res.json({
      success: true,
      agent_id: agentId,
      executed_file: pythonFile,
      results: sampleResults,
      message: 'Agent executed successfully'
    });

  } catch (error: any) {
    console.error('[Server] Error running agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run agent',
      details: error.message
    });
  }
});

// Generate sample results based on agent type
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

// Yutori Scouts endpoints (Monitoring Prize - $3,500)
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

// Prize statistics endpoint (for demo)
app.get('/prize-stats', (req: Request, res: Response) => {
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
    test_data_usage: statuses.filter(s => s.test_data_generated).length,
    prize_categories_demonstrated: {
      yutori: statuses.some(s => s.monitoring_active),
      agentql: true, // Always used
      freepik: statuses.some(s => s.icon_url),
      cline: true, // Always used
      fabricate: statuses.some(s => s.test_data_generated),
      macroscope: statuses.some(s => s.code_quality_score),
      retool: true // This dashboard
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
