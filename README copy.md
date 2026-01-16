# Meta-Genesis: Autonomous Agent Factory

An AI system that creates AI agents. Meta-Genesis uses Gemini 3.5 Flash to architect, Cline to engineer, AgentQL to perceive, and Freepik to design custom web automation agents.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Python Dependencies

The generated agents use Python with AgentQL:

```bash
pip install agentql playwright
playwright install chromium
```

### 3. Configure Environment

Copy `.env.example` to `.env` and add your API keys:

```bash
# Get Gemini API key from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_key_here

# Get Freepik API key from: https://www.freepik.com/api
FREEPIK_API_KEY=your_key_here

# Optional: Ngrok auth token from: https://dashboard.ngrok.com/get-started/your-authtoken
NGROK_AUTH_TOKEN=your_token_here
```

### 4. Run the Server

**Development mode (with hot reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

## Architecture

```
User (Retool) → Express Server → Orchestrator
                                     ├─→ Gemini 3.5 Flash (Architect)
                                     ├─→ Cline Wrapper (Engineer)
                                     ├─→ AgentQL Templates (Perception)
                                     └─→ Freepik Mystic (Designer)
```

### Components

1. **Gemini Orchestrator** (`src/gemini.ts`)
   - Decomposes user intent into structured build manifests
   - Generates AgentQL queries from natural language
   - Outputs JSON specifications for agent creation

2. **Cline Wrapper** (`src/cline-wrapper.ts`)
   - Writes Python files to sandboxed directories
   - Verifies syntax before execution
   - Manages agent execution lifecycle

3. **Freepik Generator** (`src/freepik.ts`)
   - Creates custom icons for each agent
   - Maintains consistent branding via style references
   - Polls async generation tasks

4. **Meta-Genesis Orchestrator** (`src/orchestrator.ts`)
   - Coordinates the full agent generation pipeline
   - Manages timeline events for UI tracking
   - Handles async generation with status updates

## API Endpoints

### POST /genesis

Create a new agent.

**Request:**
```json
{
  "user_intent": "Track prices on Amazon",
  "target_url": "https://www.amazon.com/dp/B08N5WRWNW",
  "personality": "professional",
  "agent_name": "amazon_tracker"
}
```

**Response:**
```json
{
  "success": true,
  "agent_id": "uuid-here",
  "status_url": "/status/uuid-here"
}
```

### GET /status/:agentId

Get generation status and timeline.

**Response:**
```json
{
  "agent_id": "uuid",
  "status": "completed",
  "timeline": [
    {
      "timestamp": "2026-01-15T10:30:00Z",
      "event_name": "Gemini: Decomposing Intent",
      "status": "completed"
    }
  ],
  "icon_url": "https://...",
  "agent_files": ["path/to/agent.py"]
}
```

### GET /ping

Health check endpoint.

## Retool Integration

1. Create a new **REST API Resource** in Retool
2. Point it to your ngrok URL (shown when server starts)
3. Add a **Wizard Component** for input:
   - Step 1: User Intent (text input)
   - Step 2: Target URL (URL input)
   - Step 3: Personality (dropdown)
4. Add a **Timeline Component** for progress tracking
5. Add a **Table Component** for viewing generated agents

### Example Retool Query

```javascript
// In a REST query, POST to /genesis
{
  user_intent: wizard1.data.intent,
  target_url: wizard1.data.url,
  personality: wizard1.data.personality
}
```

## Generated Agent Structure

Each agent is created in `agents/<agent_name>_<id>/`:

```
agents/
  └── amazon_tracker_a1b2c3d4/
      ├── productContext.md       # Agent guidelines
      ├── amazon_tracker.py       # Main agent script
      └── agent_output.json       # Results (after execution)
```

## Running Generated Agents

```bash
cd agents/amazon_tracker_a1b2c3d4
python amazon_tracker.py
```

Output will be in `agent_output.json`.

## Development

### Project Structure

```
meta-genesis/
├── src/
│   ├── index.ts              # Express server
│   ├── orchestrator.ts       # Main orchestration logic
│   ├── gemini.ts            # Gemini API integration
│   ├── freepik.ts           # Freepik API integration
│   ├── cline-wrapper.ts     # File writing & execution
│   └── types.ts             # TypeScript definitions
├── templates/
│   └── base_agent.py        # Python template
├── prompts/
│   └── agentql_docs.md      # AgentQL documentation for AI
├── agents/                  # Generated agents (sandboxed)
└── dist/                    # Compiled TypeScript
```

### Key Technologies

- **Gemini 3.5 Flash**: Fast AI reasoning with 1M token context
- **AgentQL**: Self-healing semantic web selectors
- **Freepik Mystic**: High-fidelity AI image generation
- **Playwright**: Browser automation
- **Express + TypeScript**: Type-safe API server
- **Ngrok**: Secure local tunneling

## Troubleshooting

### "Module not found" errors

Make sure you've installed both Node and Python dependencies:
```bash
npm install
pip install agentql playwright
```

### Ngrok connection failed

The server will still work on localhost. To use Retool:
1. Get an ngrok auth token from https://dashboard.ngrok.com
2. Add it to your `.env` file
3. Restart the server

### Python syntax errors in generated agents

Check that the Gemini API key is valid and the model is responding correctly. The system includes syntax verification before execution.

### Agent execution fails

Ensure Playwright browsers are installed:
```bash
playwright install chromium
```

## License

MIT

## Hackathon Notes

Built for the Assemble Hackathon in San Jose.

**Prize Tracks:**
- Infinity Build Award (Cline CLI automation)
- Wakanda Data Award (AgentQL data resilience)
- Design Excellence (Freepik visual generation)
- Performance (Gemini 3.5 Flash speed)
