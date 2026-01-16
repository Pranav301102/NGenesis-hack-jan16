import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import ngrok from 'ngrok';
import path from 'path';
import { MetaGenesisOrchestratorEnhanced } from './orchestrator-enhanced';
import { AgentRequest } from './types';

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
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

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

// Health check endpoint
app.get('/ping', (req: Request, res: Response) => {
  res.json({ status: 'pong', timestamp: new Date().toISOString() });
});

// Main agent genesis endpoint
app.post('/genesis', async (req: Request, res: Response) => {
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
app.get('/status', (req: Request, res: Response) => {
  const statuses = orchestrator.getAllStatuses();

  res.json({
    total: statuses.length,
    agents: statuses
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
    console.log(`\n🚀 Meta-Genesis Server Running`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`\n⏳ Starting ngrok tunnel...`);

    try {
      // Start ngrok tunnel
      const url = await ngrok.connect({
        addr: PORT,
        authtoken: process.env.NGROK_AUTH_TOKEN
      });

      console.log(`\n✅ Ngrok tunnel active!`);
      console.log(`🌐 Public URL: ${url}`);
      console.log(`\n📝 Configure Retool to point to: ${url}`);
      console.log(`\n🧪 Test with: curl ${url}/ping`);
      console.log(`\n🎯 Genesis endpoint: POST ${url}/genesis`);
      console.log(`   Body: { "user_intent": "...", "target_url": "..." }`);

    } catch (error) {
      console.error('❌ Failed to start ngrok:', error);
      console.log('⚠️  Server running on localhost only');
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
