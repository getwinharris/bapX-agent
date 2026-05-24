import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_SKILLS_DIR = path.join(process.env.HOME || '/root', '.bapx', 'skills');

export interface SkillMeta {
  name: string;
  description?: string;
  category?: string;
  version?: string;
  author?: string;
  [key: string]: unknown;
}

export interface Skill {
  meta: SkillMeta;
  content: string;
  filePath: string;
}

/**
 * Skills system — loads skills from `~/.bapx/skills/` directory.
 * Each skill is a markdown file with YAML frontmatter.
 * Skills are injected into the system prompt to provide capabilities.
 */
export class SkillsSystem {
  private skillsDir: string;
  private cache = new Map<string, Skill>();

  constructor(skillsDir?: string) {
    this.skillsDir = skillsDir || DEFAULT_SKILLS_DIR;
    fs.mkdirSync(this.skillsDir, { recursive: true });
  }

  /** Parse YAML frontmatter from a markdown file. */
  private parseFrontmatter(content: string): { meta: SkillMeta; body: string } {
    const meta: SkillMeta = { name: 'unknown' };
    let body = content;

    if (content.startsWith('---')) {
      const endIdx = content.indexOf('---', 3);
      if (endIdx !== -1) {
        const yamlBlock = content.substring(3, endIdx).trim();
        body = content.substring(endIdx + 3).trim();

        // Simple YAML parser for frontmatter (no external deps needed)
        for (const line of yamlBlock.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const colonIdx = trimmed.indexOf(':');
          if (colonIdx === -1) continue;
          const key = trimmed.substring(0, colonIdx).trim();
          let value: unknown = trimmed.substring(colonIdx + 1).trim();

          // Remove quotes
          if (typeof value === 'string') {
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
          }

          meta[key] = value;
        }
      }
    }

    return { meta, body };
  }

  /** Load a specific skill by name. Caches results. */
  load(name: string): Skill | null {
    // Check cache first
    const cached = this.cache.get(name);
    if (cached) return cached;

    // Try exact filename first
    const exactPath = path.join(this.skillsDir, name);
    if (fs.existsSync(exactPath) && fs.statSync(exactPath).isFile()) {
      return this.loadFromFile(exactPath);
    }

    // Try with .md extension
    const mdPath = path.join(this.skillsDir, `${name}.md`);
    if (fs.existsSync(mdPath) && fs.statSync(mdPath).isFile()) {
      return this.loadFromFile(mdPath);
    }

    // Search for the skill by name (without extension)
    try {
      const files = fs.readdirSync(this.skillsDir);
      const match = files.find(f => {
        const basename = path.basename(f, path.extname(f));
        return basename.toLowerCase() === name.toLowerCase();
      });
      if (match) {
        return this.loadFromFile(path.join(this.skillsDir, match));
      }
    } catch {
      // Directory might not exist
    }

    return null;
  }

  /** Load a skill from a specific file path. */
  private loadFromFile(filePath: string): Skill {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { meta, body } = this.parseFrontmatter(content);
    const name = meta.name as string || path.basename(filePath, '.md');
    meta.name = name;

    const skill: Skill = { meta, content: body, filePath };
    this.cache.set(name, skill);
    return skill;
  }

  /** List available skills, optionally filtered by category. */
  list(category?: string): SkillMeta[] {
    const results: SkillMeta[] = [];

    try {
      if (!fs.existsSync(this.skillsDir)) {
        return results;
      }

      const files = fs.readdirSync(this.skillsDir);
      for (const file of files) {
        const filePath = path.join(this.skillsDir, file);
        if (!fs.statSync(filePath).isFile()) continue;
        if (!file.endsWith('.md')) continue;

        try {
          const skill = this.loadFromFile(filePath);
          if (!category || skill.meta.category === category) {
            results.push(skill.meta);
          }
        } catch {
          // Skip files that can't be parsed as skills
        }
      }
    } catch {
      // Directory issues
    }

    return results;
  }

  /** Invalidate the cache for a specific skill or all skills. */
  invalidateCache(name?: string): void {
    if (name) {
      this.cache.delete(name);
    } else {
      this.cache.clear();
    }
  }

  /** Get skill directory path. */
  getSkillsDir(): string {
    return this.skillsDir;
  }
}
