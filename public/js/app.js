// NGenesis App - New Layout
const API_BASE = window.location.origin;

// State
let selectedAgentId = null;
let refreshInterval = null;
let templates = [];
let currentUser = null;
let authToken = null;
let resultsHistory = [];
let currentCreationContext = null;
let availableTools = [];
let selectedTools = new Set(['gemini', 'cline', 'tinyfish']); // Default: AI brain + code gen + scraping

// Example tasks for quick start
const EXAMPLE_TASKS = {
    research: {
        prompt: "Research the latest AI news and trends, summarize the top 5 developments, and generate a professional blog header image for an article about AI innovation",
        url: "https://techcrunch.com/category/artificial-intelligence/",
        tools: ['gemini', 'cline', 'tinyfish', 'freepik']
    },
    monitor: {
        prompt: "Monitor iPhone 15 Pro prices on Amazon, track price changes, and alert me when the price drops below $900",
        url: "https://www.amazon.com/dp/B0CLTM7HD9",
        tools: ['gemini', 'cline', 'tinyfish', 'yutori']
    },
    scrape: {
        prompt: "Scrape the top 10 product reviews for iPhone, extract ratings and key feedback, and summarize the overall sentiment",
        url: "https://www.amazon.com/Apple-iPhone-15-Pro-256/dp/B0CMT4JLT9",
        tools: ['gemini', 'cline', 'tinyfish', 'macroscope']
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    console.log('Initializing NGenesis Dashboard...');

    // Check for stored auth token
    const storedToken = localStorage.getItem('ngenesis_token');
    const storedUser = localStorage.getItem('ngenesis_user');
    
    if (storedToken && storedUser) {
        authToken = storedToken;
        currentUser = JSON.parse(storedUser);
        updateUserUI();
    }

    // Load available tools
    await loadAvailableTools();

    // Load agents and scouts
    await loadAgents();
    await loadScouts();

    // Start auto-refresh
    startAutoRefresh();
}

// ==================== TOOLS ====================

async function loadAvailableTools() {
    try {
        const response = await fetch(`${API_BASE}/api/tools`);
        const data = await response.json();
        availableTools = data.tools || [];
        renderToolsGrid();
    } catch (error) {
        console.error('Failed to load tools:', error);
        // Use default tools
        availableTools = [
            { id: 'gemini', name: 'Gemini 2.0 Flash', icon: '🧠', enabled: true, description: 'AI brain - analyzes tasks, plans workflows, synthesizes results' },
            { id: 'cline', name: 'Cline', icon: '🤖', enabled: true, description: 'Autonomous code generator - writes custom code on-demand' },
            { id: 'tinyfish', name: 'TinyFish/AgentQL', icon: '🌐', enabled: true, description: 'Self-healing web scraper - extracts data using natural language' },
            { id: 'freepik', name: 'Freepik Mystic', icon: '🎨', enabled: true, description: 'AI image generator - creates visuals matching your content' },
            { id: 'yutori', name: 'Yutori Scouts', icon: '👁️', enabled: true, description: 'Continuous monitor - watches websites 24/7 for changes' },
            { id: 'fabricate', name: 'Tonic Fabricate', icon: '🧪', enabled: true, description: 'Test data generator - creates realistic synthetic datasets' },
            { id: 'macroscope', name: 'Macroscope', icon: '🔍', enabled: true, description: 'Code reviewer - validates quality and security automatically' }
        ];
        renderToolsGrid();
    }
}

function renderToolsGrid() {
    const grid = document.getElementById('toolsGrid');
    if (!grid) return;
    
    grid.innerHTML = availableTools.map(tool => `
        <div class="tool-card ${selectedTools.has(tool.id) ? 'selected' : ''} ${tool.enabled ? '' : 'unavailable'}" 
             data-tool="${tool.id}"
             onclick="toggleTool('${tool.id}')">
            <div class="tool-icon">${tool.icon}</div>
            <div class="tool-info">
                <div class="tool-name">${tool.name}</div>
                <div class="tool-desc">${tool.description}</div>
            </div>
            <div class="tool-checkbox">${selectedTools.has(tool.id) ? '☑' : '☐'}</div>
            <div class="tool-usage" id="${tool.id}-usage"></div>
        </div>
    `).join('');
}

function toggleTool(toolId) {
    if (selectedTools.has(toolId)) {
        // Don't allow deselecting core tools
        if (toolId === 'gemini') {
            showToast('⚠️ Gemini is required for orchestration');
            return;
        }
        if (toolId === 'cline') {
            showToast('⚠️ Cline is required for code generation');
            return;
        }
        selectedTools.delete(toolId);
    } else {
        selectedTools.add(toolId);
    }
    renderToolsGrid();
    showToast(`${selectedTools.has(toolId) ? '✓' : '✗'} ${toolId} ${selectedTools.has(toolId) ? 'enabled' : 'disabled'}`);
}

function getSelectedToolsList() {
    return Array.from(selectedTools).map(id => {
        const tool = availableTools.find(t => t.id === id);
        return tool ? { name: tool.id, displayName: tool.name, icon: tool.icon } : null;
    }).filter(Boolean);
}

window.toggleTool = toggleTool;

// ==================== EXAMPLE TASKS ====================

function setExampleTask(type) {
    const example = EXAMPLE_TASKS[type];
    if (example) {
        document.getElementById('mainPrompt').value = example.prompt;
        document.getElementById('targetUrl').value = example.url;
        document.getElementById('mainPrompt').focus();
        
        // Auto-select the tools for this example
        if (example.tools) {
            selectedTools = new Set(example.tools);
            renderToolsGrid();
            showToast(`✅ Auto-selected tools: ${example.tools.join(', ')}`);
        }
    }
}

window.setExampleTask = setExampleTask;

// ==================== AUTHENTICATION ====================

function showAuthModal(mode = 'login') {
    document.getElementById('authModal').style.display = 'flex';
    switchAuthMode(mode);
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('registerError').style.display = 'none';
}

function switchAuthMode(mode) {
    if (mode === 'login') {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    } else {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            authToken = result.token;
            currentUser = result.user;
            localStorage.setItem('ngenesis_token', authToken);
            localStorage.setItem('ngenesis_user', JSON.stringify(currentUser));
            updateUserUI();
            closeAuthModal();
            showToast(`👋 Welcome back, ${currentUser.name || currentUser.email}!`);
            await loadAgents();
        } else {
            errorEl.textContent = result.error || 'Login failed';
            errorEl.style.display = 'block';
        }
    } catch (error) {
        errorEl.textContent = 'Connection error. Please try again.';
        errorEl.style.display = 'block';
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const errorEl = document.getElementById('registerError');
    
    try {
        const response = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            authToken = result.token;
            currentUser = result.user;
            localStorage.setItem('ngenesis_token', authToken);
            localStorage.setItem('ngenesis_user', JSON.stringify(currentUser));
            updateUserUI();
            closeAuthModal();
            showToast(`🎉 Welcome to NGenesis, ${currentUser.name || currentUser.email}!`);
        } else {
            errorEl.textContent = result.error || 'Registration failed';
            errorEl.style.display = 'block';
        }
    } catch (error) {
        errorEl.textContent = 'Connection error. Please try again.';
        errorEl.style.display = 'block';
    }
}

