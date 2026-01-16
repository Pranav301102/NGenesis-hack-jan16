# 🎨 Retool Configuration Guide

Complete step-by-step guide to setting up your Retool dashboard for the Meta-Genesis Hackathon Demo.

---

## Prerequisites

1. **Retool Account** - Sign up at https://retool.com (free tier works!)
2. **Meta-Genesis Server Running** - With ngrok tunnel active
3. **Ngrok URL** - Copy from server startup logs

---

## Part 1: Setup REST API Resource

### Step 1: Create New Resource

1. Log into Retool
2. Click **Resources** in left sidebar
3. Click **Create New** → **REST API**
4. Name it: `Meta-Genesis API`

### Step 2: Configure Base URL

**Find Your Ngrok URL:**
```bash
# Start your server (if not already running)
npm run dev

# Look for this in the output:
🌐 Public URL: https://abc123-xyz.ngrok-free.app
```

**In Retool Resource Settings:**
- **Base URL**: `https://YOUR-NGROK-URL.ngrok-free.app`
- **Headers**: (Leave empty for now)
- **Authentication**: None

Click **Save**

---

## Part 2: Create the Retool App

### Step 1: Create New App

1. Go to **Apps** in left sidebar
2. Click **Create New** → **App**
3. Name: `Meta-Genesis Control Panel`
4. Choose template: **Blank**

---

## Part 3: Build the Dashboard

### Layout Overview

```
┌─────────────────────────────────────┐
│         Header (Container)          │
├───────┬───────┬───────┬─────────────┤
│ Stat  │ Stat  │ Stat  │   Stat      │
│ Card  │ Card  │ Card  │   Card      │
├───────────────────────────────────  ┤
│    Create Agent Form (Container)    │
├─────────────────────────────────────┤
│      Agents Table (Table)           │
├─────────────────────────────────────┤
│      Timeline (Timeline)            │
├─────────────────────────────────────┤
│      Scouts Table (Table)           │
└─────────────────────────────────────┘
```

---

## Part 4: Add Components

### A. Header Container

1. Drag **Container** to canvas
2. Properties:
   - **Background color**: `#667eea` (purple gradient)
   - **Padding**: `24px`
   - **Border radius**: `8px`

3. Add **Text** inside:
   ```
   🤖 Meta-Genesis Control Panel
   Autonomous Agent Factory - $11,100 Prize Potential
   ```

### B. Stats Cards (4 Statistic Components)

1. Drag **Statistic** component (×4)
2. Arrange in a row

**Stat 1: Total Agents**
- **Label**: `Total Agents`
- **Value**: `{{ prizeStatsQuery.data.total_agents || 0 }}`
- **Icon**: `📊`

**Stat 2: Active Monitoring**
- **Label**: `Active Monitors`
- **Value**: `{{ prizeStatsQuery.data.active_monitoring || 0 }}`
- **Icon**: `👁️`

**Stat 3: Avg Quality**
- **Label**: `Quality Score`
- **Value**: `{{ prizeStatsQuery.data.average_quality_score || 0 }}`
- **Icon**: `⭐`

**Stat 4: Prizes Active**
- **Label**: `Prizes Active`
- **Value**: `{{ Object.values(prizeStatsQuery.data.prize_categories_demonstrated || {}).filter(v => v).length }}/7`
- **Icon**: `🏆`

### C. Create Agent Form

1. Drag **Form** component
2. Add form fields:

**Field 1: User Intent (Text Input)**
- **Label**: `What should the agent do?`
- **Placeholder**: `Track iPhone 15 prices on Amazon`
- **Required**: ✓

**Field 2: Target URL (Text Input)**
- **Label**: `Target URL`
- **Placeholder**: `https://www.amazon.com/s?k=iphone+15`
- **Required**: ✓

**Field 3: Agent Name (Text Input)**
- **Label**: `Agent Name (Optional)`
- **Placeholder**: `price_tracker`

**Field 4: Personality (Select)**
- **Label**: `Personality`
- **Options**:
  ```javascript
  [
    { label: 'Professional', value: 'professional' },
    { label: 'Aggressive', value: 'aggressive' },
    { label: 'Friendly', value: 'friendly' }
  ]
  ```
- **Default**: `professional`

3. Add **Submit Button**:
   - **Text**: `🚀 Create Agent`
   - **On Click**: Run `createAgentQuery`

### D. Agents Table

1. Drag **Table** component
2. Name it: `agentsTable`
3. **Data source**: `{{ allAgentsQuery.data.agents }}`
4. **Columns to show**:
   - `agent_id` (Display as: Truncated - first 8 chars)
   - `status` (Display with tag styling)
   - `code_quality_score`
   - `monitoring_active` (Boolean badge)
   - `test_data_generated` (Boolean badge)

5. **Row Click**: Run `timelineQuery` (pass selected `agent_id`)

