// API Base URL
const API_BASE = window.location.origin;

// State
let selectedAgentId = null;
let refreshInterval = null;
let selectedTemplate = null;
let templates = [];
let currentUser = null;
let authToken = null;

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

    // Load templates
    await loadTemplates();

    // Load initial data
    await loadPrizeStats();
    await loadAgents();
    await loadScouts();

    // Setup form handler
    document.getElementById('createAgentForm').addEventListener('submit', handleCreateAgent);

    // Start auto-refresh
    startAutoRefresh();
}

// ==================== AUTHENTICATION ====================

function showAuthModal(mode = 'login') {
    document.getElementById('authModal').style.display = 'flex';
    switchAuthMode(mode);
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
    // Clear form errors
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
            
            // Store in localStorage
            localStorage.setItem('ngenesis_token', authToken);
            localStorage.setItem('ngenesis_user', JSON.stringify(currentUser));
            
            updateUserUI();
            closeAuthModal();
            showToast(`👋 Welcome back, ${currentUser.name || currentUser.email}!`);
            
            // Reload agents for this user
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
            
            // Store in localStorage
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
                <span class="user-avatar">${(currentUser.name || currentUser.email).charAt(0).toUpperCase()}</span>
                <span class="user-name">${currentUser.name || currentUser.email}</span>
                <button class="btn-header" onclick="logout()">Logout</button>
            </div>
        `;
    } else {
        userSection.innerHTML = `
            <button id="loginBtn" class="btn-header" onclick="showAuthModal('login')">Login</button>
            <button id="registerBtn" class="btn-header-primary" onclick="showAuthModal('register')">Sign Up</button>
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

// Get auth headers for API calls
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

// Template System
async function loadTemplates() {
    try {
        const response = await fetch(`${API_BASE}/api/templates`);
        templates = await response.json();
        renderTemplateGallery();
    } catch (error) {
        console.error('Error loading templates:', error);
        // Fallback to built-in templates
        templates = getBuiltInTemplates();
        renderTemplateGallery();
    }
}

function getBuiltInTemplates() {
    return [
        {
            id: 'price-monitor',
            name: 'Price Monitor',
            description: 'Track product prices and get alerts on changes',
            icon: '💰',
            category: 'monitoring',
            requiredPlugins: ['agentql', 'yutori'],
            defaultIntent: 'Monitor {product} prices on {website} and alert on drops',
            placeholders: {
                product: 'Product name (e.g., iPhone 15)',
                website: 'Website URL',
                customization: 'Alert conditions (optional)'
            },
            examples: ['iPhone on Amazon', 'Tesla stock', 'GPU prices on Newegg']
        },
        {
            id: 'news-tracker',
            name: 'News Tracker',
            description: 'Monitor news sites for specific topics',
            icon: '📰',
            category: 'monitoring',
            requiredPlugins: ['agentql', 'yutori'],
            defaultIntent: 'Track news about {topic} on {website}',
            placeholders: {
                topic: 'News topic (e.g., AI, Climate)',
                website: 'News website URL'
            },
            examples: ['AI releases on TechCrunch', 'Climate news on BBC']
        },
        {
            id: 'data-scraper',
            name: 'Data Scraper',
            description: 'Extract data from websites into structured format',
            icon: '🔍',
            category: 'scraping',
            requiredPlugins: ['agentql'],
            defaultIntent: 'Extract {data_type} from {website}',
            placeholders: {
                data_type: 'Type of data (e.g., Product listings)',
                website: 'Target website URL'
            },
            examples: ['Product listings', 'Job postings', 'Real estate data']
        },
        {
            id: 'content-aggregator',
            name: 'Content Aggregator',
            description: 'Gather content from multiple sources',
            icon: '📚',
            category: 'research',
            requiredPlugins: ['agentql'],
            defaultIntent: 'Collect {content_type} from {website} and other sources like {sources}',
            placeholders: {
                content_type: 'Content type (e.g., Blog posts)',
                sources: 'Other sources (optional)',
                website: 'Primary Website URL'
            },
            examples: ['Blog posts on AI', 'Research papers', 'Social media posts']
        },
        {
            id: 'form-filler',
            name: 'Form Automation',
            description: 'Automatically fill out web forms',
            icon: '📝',
            category: 'automation',
            requiredPlugins: ['agentql'],
            defaultIntent: 'Fill {form_type} on {website} with provided data',
            placeholders: {
                form_type: 'Form type (e.g., Survey)',
                website: 'Website with the form'
            },
            examples: ['Survey submissions', 'Application forms']
        },
        {
            id: 'custom-agent',
            name: 'Custom Agent',
            description: 'Build your own agent from scratch',
            icon: '🛠️',
            category: 'automation',
            requiredPlugins: ['agentql'],
            defaultIntent: '{custom_intent}',
            placeholders: {
                custom_intent: 'Describe what your agent should do',
                website: 'Target website URL'
            },
            examples: []
        }
    ];
}

function renderTemplateGallery() {
    const gallery = document.getElementById('templateGallery');
    gallery.innerHTML = templates.map(template => `
        <div class="template-card" onclick="selectTemplate('${template.id}')">
            <div class="template-icon">${template.icon}</div>
            <div class="template-name">${template.name}</div>
            <div class="template-description">${template.description}</div>
            <div class="template-category">${template.category}</div>
            ${template.examples.length > 0 ? `<div class="template-examples">e.g., ${template.examples[0]}</div>` : ''}
        </div>
    `).join('');
}

function selectTemplate(templateId) {
    selectedTemplate = templates.find(t => t.id === templateId);
    if (!selectedTemplate) return;

    // Hide gallery, show config
    const galleryCard = document.querySelector('.template-grid');
    if (galleryCard && galleryCard.closest('.card')) {
        galleryCard.closest('.card').style.display = 'none';
    }
    
    const configEl = document.getElementById('templateConfig');
    if (configEl) {
        configEl.style.display = 'block';
    }

    // Show selected template info
    const infoEl = document.getElementById('selectedTemplateInfo');
    if (infoEl) {
        infoEl.innerHTML = `
            <h3>${selectedTemplate.icon} ${selectedTemplate.name}</h3>
            <p>${selectedTemplate.description}</p>
        `;
    }

    // Generate dynamic fields
    const fieldsEl = document.getElementById('dynamicFields');
    if (fieldsEl) {
        fieldsEl.innerHTML = Object.entries(selectedTemplate.placeholders)
            .map(([key, label]) => {
                // Determine input type based on field name
                const isUrl = key.toLowerCase().includes('website') || 
                              key.toLowerCase().includes('url') || 
                              label.toLowerCase().includes('url');
                
                // Determine if field is required (not optional fields)
                const isOptional = key.toLowerCase().includes('customization') || 
                                  key.toLowerCase().includes('optional') ||
                                  label.toLowerCase().includes('optional');
                
                return `
                    <div class="form-group">
                        <label for="field_${key}">${label}</label>
                        <input
                            type="${isUrl ? 'url' : 'text'}"
                            id="field_${key}"
                            placeholder="${label}"
                            ${!isOptional ? 'required' : ''}
                        >
                    </div>
                `;
            }).join('');
    }
}

function backToGallery() {
    const configEl = document.getElementById('templateConfig');
    if (configEl) {
        configEl.style.display = 'none';
    }
    
    const galleryCard = document.querySelector('.template-grid');
    if (galleryCard && galleryCard.closest('.card')) {
        galleryCard.closest('.card').style.display = 'block';
    }
    
    selectedTemplate = null;
}

// Make functions globally accessible for onclick handlers
window.selectTemplate = selectTemplate;
window.backToGallery = backToGallery;


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

    // Build agent request from template
    let userIntent, targetUrl;
    
    if (selectedTemplate) {
        // Template-based creation
        const fieldValues = {};
        Object.keys(selectedTemplate.placeholders).forEach(key => {
            const input = document.getElementById(`field_${key}`);
            if (input) {
                fieldValues[key] = input.value;
            }
        });

        // Fill template intent with values
        userIntent = selectedTemplate.defaultIntent;
        Object.entries(fieldValues).forEach(([key, value]) => {
            userIntent = userIntent.replace(`{${key}}`, value);
        });

        // Find the URL field (check for website, url, or any field that looks like a URL)
        targetUrl = fieldValues.website || 
                    fieldValues.url || 
                    fieldValues.target_url ||
                    Object.values(fieldValues).find(val => 
                        typeof val === 'string' && 
                        (val.startsWith('http://') || val.startsWith('https://'))
                    ) || 
                    '';
    } else {
        // Legacy direct creation (fallback)
        userIntent = document.getElementById('userIntent')?.value || '';
        targetUrl = document.getElementById('targetUrl')?.value || '';
    }

    // Get selected output format
    const outputFormat = document.querySelector('input[name="outputFormat"]:checked')?.value || 'view';

    const data = {
        user_intent: userIntent,
        target_url: targetUrl,
        agent_name: document.getElementById('agentName').value || undefined,
        template_id: selectedTemplate?.id,
        output_format: outputFormat,
        personality: 'professional'
    };

    try {
        const response = await fetch(`${API_BASE}/genesis`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            statusEl.className = 'status-message success';
            statusEl.textContent = `✅ Agent created successfully! ID: ${result.agent_id}`;
            statusEl.style.display = 'block';

            // Show workflow visualization
            if (window.workflowViz) {
                window.workflowViz.show(result.agent_id);
            }

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
        statusEl.textContent = `❌ Error: ${error.message}`;
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
        
        // Show agent reliability (quality score)
        const reliability = stats.average_quality_score;
        document.getElementById('avgQuality').textContent = reliability;

        // Calculate success rate
        const successRate = stats.total_agents > 0 
            ? Math.round((stats.completed_agents / stats.total_agents) * 100) 
            : 0;
        document.getElementById('successRate').textContent = `${successRate}%`;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
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

    // Load timeline and agent files
    await loadTimeline(agentId);
    await loadAgentFiles(agentId);
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

// Load Agent Files
async function loadAgentFiles(agentId) {
    try {
        const response = await fetch(`${API_BASE}/agent/${agentId}/files`);
        const data = await response.json();

        const outputSection = document.getElementById('agentOutputSection');
        const outputMeta = document.getElementById('agentOutputMeta');
        const outputFiles = document.getElementById('agentOutputFiles');
        const resultsPreview = document.getElementById('resultsPreview');

        if (data.files && data.files.length > 0) {
            outputSection.style.display = 'block';

            // Build meta information with better display
            let metaHtml = '';
            if (data.icon_url && !data.icon_url.includes('placeholder')) {
                metaHtml += `<img src="${data.icon_url}" alt="Agent Icon" class="agent-icon-preview">`;
            }
            if (data.status === 'completed') {
                metaHtml += '<span class="meta-item success">✅ Ready to Run</span>';
            }
            if (data.code_quality_score) {
                metaHtml += `<span class="meta-item">⭐ Quality: ${data.code_quality_score}/100</span>`;
            }
            if (data.monitoring_active) {
                metaHtml += `<span class="meta-item">👁️ Monitoring Active</span>`;
            }
            if (data.yutori_scout_id) {
                metaHtml += `<span class="meta-item">🔄 Scout: ${data.yutori_scout_id.substring(0, 8)}...</span>`;
            }
            outputMeta.innerHTML = metaHtml;

            // Reset results preview
            if (resultsPreview) {
                resultsPreview.style.display = 'none';
            }

            // Build file cards with collapsible view
            outputFiles.innerHTML = data.files.map((file, index) => `
                <div class="file-card">
                    <div class="file-header" onclick="toggleFileContent(${index})">
                        <span class="file-name">
                            📄 ${file.filename}
                            <span class="file-language">${file.language}</span>
                        </span>
                        <div class="file-actions">
                            <button onclick="event.stopPropagation(); copyFileContent(${index})">📋 Copy</button>
                            <button onclick="event.stopPropagation(); downloadFile('${file.filename}', ${index})">⬇️ Download</button>
                            <span class="toggle-icon" id="toggleIcon_${index}">▼</span>
                        </div>
                    </div>
                    <div class="file-content" id="fileContentWrapper_${index}">
                        <pre><code id="fileContent_${index}">${escapeHtml(file.content)}</code></pre>
                    </div>
                </div>
            `).join('');

            // Store file contents for copy/download
            window.agentFiles = data.files;
            
            // Scroll to output section
            outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            outputSection.style.display = 'none';
        }
    } catch (error) {
        console.error('Failed to load agent files:', error);
    }
}

// Toggle file content visibility
function toggleFileContent(index) {
    const wrapper = document.getElementById(`fileContentWrapper_${index}`);
    const icon = document.getElementById(`toggleIcon_${index}`);
    
    if (wrapper.style.display === 'none') {
        wrapper.style.display = 'block';
        icon.textContent = '▼';
    } else {
        wrapper.style.display = 'none';
        icon.textContent = '▶';
    }
}

// Make toggle function globally accessible
window.toggleFileContent = toggleFileContent;

// Escape HTML for code display
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Copy file content to clipboard
function copyFileContent(index) {
    if (window.agentFiles && window.agentFiles[index]) {
        navigator.clipboard.writeText(window.agentFiles[index].content)
            .then(() => {
                showToast('✅ Code copied to clipboard!');
            })
            .catch(err => {
                console.error('Failed to copy:', err);
            });
    }
}

// Show toast notification
function showToast(message) {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// Download file
function downloadFile(filename, index) {
    if (window.agentFiles && window.agentFiles[index]) {
        const blob = new Blob([window.agentFiles[index].content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Make functions globally accessible
window.copyFileContent = copyFileContent;
window.downloadFile = downloadFile;

// Run Agent - Execute the generated Python script
async function runAgent() {
    if (!selectedAgentId) {
        showToast('Please select an agent first');
        return;
    }

    const runBtn = document.getElementById('runAgentBtn');
    const resultsPreview = document.getElementById('resultsPreview');
    const resultsContent = document.getElementById('resultsContent');
    
    // Show running state
    runBtn.disabled = true;
    runBtn.innerHTML = '<span class="running-spinner"></span> Running...';
    
    try {
        const response = await fetch(`${API_BASE}/agent/${selectedAgentId}/run`, {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            // Store results for download
            window.agentResults = data.results;
            
            // Show results preview
            resultsPreview.style.display = 'block';
            resultsContent.innerHTML = `<pre>${formatResults(data.results)}</pre>`;
            
            // Scroll to results
            resultsPreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            throw new Error(data.error || 'Failed to run agent');
        }
    } catch (error) {
        console.error('Failed to run agent:', error);
        resultsPreview.style.display = 'block';
        resultsContent.innerHTML = `<pre style="color: #ff6b6b;">Error: ${error.message}\n\nNote: This is a preview. In production, the agent would:\n1. Connect to the target website\n2. Extract data using AgentQL selectors\n3. Return structured results\n\nThe generated agent code is ready to use!</pre>`;
    } finally {
        runBtn.disabled = false;
        runBtn.innerHTML = '▶️ Run Agent Now';
    }
}

// Format results for display
function formatResults(results) {
    if (typeof results === 'string') {
        return results;
    }
    return JSON.stringify(results, null, 2);
}

// Download all agent files as ZIP
async function downloadAllFiles() {
    if (!window.agentFiles || window.agentFiles.length === 0) {
        showToast('No files to download');
        return;
    }

    // For simplicity, download as combined text file
    // In production, you'd use a library like JSZip
    let combined = '';
    window.agentFiles.forEach(file => {
        combined += `\n${'='.repeat(50)}\n`;
        combined += `FILE: ${file.filename}\n`;
        combined += `${'='.repeat(50)}\n\n`;
        combined += file.content;
        combined += '\n\n';
    });

    const blob = new Blob([combined], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent_${selectedAgentId.substring(0, 8)}_files.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('✅ Files downloaded!');
}

// Download results in specified format
function downloadResults(format) {
    if (!window.agentResults) {
        showToast('No results to download. Run the agent first!');
        return;
    }

    let content, filename, mimeType;

    if (format === 'json') {
        content = JSON.stringify(window.agentResults, null, 2);
        filename = `agent_results_${selectedAgentId.substring(0, 8)}.json`;
        mimeType = 'application/json';
    } else if (format === 'csv') {
        content = convertToCSV(window.agentResults.data || window.agentResults);
        filename = `agent_results_${selectedAgentId.substring(0, 8)}.csv`;
        mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`✅ Downloaded as ${format.toUpperCase()}!`);
}

// Convert results to CSV format
function convertToCSV(data) {
    if (!Array.isArray(data)) {
        data = [data];
    }
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
        headers.map(header => {
            const val = row[header];
            // Escape quotes and wrap in quotes if contains comma
            if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
}

// Copy results to clipboard
function copyResults() {
    if (!window.agentResults) {
        showToast('No results to copy. Run the agent first!');
        return;
    }

    const text = JSON.stringify(window.agentResults, null, 2);
    navigator.clipboard.writeText(text)
        .then(() => showToast('✅ Results copied to clipboard!'))
        .catch(err => console.error('Failed to copy:', err));
}

// Make new functions globally accessible
window.runAgent = runAgent;
window.downloadAllFiles = downloadAllFiles;
window.downloadResults = downloadResults;
window.copyResults = copyResults;

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
        'initializing': '🎯 Getting ready...',
        'planning': '🧠 Planning approach...',
        'decomposing': '📋 Understanding task...',
        'fabricating': '🧪 Testing setup...',
        'reviewing': '✨ Checking quality...',
        'verifying': '🔍 Final checks...',
        'monitoring': '👁️ Setting up monitoring...',
        'deploying': '🚀 Deploying agent...',
        'completed': '✅ Ready to use!',
        'failed': '❌ Something went wrong'
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

// Workflow Visualization
class WorkflowVisualizer {
    constructor() {
        this.nodes = [];
        this.currentAgentId = null;
    }

    show(agentId) {
        this.currentAgentId = agentId;
        const workflowSection = document.getElementById('workflowSection');
        if (workflowSection) {
            workflowSection.style.display = 'block';
            this.initializeNodes();
            this.startPolling();
        }
    }

    hide() {
        const workflowSection = document.getElementById('workflowSection');
        if (workflowSection) {
            workflowSection.style.display = 'none';
        }
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
    }

    initializeNodes() {
        // Define the workflow steps
        this.nodes = [
            { id: 'init', label: 'Initialize', icon: '🎯', status: 'pending', plugin: 'agentql' },
            { id: 'plan', label: 'Planning', icon: '🧠', status: 'pending', plugin: 'gemini' },
            { id: 'decompose', label: 'Decompose', icon: '📋', status: 'pending', plugin: 'gemini' },
            { id: 'fabricate', label: 'Test Setup', icon: '🧪', status: 'pending', plugin: 'fabricate' },
            { id: 'review', label: 'Quality Check', icon: '✨', status: 'pending', plugin: 'cline' },
            { id: 'verify', label: 'Verify', icon: '🔍', status: 'pending', plugin: 'macroscope' },
            { id: 'monitor', label: 'Monitoring', icon: '👁️', status: 'pending', plugin: 'yutori' },
            { id: 'complete', label: 'Complete', icon: '✅', status: 'pending', plugin: 'agentql' }
        ];
        this.render();
    }

    render() {
        const canvas = document.getElementById('workflowCanvas');
        if (!canvas) return;
        
        const container = document.createElement('div');
        container.className = 'workflow-container';

        this.nodes.forEach((node, index) => {
            // Create node element
            const nodeEl = document.createElement('div');
            nodeEl.className = `workflow-node ${node.status}`;
            nodeEl.innerHTML = `
                <div class="node-icon">${node.icon}</div>
                <div class="node-label">${node.label}</div>
                <div class="node-status">${this.getStatusIcon(node.status)}</div>
            `;
            container.appendChild(nodeEl);

            // Add connector line if not last node
            if (index < this.nodes.length - 1) {
                const connector = document.createElement('div');
                connector.className = 'workflow-connector';
                container.appendChild(connector);
            }
        });

        canvas.innerHTML = '';
        canvas.appendChild(container);
    }

    getStatusIcon(status) {
        const icons = {
            'pending': '⏳',
            'running': '⚡',
            'completed': '✅',
            'failed': '❌'
        };
        return icons[status] || '⏳';
    }

    updateFromTimeline(timeline) {
        if (!timeline || timeline.length === 0) return;

        // Map timeline statuses to workflow nodes
        const statusMap = {
            'initializing': 'init',
            'planning': 'plan',
            'decomposing': 'decompose',
            'fabricating': 'fabricate',
            'reviewing': 'review',
            'verifying': 'verify',
            'monitoring': 'monitor',
            'deploying': 'complete',
            'completed': 'complete',
            'failed': 'complete'
        };

        // Get latest status
        const latestEvent = timeline[timeline.length - 1];
        const currentStep = statusMap[latestEvent.status] || 'init';

        // Update nodes based on progress
        let foundCurrent = false;
        this.nodes.forEach(node => {
            if (!foundCurrent) {
                if (node.id === currentStep) {
                    node.status = latestEvent.status === 'failed' ? 'failed' : 
                                  latestEvent.status === 'completed' ? 'completed' : 'running';
                    foundCurrent = true;
                } else {
                    node.status = 'completed';
                }
            } else {
                node.status = 'pending';
            }
        });

        this.render();
    }

    startPolling() {
        // Poll for updates every 2 seconds
        this.pollingInterval = setInterval(async () => {
            if (!this.currentAgentId) return;

            try {
                const response = await fetch(`${API_BASE}/timeline/${this.currentAgentId}`);
                const data = await response.json();
                
                if (data.events) {
                    this.updateFromTimeline(data.events);
                }

                // Stop polling if completed or failed
                if (data.status === 'completed' || data.status === 'failed') {
                    clearInterval(this.pollingInterval);
                }
            } catch (error) {
                console.error('Failed to poll workflow status:', error);
            }
        }, 2000);
    }
}

// Initialize workflow visualizer (make it global)
window.workflowViz = new WorkflowVisualizer();