function updateUserUI() {
    const userSection = document.getElementById('userSection');
    
    if (currentUser) {
        userSection.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">${(currentUser.name || currentUser.email).charAt(0).toUpperCase()}</div>
                <span class="user-name">${currentUser.name || currentUser.email}</span>
            </div>
            <button class="btn-nav" onclick="logout()">Logout</button>
        `;
    } else {
        userSection.innerHTML = `
            <button class="btn-nav" onclick="showAuthModal('login')">Login</button>
            <button class="btn-nav-primary" onclick="showAuthModal('register')">Sign Up</button>
        `;
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('ngenesis_token');
    localStorage.removeItem('ngenesis_user');
    updateUserUI();
    showToast('👋 Logged out successfully');
    loadAgents();
}

function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
}

// Make auth functions globally accessible
window.showAuthModal = showAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthMode = switchAuthMode;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logout = logout;

// ==================== TOOL ORCHESTRATION ====================

function updateToolsDisplay(toolsUsed) {
    // Reset all tools
    document.querySelectorAll('.tool-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Activate used tools
    if (toolsUsed) {
        toolsUsed.forEach(tool => {
            const card = document.querySelector(`.tool-card[data-tool="${tool.name}"]`);
            if (card) {
                card.classList.add('active');
                const usageEl = card.querySelector('.tool-usage');
                if (usageEl && tool.usage) {
                    usageEl.textContent = tool.usage;
                }
            }
        });
    }
}

function resetToolsDisplay() {
    document.querySelectorAll('.tool-card').forEach(card => {
        card.classList.remove('active');
    });
}

// ==================== PROMPT-BASED AGENT CREATION ====================

async function createAgentFromPrompt() {
    const prompt = document.getElementById('mainPrompt').value.trim();
    const targetUrl = document.getElementById('targetUrl').value.trim();
    
    if (!prompt) {
        showToast('⚠️ Please describe your task');
        return;
    }
    
    if (selectedTools.size === 0) {
        showToast('⚠️ Please select at least one tool');
        return;
    }
    
    const createBtn = document.getElementById('createAgentBtn');
    const originalText = createBtn.textContent;
    
    // Get output type
    const outputType = document.querySelector('input[name="outputType"]:checked')?.value || 'text';
    
    // Get selected tools list
    const toolsList = getSelectedToolsList();
    
    // Store context for approval
    currentCreationContext = {
        userIntent: prompt,
        targetUrl,
        outputType,
        selectedTools: toolsList
    };
    
    // Show loading
    createBtn.disabled = true;
    createBtn.textContent = '⏳ Analyzing...';
    
    // Clear previous output and reset
    clearOutput();
    resetPipeline();
    resetToolsDisplay();
    
    // Update pipeline to show progress
    updatePipeline('plan', 'active');
    appendOutput('🧠 Analyzing your task...\n');
    appendOutput(`Task: ${prompt}\n`);
    if (targetUrl) {
        appendOutput(`Target: ${targetUrl}\n`);
    }
    appendOutput('\n🛠️ Selected Tools: ' + toolsList.map(t => `${t.icon} ${t.displayName}`).join(', ') + '\n');
    appendOutput('\n⏳ Creating orchestration plan with selected tools...\n\n');
    
    try {
        // Step 1: Generate orchestration plan with selected tools
        const planResponse = await fetch(`${API_BASE}/genesis/orchestrate`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                user_intent: prompt,
                target_url: targetUrl,
                output_format: outputType,
                selected_tools: Array.from(selectedTools)
            })
        });
        
        const planResult = await planResponse.json();
        
        if (planResponse.ok && planResult.plan) {
            updatePipeline('plan', 'completed');
            
            // Update tools display based on what user selected
            if (toolsList.length > 0) {
                updateToolsDisplay(toolsList.map(t => ({ name: t.name, usage: 'Selected by user' })));
            }
            
            // Show the plan
            appendOutput('\n📋 ORCHESTRATION PLAN:\n');
            appendOutput('═'.repeat(60) + '\n\n');
            
            // Show tools being used
            appendOutput('🛠️ TOOLS SELECTED:\n');
            toolsList.forEach(tool => {
                appendOutput(`  • ${tool.icon} ${tool.displayName}\n`);
            });
            appendOutput('\n');
            
            // Format and show the plan
            const formattedPlan = formatPlanOutput(planResult.plan);
            appendOutput(formattedPlan + '\n\n');
            
            appendOutput('═'.repeat(60) + '\n\n');
            
            // Show approval buttons
            const approvalDiv = document.createElement('div');
            approvalDiv.className = 'approval-buttons';
            approvalDiv.style.cssText = 'display: flex; gap: 10px; margin: 15px 0;';
            approvalDiv.innerHTML = `
                <button onclick="approveAndExecute()" style="
                    padding: 12px 24px;
                    background: #22c55e;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 0.95rem;
                ">✅ Approve & Execute</button>
                <button onclick="modifyPlan()" style="
                    padding: 12px 24px;
                    background: #f59e0b;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 0.95rem;
                ">✏️ Modify</button>
                <button onclick="cancelCreation()" style="
                    padding: 12px 24px;
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 0.95rem;
                ">❌ Cancel</button>
            `;
            
            const outputContainer = document.getElementById('outputContainer');
            outputContainer.appendChild(approvalDiv);
            
            // Store the plan in context
            currentCreationContext.plan = planResult.plan;
            currentCreationContext.tools_used = planResult.tools_used;
            
            // Re-enable create button
            createBtn.disabled = false;
            createBtn.textContent = originalText;
            
        } else {
            throw new Error(planResult.error || 'Failed to generate plan');
        }
    } catch (error) {
        const activeStep = document.querySelector('.pipeline-step.active');
        if (activeStep) {
            const step = activeStep.getAttribute('data-step');
            if (step) updatePipeline(step, 'failed');
        }
        
        appendOutput(`\n❌ Error: ${error.message}\n`);
        showToast(`❌ ${error.message}`);
        
        createBtn.disabled = false;
        createBtn.textContent = originalText;
    }
}

function getToolEmoji(toolName) {
    const emojis = {
        'gemini': '🧠',
        'agentql': '🤖',
        'freepik': '🎨',
        'yutori': '👁️'
    };
    return emojis[toolName.toLowerCase()] || '🔧';
}

window.createAgentFromPrompt = createAgentFromPrompt;

async function loadTemplates() {
    try {
        const response = await fetch(`${API_BASE}/api/templates`);
        templates = await response.json();
    } catch (error) {
        console.error('Error loading templates:', error);
        templates = getBuiltInTemplates();
    }
    
    renderTemplateSelect();
}

function getBuiltInTemplates() {
    return [
        {
            id: 'price-monitor',
            name: 'Price Monitor',
            icon: '💰',
            placeholders: {
                product: 'Product name (e.g., iPhone 15)',
                website: 'Website URL'
            },
            defaultIntent: 'Monitor {product} prices on {website} and alert on price drops'
        },
        {
            id: 'news-tracker',
            name: 'News Tracker',
            icon: '📰',
            placeholders: {
                topic: 'News topic (e.g., AI, Climate)',
                website: 'News website URL'
            },
            defaultIntent: 'Track news about {topic} on {website}'
        },
        {
            id: 'data-scraper',
            name: 'Data Scraper',
            icon: '🔍',
            placeholders: {
                data_type: 'Type of data (e.g., Product listings)',
                website: 'Target URL'
            },
            defaultIntent: 'Extract {data_type} from {website}'
        },
        {
            id: 'content-aggregator',
            name: 'Content Aggregator',
            icon: '📚',
            placeholders: {
                content_type: 'Content type (e.g., Blog posts)',
                website: 'Primary source URL'
            },
            defaultIntent: 'Collect {content_type} from {website} and similar sources'
        },
        {
            id: 'custom-agent',
            name: 'Custom Agent',
            icon: '🛠️',
            placeholders: {
                custom_intent: 'Describe what your agent should do',
                website: 'Target website URL'
            },
            defaultIntent: '{custom_intent} on {website}'
        }
    ];
}

function renderTemplateSelect() {
    const select = document.getElementById('templateSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select a template...</option>' + templates.map(t => 
        `<option value="${t.id}">${t.icon} ${t.name}</option>`
    ).join('');
    
    // Don't render inputs until user selects
    const container = document.getElementById('dynamicInputs');
    container.innerHTML = '<input type="text" placeholder="Select a template to begin..." disabled>';
    
    // Disable create button initially
    const createBtn = document.getElementById('createAgentBtn');
    if (createBtn) createBtn.disabled = true;
}

function onTemplateChange() {
    const templateId = document.getElementById('templateSelect').value;
    const template = templates.find(t => t.id === templateId);
    
    const container = document.getElementById('dynamicInputs');
    const createBtn = document.getElementById('createAgentBtn');
    
    if (!template || !templateId) {
        container.innerHTML = '<input type="text" placeholder="Select a template to begin..." disabled>';
        if (createBtn) createBtn.disabled = true;
        return;
    }
    
    // Support both 'inputs' array (fallback) and 'placeholders' object (API)
    let inputsHtml = '';
    
    if (template.inputs && Array.isArray(template.inputs)) {
        // Fallback structure
        inputsHtml = template.inputs.map(input => `
            <input 
                type="${input.type || 'text'}" 
                id="input_${input.key}"
                placeholder="${input.placeholder || input.label}"
                data-key="${input.key}"
                required
            >
        `).join('');
    } else if (template.placeholders) {
        // API structure from src/templates.ts
        inputsHtml = Object.entries(template.placeholders).map(([key, label]) => {
            const isUrl = key.toLowerCase().includes('website') || key.toLowerCase().includes('url');
            return `
                <input 
                    type="${isUrl ? 'url' : 'text'}" 
                    id="input_${key}"
                    placeholder="${label}"
                    data-key="${key}"
                    required
                >
            `;
        }).join('');
    }
    
    container.innerHTML = inputsHtml;
    
    // Enable create button
    if (createBtn) createBtn.disabled = false;
    
    // Focus first input
    const firstInput = container.querySelector('input');
    if (firstInput) {
        firstInput.focus();
    }
}

window.onTemplateChange = onTemplateChange;

// ==================== LEGACY AGENT CREATION (Template-based) ====================

async function createAgent() {
    const templateId = document.getElementById('templateSelect')?.value;
    if (!templateId) {
        // Redirect to new prompt-based flow
        createAgentFromPrompt();
        return;
    }
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
        showToast('⚠️ Please select a template first');
        return;
    }
    
    const createBtn = document.querySelector('.btn-create');
    const originalText = createBtn.textContent;
    
    // Collect input values
    const values = {};
    let hasEmptyFields = false;
    
    // Get keys from either 'inputs' array or 'placeholders' object
    const inputKeys = template.inputs 
        ? template.inputs.map(i => i.key) 
        : Object.keys(template.placeholders || {});
    
    inputKeys.forEach(key => {
        const el = document.getElementById(`input_${key}`);
        if (el) {
            values[key] = el.value;
            if (!el.value.trim() && !el.placeholder.toLowerCase().includes('optional')) {
                hasEmptyFields = true;
            }
        }
    });
    
    if (hasEmptyFields) {
        showToast('⚠️ Please fill in all required fields');
        return;
    }
    
    // Build intent from template (handle both defaultIntent and intentTemplate naming)
    let userIntent = template.defaultIntent || template.intentTemplate;
    Object.entries(values).forEach(([key, value]) => {
        userIntent = userIntent.replace(`{${key}}`, value);
    });
    
    // Get target URL
    const targetUrl = values.website || values.url || '';
    
    // Get output type
    const outputType = document.querySelector('input[name="outputType"]:checked')?.value || 'text';
    
    // Store context for approval
    currentCreationContext = {
        template,
        templateId,
        userIntent,
        targetUrl,
        outputType,
        values
    };
    
    // Show loading
    createBtn.disabled = true;
    createBtn.textContent = 'Generating Plan...';
    
    // Clear previous output and reset pipeline
    clearOutput();
    resetPipeline();
    
    // Update pipeline to show progress
    updatePipeline('plan', 'active');
    appendOutput('🚀 Analyzing your request...\n');
    appendOutput(`Template: ${template.name}\n`);
    appendOutput(`Intent: ${userIntent}\n`);
    appendOutput(`Target: ${targetUrl}\n\n`);
    appendOutput('⏳ Generating execution plan...\n\n');
    
    try {
        // Step 1: Generate plan first
        const planResponse = await fetch(`${API_BASE}/genesis/plan`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                user_intent: userIntent,
                target_url: targetUrl
            })
        });
        
        const planResult = await planResponse.json();
        
        if (planResponse.ok && planResult.plan) {
            updatePipeline('plan', 'completed');
            
            // Show the plan with formatted styling
            appendOutput('\n📋 EXECUTION PLAN:\n');
            appendOutput('═'.repeat(60) + '\n\n');
            
            // Format the plan text (convert markdown-style formatting to readable output)
            const formattedPlan = formatPlanOutput(planResult.plan);
            appendOutput(formattedPlan + '\n\n');
            
            appendOutput('═'.repeat(60) + '\n\n');
            
            // Show approval buttons
            appendOutput('\n');
            const approvalDiv = document.createElement('div');
            approvalDiv.style.cssText = 'display: flex; gap: 10px; margin: 15px 0;';
            approvalDiv.innerHTML = `
                <button onclick="approveAndExecute()" style="
                    padding: 10px 20px;
                    background: #22c55e;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                ">✅ Approve & Execute</button>
                <button onclick="modifyPlan()" style="
                    padding: 10px 20px;
                    background: #f59e0b;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                ">✏️ Modify Plan</button>
                <button onclick="cancelCreation()" style="
                    padding: 10px 20px;
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                ">❌ Cancel</button>
            `;
            
            const outputContainer = document.getElementById('outputContainer');
            outputContainer.appendChild(approvalDiv);
            
            // Store the plan in context
            currentCreationContext.plan = planResult.plan;
            
            // Re-enable create button for future use
            createBtn.disabled = false;
            createBtn.textContent = originalText;
            
        } else {
            throw new Error(planResult.error || 'Failed to generate plan');
        }
    } catch (error) {
        // Find which step was active and mark it as failed
        const activeStep = document.querySelector('.pipeline-step.active');
        if (activeStep) {
            const step = activeStep.getAttribute('data-step');
            if (step) updatePipeline(step, 'failed');
        }
        
        appendOutput(`\n❌ Error: ${error.message}\n`);
        showToast(`❌ ${error.message}`);
        
        createBtn.disabled = false;
        createBtn.textContent = originalText;
    }
}

async function approveAndExecute() {
    if (!currentCreationContext) return;
    
    const { userIntent, targetUrl, outputType, tools_used } = currentCreationContext;
    
    // Remove approval buttons
    const approvalBtns = document.querySelector('.approval-buttons');
    if (approvalBtns) approvalBtns.remove();
    
    appendOutput('\n\n✅ Plan approved! Starting orchestration...\n\n');
    
    updatePipeline('generate', 'active');
    
    try {
        const response = await fetch(`${API_BASE}/genesis`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                user_intent: userIntent,
                target_url: targetUrl,
                output_format: outputType,
                personality: 'professional'
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Show realistic progress based on tools used
            const toolNames = (tools_used || []).map(t => t.name.toLowerCase());
            
            await new Promise(resolve => setTimeout(resolve, 500));
            appendOutput('🧠 Gemini: Planning execution...\n');
            updatePipeline('generate', 'completed');
            updatePipeline('test', 'active');
            
            if (toolNames.includes('agentql')) {
                await new Promise(resolve => setTimeout(resolve, 800));
                appendOutput('🤖 AgentQL: Initializing browser automation...\n');
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            appendOutput('🧪 Testing agent logic...\n');
            updatePipeline('test', 'completed');
            updatePipeline('review', 'active');
            
            if (toolNames.includes('freepik')) {
                await new Promise(resolve => setTimeout(resolve, 600));
                appendOutput('🎨 Freepik: Generating image...\n');
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            appendOutput('✨ Reviewing quality...\n');
            updatePipeline('review', 'completed');
            updatePipeline('deploy', 'active');
            
            if (toolNames.includes('yutori')) {
                await new Promise(resolve => setTimeout(resolve, 600));
                appendOutput('👁️ Yutori: Setting up monitoring scout...\n');
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            appendOutput('🚀 Deploying agent...\n\n');
            updatePipeline('deploy', 'completed');
            
            appendOutput('═'.repeat(60) + '\n');
            appendOutput(`✅ AGENT CREATED SUCCESSFULLY!\n`);
            appendOutput(`Agent ID: ${result.agent_id}\n`);
            appendOutput('═'.repeat(60) + '\n\n');
            
            appendOutput('📌 Your agent is now ready. Select it from the sidebar to run.\n');
            
            showToast('✅ Agent created successfully!');
            
            // Clear inputs
            document.getElementById('mainPrompt').value = '';
            document.getElementById('targetUrl').value = '';
            
            // Re-enable create button
            const createBtn = document.getElementById('createAgentBtn');
            createBtn.disabled = false;
            createBtn.textContent = '🚀 Orchestrate';
            
            // Refresh agent list and scouts
            await loadAgents();
            await loadScouts();
            selectedAgentId = result.agent_id;
            
            currentCreationContext = null;
            
        } else {
            throw new Error(result.error || 'Failed to create agent');
        }
    } catch (error) {
        const activeStep = document.querySelector('.pipeline-step.active');
        if (activeStep) {
            const step = activeStep.getAttribute('data-step');
            if (step) updatePipeline(step, 'failed');
        }
        appendOutput(`\n❌ Error: ${error.message}\n`);
        showToast(`❌ ${error.message}`);
    }
}

function modifyPlan() {
    if (!currentCreationContext) return;
    
    const newIntent = prompt('Modify your task description:', currentCreationContext.userIntent);
    if (newIntent && newIntent !== currentCreationContext.userIntent) {
        // Update the prompt input
        document.getElementById('mainPrompt').value = newIntent;
        
        // Trigger re-creation
        currentCreationContext = null;
        createAgentFromPrompt();
    }
}

function cancelCreation() {
    appendOutput('\n❌ Orchestration cancelled.\n');
    const createBtn = document.getElementById('createAgentBtn');
    createBtn.disabled = false;
    createBtn.textContent = '🚀 Orchestrate';
    resetPipeline();
    resetToolsDisplay();
    currentCreationContext = null;
}

async function regeneratePlan(newIntent) {
    const { targetUrl } = currentCreationContext;
    
    updatePipeline('plan', 'active');
    appendOutput('🔄 Regenerating plan with modified request...\n\n');
    
    try {
        const planResponse = await fetch(`${API_BASE}/genesis/plan`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                user_intent: newIntent,
                target_url: targetUrl
            })
        });
        
        const planResult = await planResponse.json();
        
        if (planResponse.ok && planResult.plan) {
            updatePipeline('plan', 'completed');
            
            appendOutput('\n📋 UPDATED EXECUTION PLAN:\n');
            appendOutput('═'.repeat(60) + '\n\n');
            
            const formattedPlan = formatPlanOutput(planResult.plan);
            appendOutput(formattedPlan + '\n\n');
            
            appendOutput('═'.repeat(60) + '\n\n');
            
            // Show approval buttons again
            const approvalDiv = document.createElement('div');
            approvalDiv.style.cssText = 'display: flex; gap: 10px; margin: 15px 0;';
            approvalDiv.innerHTML = `
                <button onclick="approveAndExecute()" style="
                    padding: 10px 20px;
                    background: #22c55e;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                ">✅ Approve & Execute</button>
                <button onclick="modifyPlan()" style="
                    padding: 10px 20px;
                    background: #f59e0b;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                ">✏️ Modify Again</button>
                <button onclick="cancelCreation()" style="
                    padding: 10px 20px;
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                ">❌ Cancel</button>
            `;
            
            const outputContainer = document.getElementById('outputContainer');
            outputContainer.appendChild(approvalDiv);
            
            currentCreationContext.plan = planResult.plan;
            currentCreationContext.userIntent = newIntent;
        }
    } catch (error) {
        updatePipeline('plan', 'failed');
        appendOutput(`\n❌ Error: ${error.message}\n`);
    }
}

function cancelCreation() {
    appendOutput('\n❌ Creation cancelled by user.\n');
    const createBtn = document.querySelector('.btn-create');
    createBtn.disabled = false;
    createBtn.textContent = 'Create Agent';
    resetPipeline();
    currentCreationContext = null;
}

window.approveAndExecute = approveAndExecute;
window.modifyPlan = modifyPlan;
window.cancelCreation = cancelCreation;
window.createAgent = createAgent;

// ==================== PIPELINE ====================

function updatePipeline(step, status) {
    const stepEl = document.getElementById(`step-${step}`);
    if (!stepEl) {
        console.warn(`Pipeline step not found: step-${step}`);
        return;
    }
    
    // Remove previous statuses
    stepEl.classList.remove('pending', 'active', 'completed', 'failed');
    stepEl.classList.add(status);
}

function resetPipeline() {
    const steps = ['plan', 'generate', 'test', 'review', 'deploy'];
    steps.forEach(step => {
        updatePipeline(step, 'pending');
    });
}

// ==================== OUTPUT ====================

function appendOutput(text) {
    const container = document.getElementById('outputContainer');
    
    // Remove placeholder if present
    const placeholder = container.querySelector('.output-placeholder');
    if (placeholder) {
        container.innerHTML = '';
    }
    
    // Append text
    const span = document.createElement('span');
    span.textContent = text.replace(/\\n/g, '\n');
    container.appendChild(span);
    
    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function clearOutput() {
    const container = document.getElementById('outputContainer');
    container.innerHTML = `
        <div class="output-placeholder">
            <div class="placeholder-icon">🤖</div>
            <p>Create an agent to see live output</p>
        </div>
    `;
    resetPipeline();
}

function copyOutput() {
    const container = document.getElementById('outputContainer');
    const text = container.innerText;
    navigator.clipboard.writeText(text)
        .then(() => showToast('📋 Output copied!'))
        .catch(err => console.error('Copy failed:', err));
}

function downloadOutput() {
    const container = document.getElementById('outputContainer');
    const text = container.innerText;
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ngenesis_output_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('⬇️ Output downloaded!');
}

window.clearOutput = clearOutput;
window.copyOutput = copyOutput;
window.downloadOutput = downloadOutput;

// ==================== RUN AGENT ====================

async function runSelectedAgent() {
    if (!selectedAgentId) {
        showToast('Please select an agent first');
        return;
    }
    
    const runBtn = document.getElementById('runAgentBtn');
    if (runBtn) {
        runBtn.disabled = true;
        runBtn.textContent = '⏳ Running...';
    }
    
    // Get selected tools
    const toolsList = Array.from(selectedTools);
    const useOrchestration = toolsList.length > 1; // Use orchestration for multi-tool
    
    appendOutput(`\n\n${'═'.repeat(60)}\n`);
    appendOutput(`🚀 STARTING MULTI-TOOL ORCHESTRATION\n`);
    appendOutput(`${'═'.repeat(60)}\n\n`);
    appendOutput(`🎯 Agent: ${selectedAgentId.substring(0, 8)}...\n`);
    appendOutput(`🛠️ Selected Tools: ${toolsList.join(', ')}\n`);
    
    if (useOrchestration) {
        appendOutput(`🔄 Feedback Loop: ENABLED\n`);
        appendOutput(`\n⏳ Phase 1: Executing tools...\n`);
    }
    
    try {
        // Use orchestrate endpoint for multi-tool, run for single tool
        const endpoint = useOrchestration 
            ? `${API_BASE}/agent/${selectedAgentId}/orchestrate`
            : `${API_BASE}/agent/${selectedAgentId}/run`;
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                selected_tools: toolsList,
                target_url: document.getElementById('targetUrl')?.value || ''
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show iterations if available
            if (result.iterations && result.iterations.length > 0) {
                appendOutput(`\n📊 PIPELINE EXECUTION LOG\n`);
                appendOutput(`${'─'.repeat(40)}\n`);
                result.iterations.forEach((iter, i) => {
                    appendOutput(`  ${i + 1}. ${iter.phase.replace(/_/g, ' ').toUpperCase()}\n`);
                    if (iter.tools_executed) {
                        appendOutput(`     Tools: ${iter.tools_executed.join(' → ')}\n`);
                    }
                });
                appendOutput(`\n`);
            }
            
            // Show tool outputs
            if (result.outputs) {
                appendOutput(`\n📦 TOOL OUTPUTS\n`);
                appendOutput(`${'─'.repeat(40)}\n`);
                for (const [tool, output] of Object.entries(result.outputs)) {
                    appendOutput(`\n🔧 ${tool.toUpperCase()}:\n`);
                    if (tool === 'freepik' && output.image_url) {
                        appendOutput(`   🖼️ Image: ${output.image_url}\n`);
                    } else if (tool === 'tinyfish' && output.ai_news_summary) {
                        appendOutput(`   📰 Found ${output.ai_news_summary.top_5_developments?.length || 0} developments\n`);
                        output.ai_news_summary.top_5_developments?.forEach((dev, i) => {
                            appendOutput(`   ${i + 1}. ${dev.title}\n`);
                        });
                    } else {
                        appendOutput(`   ${JSON.stringify(output, null, 2).substring(0, 300)}...\n`);
                    }
                }
            }
            
            // Show Gemini synthesis (feedback loop result)
            if (result.synthesis) {
                appendOutput(`\n\n🧠 GEMINI SYNTHESIS (Feedback Loop)\n`);
                appendOutput(`${'═'.repeat(60)}\n\n`);
                
                const syn = result.synthesis;
                
                // Quality Assessment
                if (syn.quality_assessment) {
                    const qa = syn.quality_assessment;
                    appendOutput(`📊 Quality Assessment:\n`);
                    appendOutput(`   Completeness: ${qa.completeness_score || '?'}/10\n`);
                    appendOutput(`   Data Quality: ${qa.data_quality_score || '?'}/10\n`);
                    if (qa.missing_elements?.length) {
                        appendOutput(`   Missing: ${qa.missing_elements.join(', ')}\n`);
                    }
                    appendOutput(`\n`);
                }
                
                // Final Response
                if (syn.final_response) {
                    const fr = syn.final_response;
                    appendOutput(`📝 FINAL SYNTHESIZED RESPONSE:\n`);
                    appendOutput(`${'─'.repeat(40)}\n\n`);
                    
                    if (fr.summary) {
                        appendOutput(`📌 Summary:\n${fr.summary}\n\n`);
                    }
                    
                    if (fr.key_insights?.length) {
                        appendOutput(`💡 Key Insights:\n`);
                        fr.key_insights.forEach((insight, i) => {
                            appendOutput(`   ${i + 1}. ${insight}\n`);
                        });
                        appendOutput(`\n`);
                    }
                    
                    if (fr.detailed_content) {
                        appendOutput(`📄 Detailed Content:\n${fr.detailed_content.substring(0, 1000)}${fr.detailed_content.length > 1000 ? '...' : ''}\n\n`);
                    }
                    
                    if (fr.generated_assets?.images?.length) {
                        appendOutput(`🖼️ Generated Images:\n`);
                        fr.generated_assets.images.forEach(url => {
                            appendOutput(`   ${url}\n`);
                        });
                    }
                }
                
                // Pipeline Feedback
                if (syn.pipeline_feedback) {
                    const pf = syn.pipeline_feedback;
                    appendOutput(`\n🔄 Pipeline Feedback:\n`);
                    if (pf.tools_that_worked_well?.length) {
                        appendOutput(`   ✅ Worked well: ${pf.tools_that_worked_well.join(', ')}\n`);
                    }
                    if (pf.tools_that_need_improvement?.length) {
                        appendOutput(`   ⚠️ Needs improvement: ${pf.tools_that_need_improvement.join(', ')}\n`);
                    }
                    if (pf.suggested_additional_tools?.length) {
                        appendOutput(`   💡 Suggested tools: ${pf.suggested_additional_tools.join(', ')}\n`);
                    }
                    if (pf.should_iterate) {
                        appendOutput(`   🔁 Iteration needed: ${pf.iteration_reason}\n`);
                    }
                }
            }
            
            // Show refinement if there was one
            if (result.refinement) {
                appendOutput(`\n\n🔧 REFINEMENT (Iteration 3)\n`);
                appendOutput(`${'─'.repeat(40)}\n`);
                appendOutput(`${result.refinement.substring(0, 500)}...\n`);
            }
            
            appendOutput(`\n${'═'.repeat(60)}\n`);
            appendOutput(`✅ ORCHESTRATION COMPLETE\n`);
            appendOutput(`   Iterations: ${result.iterations?.length || 1}\n`);
            appendOutput(`   Tools Used: ${result.tools_used?.join(' → ') || 'N/A'}\n`);
            appendOutput(`${'═'.repeat(60)}\n`);
            
            // Store in history
            addToResultsHistory({
                agentId: selectedAgentId,
                timestamp: new Date().toISOString(),
                results: result.final_output || result.outputs,
                tools_used: result.tools_used,
                synthesis: result.synthesis
            });
            
            window.currentResults = result;
            showToast('✅ Orchestration complete with feedback loop!');
        } else {
            throw new Error(result.error || 'Execution failed');
        }
    } catch (error) {
        appendOutput(`\n❌ Error: ${error.message}\n`);
        showToast(`❌ ${error.message}`);
    } finally {
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.textContent = '▶️ Run';
        }
    }
}

window.runSelectedAgent = runSelectedAgent;

// ==================== RESULTS HISTORY ====================

function addToResultsHistory(result) {
    resultsHistory.unshift(result);
    if (resultsHistory.length > 10) resultsHistory.pop();
    renderResultsHistory();
}

function renderResultsHistory() {
    const content = document.getElementById('resultsHistoryContent');
    if (!content) return;
    
    if (resultsHistory.length === 0) {
        content.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No results yet</p>';
        return;
    }
    
    content.innerHTML = resultsHistory.map((item, idx) => `
        <div class="result-item" onclick="loadResult(${idx})">
            <div class="result-item-header">
                <span>Agent ${item.agentId.substring(0, 8)}...</span>
                <span class="result-item-time">${formatTimestamp(item.timestamp)}</span>
            </div>
        </div>
    `).join('');
}

function loadResult(idx) {
    const result = resultsHistory[idx];
    if (!result) return;
    
    clearOutput();
    appendOutput(`📊 Results from ${formatTimestamp(result.timestamp)}:\\n\\n`);
    appendOutput(JSON.stringify(result.results, null, 2));
}

function toggleResultsHistory() {
    const content = document.getElementById('resultsHistoryContent');
    const icon = document.querySelector('.results-history-header span:last-child');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▲';
    } else {
        content.style.display = 'none';
        icon.textContent = '▼';
    }
}

window.loadResult = loadResult;
window.toggleResultsHistory = toggleResultsHistory;

// ==================== AGENTS LIST ====================

async function loadAgents() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        const data = await response.json();
        
        const agentList = document.getElementById('agentList');
        
        if (data.agents && data.agents.length > 0) {
            agentList.innerHTML = data.agents.map(agent => `
                <div class="agent-item ${agent.agent_id === selectedAgentId ? 'selected' : ''}"
                     onclick="selectAgent('${agent.agent_id}')">
                    <div class="agent-item-header">
                        <span class="agent-item-name">${agent.agent_id.substring(0, 8)}...</span>
                        <span class="agent-item-status ${agent.status === 'completed' ? '' : agent.status === 'failed' ? 'failed' : 'pending'}">
                            ${agent.status === 'completed' ? '✓' : agent.status === 'failed' ? '✗' : '⏳'}
                        </span>
                    </div>
                    <div class="agent-item-meta">
                        ${agent.monitoring_active ? '👁️ Monitoring' : ''}
                        ${agent.code_quality_score ? `⭐ ${agent.code_quality_score}` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            agentList.innerHTML = '<p class="empty-state-small">No agents yet</p>';
        }
    } catch (error) {
        console.error('Failed to load agents:', error);
    }
}

