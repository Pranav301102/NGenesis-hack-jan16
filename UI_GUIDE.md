# 🎨 Meta-Genesis UI Guide

You now have **TWO** user interfaces for your hackathon project!

---

## 🌐 Option 1: Built-in Web Dashboard (Quick & Easy)

A beautiful, modern web interface served directly from your Express server.

### Features

- ✅ Real-time stats dashboard
- ✅ Create agents with simple form
- ✅ Live timeline visualization
- ✅ Active agents list with status badges
- ✅ Yutori scouts monitoring
- ✅ Auto-refreshing every 5 seconds
- ✅ Responsive design
- ✅ No external dependencies!

### How to Use

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Open your browser**:
   ```
   http://localhost:3000
   ```

3. **You'll see**:
   - Purple gradient header with prize badges
   - 4 stat cards (Agents, Monitors, Quality, Prizes)
   - Create Agent form
   - Empty agents list

### Creating Your First Agent

1. **Fill the form**:
   - **What should the agent do?**: `Track iPhone 15 Pro prices on Amazon`
   - **Target URL**: `https://www.amazon.com/s?k=iphone+15+pro`
   - **Agent Name**: `iphone_tracker` (optional)
   - **Personality**: `Professional`

2. **Click "Create Agent"**:
   - Green success message appears
   - Agent appears in "Active Agents" list
   - Stats automatically update

3. **Click the agent** to see its timeline:
   - Watch events populate in real-time
   - Green checkmarks for completed steps
   - Red X for failed steps (Yutori/Freepik if no keys)
   - Yellow dots for in-progress steps

### Features Explained

#### Stats Dashboard
- **Total Agents**: How many you've created
- **Active Monitors**: Yutori scouts running
- **Avg Quality Score**: Macroscope code quality (0-100)
- **Prizes Active**: How many of 7 integrations working

#### Timeline View
Shows all steps of agent creation:
```
✅ Cline: Autonomous Task Planning
✅ Fabricate: Test Data Generated (5 records)
✅ Gemini: AI Decomposition Complete
✅ Cline: Writing Agent Code
✅ Macroscope: Code Review (Score: 100/100)
✅ AgentQL: Selectors Verified
⚠️  Yutori: Monitoring Skipped (if no API key)
⚠️  Freepik: Icon Generation Skipped (if no API key)
✅ Agent Generation Complete
```

#### Active Scouts
If you have a valid Yutori API key and create an agent with monitoring intent (keywords: "track", "monitor", "watch"), active scouts will appear here.

---

## 🏢 Option 2: Retool Dashboard (Professional & Impressive)

A professional low-code dashboard built with Retool - perfect for impressing hackathon judges!

### Why Use Retool?

- ✅ Looks extremely professional
- ✅ Qualifies for Retool prize ($1,000)
- ✅ Real-time data visualization
- ✅ Advanced components (Timeline, Stats, Forms)
- ✅ Shareable URL for judges
- ✅ Can embed in presentations

### Setup Time

**30-45 minutes** following `RETOOL_SETUP.md`

### Quick Setup

1. **Get your ngrok URL**:
   ```bash
   npm run dev
   # Copy the ngrok URL from output
   ```

2. **Follow the guide**:
   - Open `RETOOL_SETUP.md`
   - Step-by-step instructions
   - Screenshots and examples included

3. **Test it**:
   - Create an agent
   - Watch timeline populate
   - Show off to judges!

---

## 📊 Comparison

| Feature | Built-in Web UI | Retool Dashboard |
|---------|----------------|------------------|
| **Setup Time** | 0 minutes (already done!) | 30-45 minutes |
| **Looks** | Modern & clean | Professional & polished |
| **Customization** | Edit HTML/CSS | Drag-and-drop |
| **Prize Eligible** | ❌ | ✅ ($1,000 Retool prize) |
| **External Access** | Need ngrok | Retool hosting |
| **Real-time Updates** | ✅ Auto-refresh | ✅ Query polling |
| **Best For** | Quick testing, local dev | Demos, judging, presentations |

---

## 🎯 Recommended Strategy

### For Development & Testing
Use the **Built-in Web UI**:
- Instant access at `localhost:3000`
- No configuration needed
- Perfect for debugging

### For Hackathon Demo
Use **Retool Dashboard**:
- More impressive to judges
- Qualifies for additional $1,000 prize
- Better data visualization
- Shareable link

### For Best Results
**Use Both!**
- Develop with built-in UI
- Demo with Retool
- Show both to judges (demonstrates versatility)

---

## 🚀 Quick Start: Built-in UI

### 1. Start Server
```bash
npm run dev
```

### 2. Open Browser
```
http://localhost:3000
```

### 3. Create Test Agent
```
Intent: Track Bitcoin prices on CoinMarketCap
URL: https://coinmarketcap.com/currencies/bitcoin/
Personality: Professional
```

### 4. Watch It Work!
- Stats update automatically
- Timeline shows real-time progress
- Agent files appear in `/agents` folder

---

