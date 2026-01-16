# Meta-Genesis Setup Guide

Complete setup instructions for the hackathon demo.

## Prerequisites

### System Requirements
- Node.js 18+ and npm
- Python 3.8+
- Git

### API Keys Needed

1. **Gemini API Key**
   - Visit: https://aistudio.google.com/app/apikey
   - Click "Create API Key"
   - Copy the key

2. **Freepik API Key**
   - Visit: https://www.freepik.com/api
   - Sign up for API access
   - Get your API key from dashboard

3. **Ngrok Auth Token** (Optional but recommended)
   - Visit: https://dashboard.ngrok.com/get-started/your-authtoken
   - Sign up for free account
   - Copy your auth token

## Installation Steps

### 1. Clone/Extract Project

```bash
cd meta-genesis
```

### 2. Install Node Dependencies

```bash
npm install
```

### 3. Install Python Dependencies

```bash
# Install AgentQL and Playwright
pip install agentql playwright

# Install browser binaries
playwright install chromium
```

### 4. Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your keys
# Use notepad, VS Code, or any text editor
notepad .env
```

Add your actual keys:
```env
GEMINI_API_KEY=AIzaSy...
FREEPIK_API_KEY=fpk_...
NGROK_AUTH_TOKEN=2a...
```

### 5. Build TypeScript

```bash
npm run build
```

### 6. Start Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

You should see:
```
🚀 Meta-Genesis Server Running
📍 Local: http://localhost:3000
⏳ Starting ngrok tunnel...
✅ Ngrok tunnel active!
🌐 Public URL: https://abc123.ngrok.io
```

**Copy the ngrok URL** - you'll need it for Retool!

## Testing the API

### Using PowerShell (Windows)

```powershell
.\test-api.ps1
```

### Using Bash (Mac/Linux)

```bash
chmod +x test-api.sh
./test-api.sh
```

### Using curl manually

```bash
# Health check
curl http://localhost:3000/ping

# Create agent
curl -X POST http://localhost:3000/genesis \
  -H "Content-Type: application/json" \
  -d '{
    "user_intent": "Track Amazon prices",
    "target_url": "https://www.amazon.com/dp/B08N5WRWNW",
    "personality": "professional"
  }'

# Check status (replace with actual agent_id)
curl http://localhost:3000/status/YOUR_AGENT_ID
```

## Retool Setup

### Step 1: Create REST API Resource

1. Open Retool
2. Go to **Resources** → **Create New**
3. Select **REST API**
4. Name: `Meta-Genesis API`
5. Base URL: `https://YOUR_NGROK_URL.ngrok.io` (from server startup)
6. Save

### Step 2: Create the App

1. Create new **App**
2. Name: `Meta-Genesis Control Panel`

### Step 3: Add Components

#### Input Wizard

1. Drag **Wizard** component to canvas
2. Configure 3 steps:
   - **Step 1**: "What should the agent do?"
     - Add Text Input: `user_intent`
     - Placeholder: "e.g., Track prices on Amazon"

   - **Step 2**: "Target URL"
     - Add Text Input: `target_url`
     - Placeholder: "https://example.com"

   - **Step 3**: "Personality"
     - Add Select: `personality`
     - Options: professional, aggressive, friendly

#### Timeline Display

1. Drag **Timeline** component to canvas
2. Data source: `{{ statusQuery.data.timeline }}`
3. Title field: `event_name`
4. Timestamp field: `timestamp`
5. Status field: `status`

#### Results Table

1. Drag **Table** component to canvas
2. Data source: `{{ allAgentsQuery.data.agents }}`
3. Show columns: agent_id, status, icon_url

### Step 4: Create Queries

#### Query 1: Create Agent (createAgentQuery)

- Resource: Meta-Genesis API
- Method: POST
- Path: `/genesis`
- Body:
```json
{
  "user_intent": {{ wizard1.data.step1.user_intent }},
  "target_url": {{ wizard1.data.step2.target_url }},
  "personality": {{ wizard1.data.step3.personality }}
}
```
- Trigger: Manual (button click)

#### Query 2: Get Status (statusQuery)

- Resource: Meta-Genesis API
- Method: GET
- Path: `/status/{{ table1.selectedRow.data.agent_id }}`
- Trigger: When table row is selected
- Run every: 2000ms (for live updates)

#### Query 3: Get All Agents (allAgentsQuery)

- Resource: Meta-Genesis API
- Method: GET
- Path: `/status`
- Trigger: On page load
- Run every: 5000ms

### Step 5: Wire It Up

1. Add **Button** component: "Create Agent"
2. On click: Run `createAgentQuery`
3. On success: Run `allAgentsQuery`

## Troubleshooting

### Server won't start

**Error:** `Cannot find module '@google/generative-ai'`
- Solution: Run `npm install` again

**Error:** `GEMINI_API_KEY is not set`
- Solution: Check your `.env` file has the correct keys

### Ngrok issues

**Error:** `ngrok auth failed`
- Solution: Check your auth token in `.env`
- Or remove NGROK_AUTH_TOKEN and server will run on localhost only

**Tunnel disconnected during demo**
- Solution: Use 5G mobile hotspot instead of venue WiFi
- Keep the terminal open showing the ngrok URL

### Python errors

**Error:** `ModuleNotFoundError: No module named 'agentql'`
- Solution: `pip install agentql playwright`

**Error:** `Executable doesn't exist at ...`
- Solution: `playwright install chromium`

### Generated agent fails

**AgentQL can't find elements**
- The query might be too vague
- Check the target website is accessible
- Try more specific semantic names

**Syntax error in generated Python**
- Check Gemini API is responding correctly
- The system has syntax verification - this shouldn't happen
- If it does, check the API key quota

## Demo Script

For the live presentation:

```markdown
1. Show Retool dashboard (empty state)
2. Click "Create Agent"
3. Enter in Wizard:
   - Intent: "Track iPhone 15 prices on Amazon"
   - URL: https://www.amazon.com/s?k=iphone+15
   - Personality: Professional
4. Submit and watch Timeline populate
5. When complete, show the generated icon
6. Navigate to agents folder and show the Python file
7. Run the agent: `python agents/[agent_name]/[agent_name].py`
8. Show the JSON output

TOTAL TIME: ~90 seconds
```

## Quick Reference

### Useful Commands

```bash
# Start server
npm run dev

# Test API
.\test-api.ps1           # Windows
./test-api.sh            # Mac/Linux

# View generated agents
ls agents/

# Run a generated agent
cd agents/[agent_folder]
python [agent_name].py

# View agent output
cat agent_output.json
```

### Important Files

- `src/index.ts` - Main server entry point
- `src/orchestrator.ts` - Core orchestration logic
- `src/gemini.ts` - AI reasoning engine
- `prompts/agentql_docs.md` - Documentation injected into AI
- `templates/base_agent.py` - Python template for agents
- `.env` - Your API keys (don't commit!)

## Need Help?

Check the main README.md for architecture details and API documentation.
