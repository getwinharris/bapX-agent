import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.BAPX_DB_PATH || path.join(__dirname, '..', 'data', 'bapx.db')
try {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
} catch (err) {
  console.error(`Failed to create data directory: ${err}`)
  process.exit(1)
}

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    age TEXT DEFAULT '',
    nature TEXT DEFAULT '',
    agent_name TEXT DEFAULT 'BapX',
    bio TEXT DEFAULT '',
    soul_md TEXT DEFAULT '',
    provider TEXT DEFAULT 'openai',
    api_key TEXT DEFAULT '',
    model TEXT DEFAULT '',
    oauth_provider TEXT DEFAULT '',
    oauth_token TEXT DEFAULT '',
    oauth_refresh_token TEXT DEFAULT '',
    oauth_expires_at TEXT DEFAULT '',
    custom_providers TEXT DEFAULT '[]',
    fallback_providers TEXT DEFAULT '[]',
    pooled_credentials TEXT DEFAULT '[]',
    skills_enabled TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'New Chat',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('user','assistant','system','tool')),
    content TEXT NOT NULL,
    tool_calls TEXT,
    tool_call_id TEXT,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    master_instruction TEXT DEFAULT '',
    pinned INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mcp_servers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'custom',
    config TEXT DEFAULT '{}',
    description TEXT DEFAULT '',
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    schedule TEXT NOT NULL,
    output_method TEXT DEFAULT 'file',
    enabled INTEGER DEFAULT 1,
    last_run TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS task_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id TEXT,
    status TEXT DEFAULT 'pending',
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    output_preview TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    prompt TEXT DEFAULT '',
    source TEXT DEFAULT 'user',
    enabled INTEGER DEFAULT 1,
    skill_data TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS memory (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    category TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
  CREATE INDEX IF NOT EXISTS idx_mcps_user ON mcp_servers(user_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_user ON scheduled_tasks(user_id);
  CREATE INDEX IF NOT EXISTS idx_skills_user ON skills(user_id);
`)

export default db
