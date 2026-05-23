import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const DEFAULT_DB_DIR = path.join(process.env.HOME || '/root', '.bapx');
const DEFAULT_DB_PATH = path.join(DEFAULT_DB_DIR, 'memory.db');

export interface MemoryEntry {
  id: number;
  user_id: string;
  content: string;
  created_at: string;
}

export interface MemorySearchResult {
  id: number;
  user_id: string;
  content: string;
  created_at: string;
  rank: number;
}

/**
 * SQLite-backed persistent memory system with FTS5 full-text search.
 * Each user gets their own memory table, namespaced by user_id.
 */
export class MemorySystem {
  private db: Database.Database;
  private dbPath: string;
  private tables = new Set<string>();

  constructor(dbPath?: string) {
    this.dbPath = dbPath || DEFAULT_DB_PATH;
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  /** Ensure a user's memory table and FTS index exist. */
  private ensureTable(userId: string): void {
    if (this.tables.has(userId)) return;

    const tableName = `mem_${this.sanitizeTableName(userId)}`;
    const ftsName = `mem_${this.sanitizeTableName(userId)}_fts`;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS ${ftsName} USING fts5(
        content,
        content='${tableName}',
        content_rowid='id'
      );

      CREATE TRIGGER IF NOT EXISTS ${tableName}_ai AFTER INSERT ON ${tableName} BEGIN
        INSERT INTO ${ftsName}(rowid, content) VALUES (new.id, new.content);
      END;

      CREATE TRIGGER IF NOT EXISTS ${tableName}_ad AFTER DELETE ON ${tableName} BEGIN
        INSERT INTO ${ftsName}(${ftsName}, rowid, content) VALUES ('delete', old.id, old.content);
      END;

      CREATE TRIGGER IF NOT EXISTS ${tableName}_au AFTER UPDATE ON ${tableName} BEGIN
        INSERT INTO ${ftsName}(${ftsName}, rowid, content) VALUES ('delete', old.id, old.content);
        INSERT INTO ${ftsName}(rowid, content) VALUES (new.id, new.content);
      END;
    `);

    this.tables.add(userId);
  }

  /** Sanitize a user_id for safe use as a SQL identifier. */
  private sanitizeTableName(userId: string): string {
    return userId.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 64);
  }

  /** Get the base table name for a user. */
  private tableName(userId: string): string {
    return `mem_${this.sanitizeTableName(userId)}`;
  }

  /** Save a memory entry for a user. Returns the entry. */
  save(userId: string, content: string): MemoryEntry {
    this.ensureTable(userId);
    const table = this.tableName(userId);
    const stmt = this.db.prepare(
      `INSERT INTO ${table} (user_id, content, created_at) VALUES (?, ?, datetime('now'))`
    );
    const result = stmt.run(userId, content);
    return {
      id: result.lastInsertRowid as number,
      user_id: userId,
      content,
      created_at: new Date().toISOString(),
    };
  }

  /** Search memories using FTS5 full-text search. Returns ranked results. */
  search(userId: string, query: string, limit = 10): MemorySearchResult[] {
    this.ensureTable(userId);
    const fts = `mem_${this.sanitizeTableName(userId)}_fts`;
    const table = this.tableName(userId);

    try {
      const stmt = this.db.prepare(`
        SELECT m.id, m.user_id, m.content, m.created_at, rank
        FROM ${fts} f
        JOIN ${table} m ON f.rowid = m.id
        WHERE ${fts} MATCH ?
        ORDER BY rank
        LIMIT ?
      `);
      return stmt.all(query, limit) as MemorySearchResult[];
    } catch {
      // If FTS query fails (bad syntax, etc.), fall back to LIKE search
      const stmt = this.db.prepare(`
        SELECT id, user_id, content, created_at, 0 as rank
        FROM ${table}
        WHERE content LIKE ?
        ORDER BY created_at DESC
        LIMIT ?
      `);
      return stmt.all(`%${query}%`, limit) as MemorySearchResult[];
    }
  }

  /** List recent memories for a user. */
  list(userId: string, limit = 20): MemoryEntry[] {
    this.ensureTable(userId);
    const table = this.tableName(userId);
    const stmt = this.db.prepare(
      `SELECT id, user_id, content, created_at FROM ${table} ORDER BY created_at DESC LIMIT ?`
    );
    return stmt.all(limit) as MemoryEntry[];
  }

  /** Delete a memory entry by ID. */
  delete(userId: string, id: number): boolean {
    this.ensureTable(userId);
    const table = this.tableName(userId);
    const stmt = this.db.prepare(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`);
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  /** Close the database connection. */
  close(): void {
    this.db.close();
  }
}