### E. Timeline Component

1. Drag **Timeline** component
2. Name it: `agentTimeline`
3. **Data source**: `{{ timelineQuery.data.events }}`
4. **Configure fields**:
   - **Title**: `{{ item.event_name }}`
   - **Description**: `{{ item.details }}`
   - **Timestamp**: `{{ item.timestamp }}`
   - **Status**: `{{ item.status }}`

5. **Conditional coloring**:
   ```javascript
   // For status dots
   item.status === 'completed' ? 'green' :
   item.status === 'failed' ? 'red' :
   item.status === 'in_progress' ? 'orange' : 'gray'
   ```

### F. Scouts Table

1. Drag **Table** component
2. Name it: `scoutsTable`
3. **Data source**: `{{ scoutsQuery.data.scouts }}`
4. **Columns**:
   - `task_id`
   - `status`
   - `query`

---

## Part 5: Create Queries

### Query 1: prizeStatsQuery

**Type**: REST API
**Resource**: Meta-Genesis API
**Method**: GET
**URL**: `/prize-stats`

**Trigger**:
- [x] Run query on page load
- [x] Run every 10 seconds

### Query 2: allAgentsQuery

**Type**: REST API
**Resource**: Meta-Genesis API
**Method**: GET
**URL**: `/status`

**Trigger**:
- [x] Run query on page load
- [x] Run every 5 seconds

### Query 3: createAgentQuery

**Type**: REST API
**Resource**: Meta-Genesis API
**Method**: POST
**URL**: `/genesis`

**Body**:
```json
{
  "user_intent": {{ form1.data.user_intent }},
  "target_url": {{ form1.data.target_url }},
  "agent_name": {{ form1.data.agent_name || null }},
  "personality": {{ form1.data.personality }}
}
```

**Trigger**: Manual (button click)

**On Success**:
```javascript
// Show success notification
utils.showNotification({
  title: 'Agent Created!',
  description: `Agent ID: ${createAgentQuery.data.agent_id}`,
  notificationType: 'success',
  duration: 5
});

// Refresh agents list
allAgentsQuery.trigger();

// Reset form
form1.reset();
```

### Query 4: timelineQuery

**Type**: REST API
**Resource**: Meta-Genesis API
**Method**: GET
**URL**: `/timeline/{{ agentsTable.selectedRow.data.agent_id }}`

**Trigger**:
- When `agentsTable` row is selected
- [x] Run every 3 seconds (if row selected)

**Conditional trigger**:
```javascript
{{ agentsTable.selectedRow.data.agent_id !== null }}
```

### Query 5: scoutsQuery

**Type**: REST API
**Resource**: Meta-Genesis API
**Method**: GET
**URL**: `/scouts`

**Trigger**:
- [x] Run query on page load
- [x] Run every 10 seconds

**On Error**: Continue (Scouts might fail if no Yutori key)

---

## Part 6: Advanced Customization

### Add Status Badges to Agents Table

In **Agents Table** → Column `status`:

**Transformer**:
```javascript
// Color code the status
const statusColors = {
  'completed': 'success',
  'failed': 'error',
  'in_progress': 'warning',
  'planning': 'info',
  'deploying': 'info'
};

return {
  text: currentRow.status,
  color: statusColors[currentRow.status] || 'default'
};
```

### Add Quality Score Progress Bar

In **Agents Table** → Column `code_quality_score`:

**Type**: Progress bar

**Transformer**:
```javascript
return {
  value: currentRow.code_quality_score || 0,
  max: 100,
  color: currentRow.code_quality_score >= 90 ? 'green' :
         currentRow.code_quality_score >= 70 ? 'orange' : 'red'
};
```

### Add Refresh Button

1. Add **Button** component
2. **Text**: `🔄 Refresh`
3. **On Click**:
   ```javascript
   allAgentsQuery.trigger();
   prizeStatsQuery.trigger();
   scoutsQuery.trigger();
   ```

---

## Part 7: Styling

### Theme

1. Go to **Settings** (gear icon)
2. **Theme**: Choose `Light` or `Dark`
3. **Primary Color**: `#4285f4` (Google Blue)
4. **Success Color**: `#34a853` (Green)

### Custom CSS (Optional)

```css
/* Header gradient */
.header-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px;
  border-radius: 8px;
}

/* Stat cards hover effect */
.stat-card:hover {
  transform: translateY(-4px);
  transition: transform 0.2s;
}

/* Timeline dots */
.timeline-dot.completed {
  background-color: #34a853;
}

.timeline-dot.failed {
  background-color: #ea4335;
}

.timeline-dot.in_progress {
  background-color: #fbbc04;
  animation: pulse 1.5s infinite;
}
```

---

## Part 8: Testing Your Dashboard

### Test Sequence

