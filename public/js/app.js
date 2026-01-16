// API Base URL
const API_BASE = window.location.origin;

// State
let selectedAgentId = null;
let refreshInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    console.log('Initializing Meta-Genesis Dashboard...');

    // Load initial data
    await loadPrizeStats();
    await loadAgents();
    await loadScouts();

    // Setup form handler
    document.getElementById('createAgentForm').addEventListener('submit', handleCreateAgent);

    // Start auto-refresh
    startAutoRefresh();
}

// Create Agent
async function handleCreateAgent(e) {
    e.preventDefault();

    const statusEl = document.getElementById('creationStatus');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    // Show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Creating...';
    statusEl.style.display = 'none';

    const data = {
        user_intent: document.getElementById('userIntent').value,
        target_url: document.getElementById('targetUrl').value,
        agent_name: document.getElementById('agentName').value || undefined,
        personality: document.getElementById('personality').value
    };

    try {
        const response = await fetch(`${API_BASE}/genesis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            statusEl.className = 'status-message success';
            statusEl.textContent = `Agent created successfully! ID: ${result.agent_id}`;
            statusEl.style.display = 'block';

            // Reset form
            e.target.reset();

            // Refresh lists
            await loadAgents();
            await loadPrizeStats();

            // Auto-select the new agent
            setTimeout(() => {
                selectAgent(result.agent_id);
            }, 1000);
        } else {
            throw new Error(result.error || 'Failed to create agent');
        }
    } catch (error) {
        statusEl.className = 'status-message error';
        statusEl.textContent = `Error: ${error.message}`;
        statusEl.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Load Prize Stats
async function loadPrizeStats() {
    try {
        const response = await fetch(`${API_BASE}/prize-stats`);
        const stats = await response.json();

        document.getElementById('totalAgents').textContent = stats.total_agents;
        document.getElementById('activeMonitoring').textContent = stats.active_monitoring;
        document.getElementById('avgQuality').textContent = stats.average_quality_score;

        // Count active prizes
        const activePrizes = Object.values(stats.prize_categories_demonstrated).filter(Boolean).length;
        document.getElementById('prizeCount').textContent = `${activePrizes}/7`;

        // Update badge styles based on active prizes
        updatePrizeBadges(stats.prize_categories_demonstrated);
    } catch (error) {
        console.error('Failed to load prize stats:', error);
    }
}

function updatePrizeBadges(prizes) {
    const badgeMap = {
        'yutori': prizes.yutori,
        'agentql': prizes.agentql,
        'freepik': prizes.freepik,
        'cline': prizes.cline,
        'fabricate': prizes.fabricate,
        'macroscope': prizes.macroscope,
        'retool': prizes.retool
    };

    Object.entries(badgeMap).forEach(([key, active]) => {
        const badge = document.querySelector(`.badge.${key}`);
        if (badge) {
            badge.style.opacity = active ? '1' : '0.5';
            badge.style.textDecoration = active ? 'none' : 'line-through';
        }
    });
}

// Load Agents
async function loadAgents() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        const data = await response.json();

        const agentsList = document.getElementById('agentsList');

        if (data.agents && data.agents.length > 0) {
            agentsList.innerHTML = data.agents.map(agent => `
                <div class="agent-item ${agent.agent_id === selectedAgentId ? 'selected' : ''}"
                     onclick="selectAgent('${agent.agent_id}')">
                    <div class="agent-header">
                        <span class="agent-id">${agent.agent_id.substring(0, 8)}...</span>
                        <span class="agent-status ${agent.status}">${formatStatus(agent.status)}</span>
                    </div>
                    <div class="agent-info">
                        ${agent.code_quality_score ? `<span>⭐ ${agent.code_quality_score}/100</span>` : ''}
                        ${agent.monitoring_active ? '<span>👁️ Monitoring</span>' : ''}
                        ${agent.test_data_generated ? '<span>🧪 Tested</span>' : ''}
                    </div>
                </div>
            `).join('');
        } else {
            agentsList.innerHTML = '<p class="empty-state">No agents created yet. Create one above to get started!</p>';
        }
    } catch (error) {
        console.error('Failed to load agents:', error);
    }
}

// Select Agent and Load Timeline
async function selectAgent(agentId) {
    selectedAgentId = agentId;

    // Update UI
    document.querySelectorAll('.agent-item').forEach(item => {
        item.classList.remove('selected');
    });
    event.currentTarget?.classList.add('selected');

    // Load timeline
    await loadTimeline(agentId);
}

async function loadTimeline(agentId) {
    try {
        const response = await fetch(`${API_BASE}/timeline/${agentId}`);
        const data = await response.json();

        const timelineSection = document.getElementById('timelineSection');
        const timelineEl = document.getElementById('timeline');
        const selectedIdEl = document.getElementById('selectedAgentId');

        selectedIdEl.textContent = agentId.substring(0, 16) + '...';
        timelineSection.style.display = 'block';

        if (data.events && data.events.length > 0) {
            timelineEl.innerHTML = data.events.map(event => `
                <div class="timeline-item ${event.status}">
                    <div class="timeline-event">${event.event_name}</div>
                    ${event.details ? `<div class="timeline-details">${event.details}</div>` : ''}
                    <div class="timeline-timestamp">${formatTimestamp(event.timestamp)}</div>
                </div>
            `).join('');
        } else {
            timelineEl.innerHTML = '<p class="empty-state">No timeline events yet.</p>';
        }

        // Scroll to timeline
        timelineSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
        console.error('Failed to load timeline:', error);
    }
}

// Load Scouts
async function loadScouts() {
    try {
        const response = await fetch(`${API_BASE}/scouts`);
        const data = await response.json();

        const scoutsList = document.getElementById('scoutsList');

        if (data.scouts && data.scouts.length > 0) {
            scoutsList.innerHTML = data.scouts.map(scout => `
                <div class="scout-item">
                    <div class="scout-header">
                        <span class="scout-id">${scout.task_id}</span>
                        <span class="scout-status">${scout.status}</span>
                    </div>
                    <div class="scout-query">${scout.query || 'Monitoring active'}</div>
                </div>
            `).join('');
        } else {
            scoutsList.innerHTML = '<p class="empty-state">No active scouts. Create an agent with monitoring intent to deploy scouts.</p>';
        }
    } catch (error) {
        console.error('Failed to load scouts:', error);
        // Don't show error if scouts endpoint fails (might not have Yutori key)
    }
}

// Auto-refresh
function startAutoRefresh() {
    // Refresh every 5 seconds
    refreshInterval = setInterval(async () => {
        await loadPrizeStats();
        await loadAgents();

        // Refresh timeline if an agent is selected
        if (selectedAgentId) {
            await loadTimeline(selectedAgentId);
        }
    }, 5000);
}

// Utility Functions
function formatStatus(status) {
    const statusMap = {
        'initializing': 'Initializing',
        'planning': 'Planning',
        'decomposing': 'Decomposing',
        'fabricating': 'Fabricating',
        'reviewing': 'Reviewing',
        'verifying': 'Verifying',
        'monitoring': 'Setting up monitoring',
        'deploying': 'Deploying',
        'completed': 'Completed',
        'failed': 'Failed'
    };
    return statusMap[status] || status;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return date.toLocaleString();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});