## 🎨 Customizing the Built-in UI

### Change Colors

Edit `public/css/style.css`:

```css
:root {
    --primary: #4285f4;        /* Change to your brand color */
    --success: #34a853;        /* Success green */
    --warning: #fbbc04;        /* Warning yellow */
    --error: #ea4335;          /* Error red */
}
```

### Change Header

Edit `public/index.html`:

```html
<header class="header">
    <h1>🤖 Your Company Name</h1>
    <p class="subtitle">Your Custom Tagline</p>
</header>
```

### Add Custom Stats

Edit `public/js/app.js`:

```javascript
async function loadPrizeStats() {
    // Add your custom stat
    document.getElementById('customStat').textContent = stats.custom_value;
}
```

---

## 📱 Mobile Responsive

The built-in UI is fully responsive!

**Test it**:
1. Open `localhost:3000` in browser
2. Press F12 (Developer Tools)
3. Toggle device toolbar
4. Select iPhone/iPad
5. Everything still works perfectly!

---

## 🔧 Troubleshooting

### Built-in UI Issues

**Page shows "Cannot GET /"**
- Solution: Rebuild the project
  ```bash
  npm run build
  npm run dev
  ```

**Stats showing all zeros**
- Normal if no agents created yet
- Try creating an agent

**Timeline not appearing**
- Make sure you clicked on an agent in the list
- Check browser console (F12) for errors

**Auto-refresh not working**
- Check browser console for API errors
- Verify server is running on correct port

### Retool Issues

**See `RETOOL_SETUP.md` → Troubleshooting section**

---

## 🎬 Demo Script

### Using Built-in UI

```markdown
1. Open http://localhost:3000
2. Show empty dashboard (clean slate)
3. Fill create agent form with impressive example
4. Submit and immediately point to stats
5. Click on agent to show timeline
6. Narrate each step as it completes
7. Show final stats: "5/7 prizes active!"
8. Navigate to /agents folder to show generated code
```

**Time**: 2-3 minutes

### Using Both UIs

```markdown
1. Show built-in UI: "This is our development interface"
2. Create an agent
3. Switch to Retool: "And this is our production dashboard"
4. Show same agent in Retool with better visualization
5. "Both pull from the same REST API - demonstrates API versatility"
```

**Time**: 4-5 minutes
**Impact**: Maximum (shows architecture + multiple frontends)

---

## 📸 Screenshots for Submission

### Recommended Screenshots

1. **Dashboard Overview** (Built-in UI)
   - Full page showing all components
   - At least 1 agent created
   - Stats populated

2. **Timeline Detail** (Built-in UI)
   - Agent selected
   - Full timeline visible
   - Mix of completed/failed steps

3. **Retool Dashboard** (if using)
   - Professional view
   - Real-time timeline
   - Stats cards

4. **Generated Code** (Folder view)
   - Show `/agents` directory
   - Open Python file with AgentQL code

5. **Prize Stats** (API response)
   - `/prize-stats` endpoint in browser
   - Shows all 7 integrations

---

## 🏆 Prize Judging Tips

### What to Emphasize

**Technical Skills**:
- "Built custom web UI with real-time updates"
- "Integrated 7 different APIs into one dashboard"
- "Auto-refreshing timeline shows live progress"

**User Experience**:
- "Three clicks from idea to deployed agent"
- "Visual feedback for every step"
- "Graceful degradation when APIs fail"

**Architecture**:
- "Same REST API powers two different frontends"
- "Stateless server, state managed client-side"
- "WebSocket-ready for future enhancements"

---

## 🔄 API Endpoints Used by UI

```javascript
// Prize statistics
GET /prize-stats
→ { total_agents, active_monitoring, average_quality_score, prize_categories_demonstrated }

// All agents
GET /status
→ { total, agents: [...] }

// Create agent
POST /genesis
Body: { user_intent, target_url, agent_name, personality }
→ { agent_id, status_url }

// Agent timeline
GET /timeline/:agentId
→ { agent_id, status, events: [...] }

// Active scouts
GET /scouts
→ { total, scouts: [...] }

// Health check
GET /ping
→ { status: 'pong', timestamp }
```

---

## 🎯 Next Steps

1. **Test the built-in UI** (2 minutes)
   ```bash
   npm run dev
   # Open http://localhost:3000
   ```

2. **Create a test agent** (1 minute)
   - Use any example from above
   - Watch it work!

3. **Decide on Retool** (optional)
   - If you want the extra $1,000 prize
   - Follow `RETOOL_SETUP.md`
   - 30-45 minute investment

4. **Practice your demo** (5 minutes)
   - Run through the demo script
   - Time yourself
   - Prepare talking points

---

## ✅ You're Ready!

You now have:
- ✅ Beautiful built-in web UI
- ✅ Complete Retool setup guide
- ✅ Demo scripts for both
- ✅ Troubleshooting help
- ✅ Screenshot recommendations

**Your Meta-Genesis project is demo-ready!** 🚀

Pick your UI (or use both) and wow those judges! 🏆
