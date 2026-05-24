# bapX Skills System — Design

## Architecture

```
User → bapX Chat (OpenAI Agents SDK) → Sandbox (Codex)
                                            ↓
                                     Skills installed here
                                     (.curated + .system from openai/skills)
```

- **OpenAI Agents SDK** (in FastAPI backend) orchestrates user requests
- **Codex** (bapXcodex) runs inside the user's sandbox container
- **Skills** are SKILL.md folders installed in the sandbox's `CODEX_HOME/skills/` directory
- Codex auto-discovers skills installed there

## Source: OpenAI Skills Catalog

Full catalog: https://github.com/openai/skills.git
Local clone: /tmp/openai-skills/

Two categories:
- **`.curated/`** (39 skills) — Deploy, Figma, Security, Notion, Dev tools, etc.  
- **`.system/`** (5 skills) — skill-creator, skill-installer, imagegen, openai-docs, plugin-creator

Each skill folder:
```
name/
├── SKILL.md       # Frontmatter: name, description | Body: when-to-use, workflow
├── agents/openai.yaml  # Display name, icon, default prompt
├── scripts/       # Helper scripts
├── references/    # Domain docs
└── assets/        # Icons
```

## How it works in bapX

### 1. Skills page in Settings (already exists in dashboard)
The dashboard already has:
- Skills tab with search bar
- Skill cards (name, description, category, toggle)
- Enable/disable with save button
- Skills count

### 2. What needs to change in backend.py
- `/api/user/skills` — instead of loading from local filesystem, fetch from the openai/skills catalog
- `/api/skills/install` — new endpoint: install a curated skill into user's sandbox
- `/api/skills/remove` — new endpoint: remove a skill from sandbox
- `/api/skills/custom` — new endpoint: save/create custom SKILL.md in sandbox

### 3. What needs to change in dashboard.html
- Skills page already has correct UI — search, toggle, save
- Add "Install from Catalog" section showing curated skills
- Add "Create Custom Skill" form
- Add "Sandbox Skills" tab showing what's actually installed in sandbox

### 4. Sandbox skill installation flow
```
User clicks "Install" on a curated skill
  → bapX copies /tmp/openai-skills/skills/.curated/{name}/ → sandbox: $CODEX_HOME/skills/{name}/
  → Codex discovers it automatically on next run
```

### 5. Custom skill creation flow
```
User fills form: name, description, instructions
  → bapX generates SKILL.md from template
  → saves to sandbox: $CODEX_HOME/skills/{name}/SKILL.md
  → Codex discovers it automatically
```

## What to build (phase 1)

1. **Backend**: Update `/api/user/skills` to return the openai/skills catalog as available skills
2. **Backend**: Add `/api/skills/install` to copy skill from catalog into sandbox via sandbox exec
3. **Dashboard**: Refresh Skills page to show "From Catalog" skills + "Installed in Sandbox" skills
4. **Dashboard**: Add "Create Custom Skill" button with modal form

## Implementation approach

- SKILL.md format = pure markdown with YAML frontmatter (name, description)
- Sandbox install = exec `mkdir -p $CODEX_HOME/skills/{name}/` then write files
- Custom skills = generate SKILL.md + optional scripts/references
- No changes to OpenAI Agents SDK code — it just delegates to Codex in sandbox

## Phase 2 (future)
- Plugin system using Codex plugin creator format
- MCP server management from skills page
- Skill sharing between sandboxes