function selectAgent(agentId) {
    selectedAgentId = agentId;
    
    // Update UI selection
    document.querySelectorAll('.agent-item').forEach(item => {
        item.classList.remove('selected');
    });
    event.currentTarget?.classList.add('selected');
    
    // Enable the run button
    const runBtn = document.getElementById('runAgentBtn');
    if (runBtn) {
        runBtn.disabled = false;
    }
    
    // Load agent details
    loadAgentDetails(agentId);
}

async function loadAgentDetails(agentId) {
    try {
        const response = await fetch(`${API_BASE}/agent/${agentId}/files`);
        const data = await response.json();
        
        clearOutput();
        appendOutput(`📋 Agent: ${agentId}\n`);
        appendOutput(`Status: ${data.status || 'unknown'}\n\n`);
        
        if (data.files && data.files.length > 0) {
            appendOutput(`📁 Files:\n`);
            data.files.forEach(file => {
                appendOutput(`\n--- ${file.filename} ---\n`);
                appendOutput(file.content.substring(0, 500));
                if (file.content.length > 500) {
                    appendOutput('\n... (truncated)\n');
                }
            });
        }
        
        // Store files for download
        window.agentFiles = data.files;
        
        // Show run instructions
        if (data.status === 'completed') {
            appendOutput(`\n\n💡 Click "▶️ Run" to execute this agent\n`);
        }
        
    } catch (error) {
        console.error('Failed to load agent details:', error);
        appendOutput(`Error loading agent: ${error.message}`);
    }
}