1. **Check Stats Load**:
   - Open browser console (F12)
   - Verify `prizeStatsQuery` returns data
   - Stats should show `0/0/0/0`

2. **Create Test Agent**:
   - Fill form:
     - Intent: `Track Amazon prices`
     - URL: `https://www.amazon.com/s?k=iphone`
     - Personality: `Professional`
   - Click **Create Agent**
   - Should see success notification

3. **Watch Timeline**:
   - Click on the new agent in the table
   - Timeline should populate in real-time
   - Watch for green checkmarks (completed) or red X's (failed)

4. **Check Stats Update**:
   - Total agents should increment
   - Quality score should appear
   - Prizes active should update

---

## Troubleshooting

### "Failed to fetch" error

**Problem**: Retool can't reach your server

**Solution**:
1. Check ngrok tunnel is active:
   ```bash
   curl https://your-ngrok-url.ngrok-free.app/ping
   ```
2. Verify Base URL in Retool resource matches ngrok URL exactly
3. Try adding ngrok header bypass:
   - Resource → Headers → Add:
     - Key: `ngrok-skip-browser-warning`
     - Value: `true`

### Timeline not updating

**Problem**: Timeline query not triggering

**Solution**:
1. Check `timelineQuery` has conditional trigger enabled
2. Verify row selection is working:
   ```javascript
   {{ agentsTable.selectedRow.data.agent_id }}
   ```
3. Check query interval is set (3-5 seconds)

### Scouts showing "No data"

**Problem**: Yutori API key missing or invalid

**Expected**: This is normal if you don't have a valid Yutori key

**Solution**:
- Scouts query should be set to "Continue on error"
- Show placeholder text: "Yutori integration requires valid API key"

---

## Demo Tips

### For Live Presentation

1. **Pre-load Dashboard**:
   - Open Retool in browser
   - Enter presentation mode (top right)
   - Have Meta-Genesis server already running

2. **Demo Flow**:
   ```
   1. Show stats (all zeros initially)
   2. Fill form with impressive example:
      - "Monitor iPhone 15 Pro prices and alert on drops below $999"
   3. Submit and immediately point to timeline
   4. Narrate each step as it completes:
      - "See Cline planning autonomously..."
      - "Fabricate generating test data..."
      - "Macroscope reviewing code quality..."
   5. Show final stats update
   ```

3. **Backup Plan**:
   - Have `/prize-stats` endpoint open in another tab
   - Can show raw JSON if dashboard fails

---

## Example Screenshots to Include

### Dashboard View
```
┌─────────────────────────────────────────┐
│  Meta-Genesis Control Panel             │
│  $11,100 Prize Potential                │
├──────┬──────┬──────┬──────────────────  ┤
│  3   │  1   │  92  │    5/7             │
│Agents│Active│Score │  Prizes            │
├──────────────────────────────────────────┤
│  [Create Agent Form]                    │
│  ✓ iPhone tracker created!              │
├──────────────────────────────────────────┤
│  Agents:                                │
│  ✓ 84a70991  [Completed]  92/100        │
│  ⏳ a3f42c8e  [Planning]   --            │
├──────────────────────────────────────────┤
│  Timeline (84a70991):                   │
│  ✓ Cline: Planning (7 steps)            │
│  ✓ Fabricate: Test Data (5 records)     │
│  ✓ Macroscope: Review (92/100)          │
│  ✓ Yutori: Scout Deployed               │
│  ✓ Agent Complete                       │
└──────────────────────────────────────────┘
```

---

## Final Checklist

- [ ] REST API resource created with ngrok URL
- [ ] All 5 queries configured and tested
- [ ] Stats cards displaying correctly
- [ ] Create agent form working
- [ ] Agents table showing and refreshing
- [ ] Timeline updating on row selection
- [ ] Scouts table configured (even if empty)
- [ ] Success notifications working
- [ ] Auto-refresh enabled on all queries
- [ ] Tested creating at least one agent
- [ ] Dashboard looks professional

---

## Prize Judging - What to Emphasize

**For Retool Prize ($1,000):**

1. **Component Diversity**:
   - "We use Tables, Timeline, Forms, Stats, and Containers"

2. **Real-time Updates**:
   - "Watch the timeline populate live as the agent generates"

3. **REST API Integration**:
   - "Every component pulls from our Express API endpoints"

4. **User Experience**:
   - "Three clicks from idea to deployed agent"

5. **Error Handling**:
   - "Scouts show gracefully when Yutori is unavailable"

---

## Next Steps

1. ✅ Build this dashboard in Retool (30-45 minutes)
2. ✅ Test with at least 2 agent creations
3. ✅ Practice the demo flow (5 min presentation)
4. ✅ Take screenshots for submission
5. ✅ Export Retool app (Settings → Export JSON)

---

**Your Retool dashboard is now a professional, prize-winning interface!** 🎨🏆

Good luck with the demo!
