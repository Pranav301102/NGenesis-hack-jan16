import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';

// Initialize SQLite database
const dbPath = path.join(__dirname, '../data/ngenesis.db');
const db = new Database(dbPath);

// JWT Secret (should be in .env in production)
const JWT_SECRET = process.env.JWT_SECRET || 'ngenesis-secret-key-change-in-production';

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  );

  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT,
    template_id TEXT,
    user_intent TEXT,
    target_url TEXT,
    status TEXT DEFAULT 'initializing',
    icon_url TEXT,
    code_quality_score INTEGER,
    monitoring_active INTEGER DEFAULT 0,
    yutori_scout_id TEXT,
    output_format TEXT DEFAULT 'view',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS agent_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    content TEXT,
    language TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS agent_timeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    event_name TEXT NOT NULL,
    status TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS agent_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    results TEXT,
    execution_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS user_plugins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plugin_id TEXT NOT NULL,
    api_key TEXT,
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

console.log('✓ SQLite database initialized');

// User Interface
export interface User {
  id: number;
  email: string;
  password?: string;
  name?: string;
  created_at: string;
  last_login?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: Omit<User, 'password'>;
  token?: string;
  error?: string;
}

// User Functions
export function registerUser(email: string, password: string, name?: string): AuthResponse {
  try {
    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return { success: false, error: 'Email already registered' };
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Insert user
    const stmt = db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)');
    const result = stmt.run(email, hashedPassword, name || email.split('@')[0]);

    // Get the created user
    const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(result.lastInsertRowid) as User;

    // Generate token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    return { success: true, user, token };
  } catch (error: any) {
    console.error('[DB] Register error:', error);
    return { success: false, error: error.message };
  }
}

export function loginUser(email: string, password: string): AuthResponse {
  try {
    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
    
    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Check password
    const validPassword = bcrypt.compareSync(password, user.password!);
    if (!validPassword) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Update last login
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    // Generate token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return { success: true, user: userWithoutPassword, token };
  } catch (error: any) {
    console.error('[DB] Login error:', error);
    return { success: false, error: error.message };
  }
}

export function verifyToken(token: string): { userId: number; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
    return decoded;
  } catch {
    return null;
  }
}

export function getUserById(userId: number): User | null {
  try {
    const user = db.prepare('SELECT id, email, name, created_at, last_login FROM users WHERE id = ?').get(userId) as User | undefined;
    return user || null;
  } catch {
    return null;
  }
}

// Agent Functions
export interface DBAgent {
  id: string;
  user_id: number;
  name?: string;
  template_id?: string;
  user_intent: string;
  target_url: string;
  status: string;
  icon_url?: string;
  code_quality_score?: number;
  monitoring_active: number;
  yutori_scout_id?: string;
  output_format: string;
  created_at: string;
  updated_at: string;
}

export function saveAgent(agent: Partial<DBAgent>): void {
  const stmt = db.prepare(`
    INSERT INTO agents (id, user_id, name, template_id, user_intent, target_url, status, icon_url, 
                        code_quality_score, monitoring_active, yutori_scout_id, output_format)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      icon_url = excluded.icon_url,
      code_quality_score = excluded.code_quality_score,
      monitoring_active = excluded.monitoring_active,
      yutori_scout_id = excluded.yutori_scout_id,
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run(
    agent.id,
    agent.user_id,
    agent.name,
    agent.template_id,
    agent.user_intent,
    agent.target_url,
    agent.status || 'initializing',
    agent.icon_url,
    agent.code_quality_score,
    agent.monitoring_active ? 1 : 0,
    agent.yutori_scout_id,
    agent.output_format || 'view'
  );
}

export function updateAgentStatus(agentId: string, status: string, updates?: Partial<DBAgent>): void {
  let sql = 'UPDATE agents SET status = ?, updated_at = CURRENT_TIMESTAMP';
  const params: any[] = [status];

  if (updates) {
    if (updates.icon_url !== undefined) {
      sql += ', icon_url = ?';
      params.push(updates.icon_url);
    }
    if (updates.code_quality_score !== undefined) {
      sql += ', code_quality_score = ?';
      params.push(updates.code_quality_score);
    }
    if (updates.monitoring_active !== undefined) {
      sql += ', monitoring_active = ?';
      params.push(updates.monitoring_active ? 1 : 0);
    }
    if (updates.yutori_scout_id !== undefined) {
      sql += ', yutori_scout_id = ?';
      params.push(updates.yutori_scout_id);
    }
  }

  sql += ' WHERE id = ?';
  params.push(agentId);

  db.prepare(sql).run(...params);
}

export function getAgentsByUser(userId: number): DBAgent[] {
  return db.prepare('SELECT * FROM agents WHERE user_id = ? ORDER BY created_at DESC').all(userId) as DBAgent[];
}

export function getAgentById(agentId: string): DBAgent | null {
  return db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as DBAgent | null;
}

// Agent Files
export function saveAgentFile(agentId: string, filename: string, content: string, language: string): void {
  db.prepare(`
    INSERT INTO agent_files (agent_id, filename, content, language)
    VALUES (?, ?, ?, ?)
  `).run(agentId, filename, content, language);
}

export function getAgentFiles(agentId: string): { filename: string; content: string; language: string }[] {
  return db.prepare('SELECT filename, content, language FROM agent_files WHERE agent_id = ?').all(agentId) as any[];
}

// Agent Timeline
export function addTimelineEvent(agentId: string, eventName: string, status: string, details?: string): void {
  db.prepare(`
    INSERT INTO agent_timeline (agent_id, event_name, status, details)
    VALUES (?, ?, ?, ?)
  `).run(agentId, eventName, status, details);
}

export function getAgentTimeline(agentId: string): { event_name: string; status: string; details?: string; timestamp: string }[] {
  return db.prepare('SELECT event_name, status, details, timestamp FROM agent_timeline WHERE agent_id = ? ORDER BY timestamp ASC').all(agentId) as any[];
}

// Agent Results
export function saveAgentResults(agentId: string, runId: string, results: any, executionTimeMs: number): void {
  db.prepare(`
    INSERT INTO agent_results (agent_id, run_id, results, execution_time_ms)
    VALUES (?, ?, ?, ?)
  `).run(agentId, runId, JSON.stringify(results), executionTimeMs);
}

export function getAgentResults(agentId: string): any[] {
  const rows = db.prepare('SELECT * FROM agent_results WHERE agent_id = ? ORDER BY created_at DESC').all(agentId) as any[];
  return rows.map(row => ({
    ...row,
    results: JSON.parse(row.results)
  }));
}

// User Plugins
export function saveUserPlugin(userId: number, pluginId: string, apiKey: string): void {
  db.prepare(`
    INSERT INTO user_plugins (user_id, plugin_id, api_key, enabled)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(user_id, plugin_id) DO UPDATE SET
      api_key = excluded.api_key,
      enabled = 1
  `).run(userId, pluginId, apiKey);
}

export function getUserPlugins(userId: number): { plugin_id: string; api_key: string; enabled: number }[] {
  return db.prepare('SELECT plugin_id, api_key, enabled FROM user_plugins WHERE user_id = ?').all(userId) as any[];
}

// Stats
export function getUserStats(userId: number): { total_agents: number; completed_agents: number; active_monitoring: number } {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_agents,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_agents,
      SUM(monitoring_active) as active_monitoring
    FROM agents WHERE user_id = ?
  `).get(userId) as any;

  return {
    total_agents: stats.total_agents || 0,
    completed_agents: stats.completed_agents || 0,
    active_monitoring: stats.active_monitoring || 0
  };
}

export default db;