window.selectAgent = selectAgent;

// Focus on create panel (from sidebar button)
function focusCreatePanel() {
    document.getElementById('templateSelect').focus();
    document.querySelector('.input-section').scrollIntoView({ behavior: 'smooth' });
}

window.focusCreatePanel = focusCreatePanel;

// ==================== SCOUTS LIST ====================

async function loadScouts() {
    try {
        const response = await fetch(`${API_BASE}/scouts`);
        const data = await response.json();
        
        const scoutList = document.getElementById('scoutList');
        
        if (data.scouts && data.scouts.length > 0) {
            scoutList.innerHTML = data.scouts.map(scout => `
                <div class="scout-item">
                    <div class="scout-item-header">
                        <span class="scout-item-id">👁️ ${(scout.task_id || scout.id || 'Scout').substring(0, 8)}...</span>
                        <span class="scout-status ${scout.status || 'active'}">${scout.status || 'active'}</span>
                    </div>
                    <div class="scout-item-query">${(scout.query || 'Monitoring...').substring(0, 30)}...</div>
                </div>
            `).join('');
        } else {
            scoutList.innerHTML = '<div class="empty-state-small">No active scouts</div>';
        }
    } catch (error) {
        console.error('Failed to load scouts:', error);
        const scoutList = document.getElementById('scoutList');
        scoutList.innerHTML = '<div class="empty-state-small">No active scouts</div>';
    }
}

// ==================== AUTO REFRESH ====================

function startAutoRefresh() {
    refreshInterval = setInterval(async () => {
        await loadAgents();
    }, 10000);
}

// ==================== UTILITIES ====================

function formatPlanOutput(planText) {
    // Convert markdown-style headings and code blocks to readable terminal format
    let formatted = planText;
    
    // Convert markdown headings to styled text
    formatted = formatted.replace(/^## (.*?)$/gm, '\n▶ $1\n' + '─'.repeat(40));
    formatted = formatted.replace(/^### (.*?)$/gm, '\n  ▸ $1');
    
    // Highlight code blocks
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang ? `[${lang.toUpperCase()}]` : '[CODE]';
        return `\n${language}\n${'┌' + '─'.repeat(58) + '┐'}\n${code.split('\n').map(line => `│ ${line.padEnd(57)}│`).join('\n')}\n${'└' + '─'.repeat(58) + '┘'}\n`;
    });
    
    // Highlight bullet points
    formatted = formatted.replace(/^- (.*?)$/gm, '  • $1');
    formatted = formatted.replace(/^\* (.*?)$/gm, '  • $1');
    
    // Highlight numbered lists
    formatted = formatted.replace(/^\d+\. (.*?)$/gm, (match, text) => `  ${match}`);
    
    // Add extra spacing around sections
    formatted = formatted.replace(/\n▶/g, '\n\n▶');
    
    return formatted;
}

function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
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

window.showToast = showToast;

// Cleanup
window.addEventListener('beforeunload', () => {
    if (refreshInterval) clearInterval(refreshInterval);
});
