# bapX Platform — Unified Knowledge Graph

> Combined from all extracted documentation

---

## Architecture Overview

### Stack
```
Frontend: React + Vite + Tailwind (3-column Manus-style)
Backend: Fastify (:3001)
Sandbox: OpenSandbox (per-user Docker containers)
Agent: OpenAI Agents SDK (Python inside sandbox)
Auth: JWT + API keys + OAuth (Nous/Codex/xAI)

Data flow:
User → Frontend SSE → Fastify API → OpenSandbox → Agent (openai-agents) → Tools → Response
```

## Key Sections

### Hermes Agent

## Developer Guide
## How discovery works
## Directory structure
## The WebSearchProvider ABC
## The mental model
## Choose the implementation path first
## File checklist
## Boot flow
## Major components
## Session lifecycle
## Extension points
## Quick start: a wrapper CLI
## Hook reference
## Architecture Overview
## Plugin Path (Recommended)
## Pluggable Context Engine
## Dual Compression System
## Overview
## Step 1: Create the Built-in Tool File
## Cached system prompt layers
## Persistent Memory
## User Profile
## Skills (mandatory)
## System Overview
## Directory Structure
## How discovery works
## Directory structure
## Minimal example — a simple API-key provider
## The smallest possible call
## A more complete chat example
## Structured output
## What this lane gives you
## How discovery works
## Directory structure
## The ImageGenProvider ABC
## Key Files
## Architecture Overview
## Message Flow
## Contribution Priorities
## Common contribution paths
## Development Setup
## Code Style
## Key Files
## Scheduling Model
## Job Storage
## Scheduler Runtime
## Architecture Overview
## SQLite Schema
## Core Responsibilities
## Two Entry Points
## API Modes
## Turn Lifecycle
## Problem
## Backend capability matrix (verified live 2026-04-23)
## Architecture
## How it works
## Directory structure
## The ContextEngine ABC
## Resolution precedence
## Providers
## Tool registration model
## Directory Structure
## The MemoryProvider ABC
## Required Methods
## Should it be a Skill or a Tool?
## Skill Directory Structure
## SKILL.md Format
## When to Use
## Quick Reference
## The unified surface (one tool, two modalities)
## How discovery works
## Directory structure
## The VideoGenProvider ABC
## File Naming Convention
## JSONL Entry Format
## Conversations Array (ShareGPT Format)
## ACP (Agent Client Protocol)
## TUI Gateway JSON-RPC
## Getting Started
## How to Use This Page
## By Experience Level
## By Use Case
## Prerequisites
## Quick Start (Any Nix User)
## NixOS Module
## Updating
## What is supported in the tested path?
## What is not part of the tested path yet?
## Option 1: One-line installer
## Option 2: Manual install (fully explicit)
## Prefer to watch?
## Who this is for
## The fastest path
## 1. Install Hermes Agent
## Quick Install
## Guides
## Prerequisites
## Step 1 — Enable the webhook platform
## Choosing a model
## Option A: llama.cpp
## TL;DR
## Browser-only remote (Cloud Shell / Codespaces / EC2 Instance Connect)
## Which Providers Need This
## What We're Building
## Prerequisites
## Step 1: Create a Telegram Bot
## What voice mode is good for
## Choose your voice mode setup
## Step 1: make sure normal Hermes works first
## Step 2: install the right extras
## Step 3: install system dependencies
## Step 4: choose STT and TTS providers
## Getting the Best Results
## CLI Power User Tips
## Prerequisites
## Quick Start
## Configuration
## Available Models
## When should you use MCP?
## Mental model
## Step 1: install MCP support
## Step 2: add one server first
## Step 3: verify MCP loaded
## Step 4: start filtering immediately
## The Problem
## What This Guide Solves
## What You Need
## Step 1: Install Ollama
## Step 2: Pull a Model
## What SOUL.md is for
## What SOUL.md is not for
## Where it lives
## First-run behavior
## How Hermes uses it
## A good first edit
## Example styles
## Style
## Quick start
## Options
## What gets migrated
## Prerequisites
## Quick Start
## Configuration
## Pattern 1: Website Change Monitor
## Prerequisites
## Quick Start
## Microsoft Entra ID (keyless, RBAC) — recommended
## Development Workflow
## When to Use It
## Create One from Chat
## Jobs Not Firing
## Delivery Failures
## Quick Start
## Argument Reference
## What We're Building
## Prerequisites
## Step 1: Test the Workflow Manually
## Overview
## Prerequisites
## Quick Start
## L
## When to Delegate
## Pattern: Parallel Research
## Pattern: Code Review
## Prerequisites
## Step 1: Create the App Registration
## Step 2: Create a Client Secret
## Step 3: Grant Graph API Permissions
## Prerequisites
## Step 1: Verify the Setup
## Step 2: Try a Manual Review
## Installation
## Basic Usage
## Full Conversation Control
## Configuring Tools
## Core Operator Commands
## Overview
## Prerequisites
## Quick Start
## Logging In Manually
## The OAuth Flow
## Finding Skills
## Using a Skill
## Installing from the Hub
## Integrations
## AI Providers & Routing
## Tool Servers (MCP)
## Web Search Backends
## Browser Automation
## Voice & TTS Providers
## Inference Providers
## Reference
## Live manifest URL
## Schema
## Fetch behavior
## Config
## Permissions and admin/user split
## Interactive CLI slash commands
## Root config shape
## Server keys
## `tools` policy keys
## Filtering semantics
## Utility-tool policy
## LLM Providers
## How Toolsets Work
## Configuring Toolsets
## Core Toolsets
## autonomous-ai-agents
## blockchain
## communication
## creative
## `browser` toolset
## Frequently Asked Questions
## `hermes profile`
## `hermes profile list`
## `hermes profile use`
## `hermes profile create`
## apple
## autonomous-ai-agents
## creative
## Global entrypoint
## Top-level commands
## Root
## Development Environment
## Project Structure
## Install
## What is Hermes Agent?
## Quick Links
## User Guide
## What this means
## Why git?
## When should you use a distribution?
## Why WSL2 (vs. native Windows)
## Install WSL2
## What Triggers a Checkpoint
## Quick Reference
## How Checkpoints Work
## Overview
## Dangerous Command Approval
## Why Use Worktrees with Hermes?
## Quick Start: Creating a Worktree
## Running Multiple Agents in Parallel
## Cleaning Up Worktrees Safely
## Launch
## Why the TUI
## What are profiles?
## Quick start
## Creating a profile
## Using profiles
## Quick install
## Directory Structure
## Managing Configuration
## Configuration Precedence
## Environment Variable Substitution
## The Models page
## Setting the main model
## Setting auxiliary models
## How Sessions Work
## Running the CLI
## Interface Layout
## Quick start
## Running in gateway mode
## Running the dashboard
## How Hermes Behaves
## Prerequisites
## Setup
## Features
## Configuration Options
## Prerequisites
## Step 1: Link Your Signal Account
## Step 2: Start the signal-cli Daemon
## Step 3: Configure Hermes
## Two Modes
## Prerequisites
## Step 1: Run the Setup Wizard
## Step 2: Getting a Second Phone Number (Bot Mode)
## How Hermes Behaves
## Prerequisites
## Step 1: Create a DingTalk App
## Step 2: Enable the Robot Capability
## How Hermes Behaves
## Step 1: Enable Bot Accounts
## What This Feature Does
## Prerequisites
## Step 1: Add Microsoft Graph Credentials
## Step 2: Enable the Graph Webhook Listener
## Architecture
## Quick Setup
## Prerequisites
## Step 1: Configure Hermes
## Step 2: Start the Gateway
## How It Works
## Prerequisites
## Install simplex-chat
## Start the daemon
## Configure Hermes
## Find your contact ID
## Authorization
## Using SimpleX with cron jobs
## Privacy notes
## Troubleshooting
## Prerequisites
## Setup
## Features
## Video Tutorial
## Quick Start
## Setup
## Configuring Routes {#configuring-routes}
## Prerequisites
## Quick Start
## Configuration
## Prerequisites
## Setup
## How It Works
## Environment Variables
## How Hermes Behaves
## Step 1: Create a Feishu / Lark App
## Step 2: Choose a Connection Mode
## Overview
## Step 1: Create or pick a GCP project
## Step 2: Enable two APIs
## Step 3: Create a Service Account
## Step 4: Create the Pub/Sub topic and subscription
## Overview
## Step 1: Create a Slack App
## Step 2: Configure Bot Token Scopes
## How the bot responds
## Step 1: Create a LINE Messaging API channel
## Step 2: Expose the webhook port
## Step 3: Configure Hermes
## How It Works
## Prerequisites
## Setup
## Configuration Reference
## Setup
## Available Tools
## How Hermes Behaves
## Prerequisites
## Setup
## Overview
## Prerequisites
## Configuration
## Environment Variables
## Advanced Configuration
## Voice Messages (STT)
## How the Bot Responds
## Step 1: Install the Teams CLI
## Step 2: Expose the Webhook Port
## Step 3: Create the Bot
## Step 4: Configure Environment Variables
## Step 5: Start the Gateway
## Platform Comparison
## Architecture
## Prerequisites
## Step 1: Get Your Twilio Credentials
## Step 2: Configure Hermes
## Step 3: Configure Twilio Webhook
## Step 4: Start the Gateway
## Step 1: Create a Bot via BotFather
## Step 2: Customize Your Bot (Optional)
## Step 3: Privacy Mode (Critical for Groups)
## What is G0DM0D3?
## Three Attack Modes
## Setup
## Gmail
## Skill metadata
## Reference: full SKILL.md
## Requirements
## When to Use
## Setup
## Available Tools (via MCP)
## Procedure
## Skill metadata
## Reference: full SKILL.md
## When to use this skill
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Prerequisites
## Size Warning
## Steps
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Prerequisites
## Install (One-Time)
## Skill metadata
## Reference: full SKILL.md
## Configuration
## Detection Flow
## Method 1: CLI via curl (Preferred)
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Prerequisites
## Skill metadata
## Reference: full SKILL.md
## Detection Flow
## Installation
## Method 1: CLI Search (Preferred)
## Skill metadata
## Reference: full SKILL.md
## When to use it
## Installation
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Installation
## Quick Reference
## CLI Usage
## Skill metadata
## Reference: full SKILL.md
## Sources
## How to fetch and use a skill
## Skill Index by Domain
## Skill metadata
## Reference: full SKILL.md
## Helper script
## Available commands
## When to use this vs built-in tools
## Skill metadata
## Reference: full SKILL.md
## Core Workflows
## Skill metadata
## Reference: full SKILL.md
## When to use this skill
## When NOT to use this skill
## Skill metadata
## Reference: full SKILL.md
## When to use Modal
## Quick start
## Skill metadata
## Reference: full SKILL.md
## When to use NeMo Curator
## Quick start
## Skill metadata
## Reference: full SKILL.md
## When to Use This Skill
## Installation
## Quick Start
## Skill metadata
## Reference: full SKILL.md
## Quick start
## Common workflows
## Skill metadata
## Reference: full SKILL.md
## When to use Stable Diffusion
## Quick start
## Skill metadata
## Reference: full SKILL.md
## When to use CLIP
## Quick start
## Available models
## Skill metadata
## Reference: full SKILL.md
## When to use Chroma
## Quick start
## Core operations
## Skill metadata
## Reference: full SKILL.md
## When to Use This Skill
## Quick Reference
## Skill metadata
## Reference: full SKILL.md
## The Problem: Polysemanticity & Superposition
## When to Use SAELens
## Installation
## Skill metadata
## Reference: full SKILL.md
## When to Use slime
## Key Features
## Architecture Overview
## Skill metadata
## Reference: full SKILL.md
## When to Use This Skill
## Installation
## Quick Start
## Core Concepts
## Skill metadata
## Reference: full SKILL.md
## When to use FAISS
## Quick start
## Index types
## Skill metadata
## Reference: full SKILL.md
## When to use Pinecone
## Quick start
## Core operations
## Skill metadata
## Reference: full SKILL.md
## When to use LLaVA
## Quick start
## Skill metadata
## Reference: full SKILL.md
## Quick start
## Common workflows
## Skill metadata
## Reference: full SKILL.md
## Quick start
## Common workflows
## Skill metadata
## Reference: full SKILL.md
## When to use PEFT
## Quick start
## Skill metadata
## Reference: full SKILL.md
## Quick start
## Common workflows
## Skill metadata
## Reference: full SKILL.md
## When to Use This Skill
## Quick Reference
## Reference Files
## Working with This Skill
## Resources
## Notes
## Updating
## Skill metadata
## Reference: full SKILL.md
## What's inside
## When to Use This Skill
## Quick Reference
## Skill metadata
## Reference: full SKILL.md
## When to Use This Skill
## Installation
## Quick Start
## Core Concepts
## Skill metadata
## Reference: full SKILL.md
## When to use HuggingFace Tokenizers
## Quick start
## Skill metadata
## Reference: full SKILL.md
## Quick start
## Common workflows
## Skill metadata
## Reference: full SKILL.md
## When to use Lambda Labs
## Quick start
## GPU instances
## Skill metadata
## Reference: full SKILL.md
## When to use TensorRT-LLM
## Quick start
## Skill metadata
## Reference: full SKILL.md
## When to use Whisper
## Quick start
## Model sizes
## Skill metadata
## Reference: full SKILL.md
## When to use Qdrant
## Quick start
## Skill metadata
## Reference: full SKILL.md
## Quick start
## Common workflows
## Skill metadata
## Reference: full SKILL.md
## Prerequisites
## Quick Start
## Discovering MCP Servers
## Calling Tools
## Auth and Config
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Prerequisites
## Included Files
## Workflow
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Quick Reference
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Available Templates
## Procedure
## Skill metadata
## Reference: full SKILL.md
## Setup (one-time)
## Protocol
## Available Commands
## Python Helper
## Skill metadata
## Reference: full SKILL.md
## Scope
## Skill metadata
## Skill metadata
## Reference: full SKILL.md
## Output contract
## Setup
## Core conventions (non-negotiable)
## Skill metadata
## Reference: full SKILL.md
## Environment
## TEMPLATE REQUIREMENT
## CRITICAL INSTRUCTIONS — READ FIRST
## Skill metadata
## Reference: full SKILL.md
## Environment
## ⚠️ CRITICAL PRINCIPLES — Read Before Populating Any Template
## Skill metadata
## Reference: full SKILL.md
## Output contract
## Setup
## Core conventions
## Skill metadata
## Reference: full SKILL.md
## Environment
## Overview
## Tools
## Critical Constraints - Read These First
## Skill metadata
## Reference: full SKILL.md
## Environment
## Workflow
## Skill metadata
## Reference: full SKILL.md
## Environment
## ⚠️ CRITICAL: Data Source Priority (READ FIRST)
## Overview
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Prerequisites
## How to Run
## Quick Reference
## Commands
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Procedure
## Skill metadata
## Reference: full SKILL.md
## Prerequisites
## API Basics
## Skill metadata
## Reference: full SKILL.md
## Product Search (no auth)
## Skill metadata
## Reference: full SKILL.md
## Overview
## When to Use
## Quick Reference
## Skill metadata
## Reference: full SKILL.md
## Current docs
## Requirements
## Create a site
## Skill metadata
## Reference: full SKILL.md
## Scripts
## Setup
## Usage
## Output Format
## API Reference (curl)
## Skill metadata
## Reference: full SKILL.md
## What this solves
## Safety rules — mandatory
## Skill metadata
## Reference: full SKILL.md
## Prerequisites
## API Basics
## Quick Reference
## Skill metadata
## Reference: full SKILL.md
## CLI Command
## What this skill does
## Skill metadata
## Reference: full SKILL.md
## Prerequisites
## CLI Reference: `npx neuroskill <command>`
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Procedure
## Skill metadata
## Reference: full SKILL.md
## Requirements
## When to Use
## Authentication Methods
## Setup
## Hermes Execution Pattern (desktop app flow)
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Requirements
## Procedure
## Skill metadata
## Reference: full SKILL.md
## ⚠️ Anti-Hallucination Guardrails
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Setup
## Architecture
## Skill metadata
## Reference: full SKILL.md
## Prerequisites
## One-Shot Tasks
## Background Mode (Long Tasks)
## Skill metadata
## Reference: full SKILL.md
## Why This Works
## How to Use
## Step 1: Define the Persona
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Prerequisites
## Workflow
## Common Commands
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Prerequisites
## Quick Reference
## Procedure
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Mental model
## Ready-made scripts
## Usage
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Prerequisites
## Quick Reference
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Prerequisites
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Prerequisites
## How to Run
## Quick Reference
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Prerequisites
## Quick Reference
## Procedure
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Core Principle
## 5-Minute Quickstart
## Skill metadata
## Reference: full SKILL.md
## References
## Prerequisites
## Configuration Setup
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Key Concepts
## Three Public APIs
## Typical Workflow
## Presenting Results
## Parsing Double-Encoded Fields
## Skill metadata
## Reference: full SKILL.md
## When This Skill Activates
## Wiki Location
## Architecture: Three Layers
## Skill metadata
## Reference: full SKILL.md
## Quick Reference
## Searching Papers
## Search Query Syntax
## Skill metadata
## Reference: full SKILL.md
## Installation
## Common Commands
## Skill metadata
## Reference: full SKILL.md
## Skill metadata
## Reference: full SKILL.md
## When to Use This vs Other Tools
## Prerequisites
## Setup
## Core Workflow
## Skill metadata
## Reference: full SKILL.md
## When to use
## Model Discovery workflow
## Skill metadata
## Reference: full SKILL.md
## When to use AudioCraft
## Quick start
## Skill metadata
## Reference: full SKILL.md
## When to Use This Skill
## Installation
## Quick Start
## Skill metadata
## Reference: full SKILL.md
## When to Use This Skill
## Installation
## Quick Start
## Skill metadata
## Reference: full SKILL.md
## Quick Start
## Core Commands
## Specialized Hub Interactions
## Skill metadata
## Reference: full SKILL.md
## What's inside
## Quick start
## Common workflows
## Skill metadata
## Reference: full SKILL.md
## When to use SAM
## Quick start
## Skill metadata
## Reference: full SKILL.md
## What's inside
## Video Guide
## When to Use This Skill
## Step 1: Installation
## Skill metadata
## Reference: full SKILL.md
## When to use
## Quick start
## Common workflows
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Prerequisites
## Quick Start
## Configuration Reference
## Skill metadata
## Reference: full SKILL.md
## When To Use This Skill vs `popular-web-designs` vs `design-md`
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Workflow
## Skill metadata
## Reference: full SKILL.md
## When to use
## Workflow
## Element Format Reference
## Skill metadata
## Reference: full SKILL.md
## When to use
## Creative Standard
## Prerequisites
## Modes
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Three Dimensions
## Types
## Styles
## Output Structure
## Skill metadata
## Reference: full SKILL.md
## When to use
## How It Works
## The Rule
## Constraint Library
## Skill metadata
## Reference: full SKILL.md
## Tool 1: Text Banners (pyfiglet — local)
## Tool 2: Text Banners (asciified API — remote, no install)
## Skill metadata
## Reference: full SKILL.md
## Overview
## When to Use
## Skill metadata
## Reference: full SKILL.md
## When to use
## What's inside
## Creative Standard
## Skill metadata
## Reference: full SKILL.md
## When to use
## What's inside
## Creative Standard
## Skill metadata
## Reference: full SKILL.md
## Related design skills
## How to Use
## HTML Generation Pattern
## Skill metadata
## Reference: full SKILL.md
## 1. Song Structure (Pick One or Invent Your Own)
## 2. Rhyme, Meter, and Sound
## 3. Emotional Arc and Dynamics
## Skill metadata
## Reference: full SKILL.md
## When NOT to use this
## If the user has the full GSD system installed
## Core method
## Skill metadata
## Reference: full SKILL.md
## When to use this skill
## File anatomy
## Skill metadata
## Reference: full SKILL.md
## Scope
## Workflow
## Skill metadata
## Reference: full SKILL.md
## What's in this skill
## Skill metadata
## Reference: full SKILL.md
## When to use this skill
## How to use it in Hermes
## Your task
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Options
## Layout Gallery
## Style Gallery
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Reference Images
## Options
## Skill metadata
## Reference: full SKILL.md
## CRITICAL RULES
## Architecture
## Setup (Automated)
## Skill metadata
## Reference: full SKILL.md
## Secret Safety (MANDATORY)
## Installation
## Skill metadata
## Reference: full SKILL.md
## Vault path
## Read a note
## List notes
## Search
## Create a note
## Append to a note
## Skill metadata
## Reference: full SKILL.md
## Detection Flow
## Method 1: Git-Only Authentication (No gh, No sudo)
## Skill metadata
## Reference: full SKILL.md
## Prerequisites
## 1. Branch Creation
## 2. Making Commits
## Skill metadata
## Reference: full SKILL.md
## Prerequisites
## 1. Reviewing Local Changes (Pre-Push)
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Prerequisites
## 1. Basic Summary (Most Common)
## 2. Common Folder Exclusions
## 3. Filter by Specific Language
## 4. Detailed File-by-File Output
## 5. Output Formats
## Skill metadata
## Reference: full SKILL.md
## Prerequisites
## 1. Viewing Issues
## Skill metadata
## Reference: full SKILL.md
## Prerequisites
## 1. Cloning Repositories
## Skill metadata
## Reference: full SKILL.md
## When to use
## Quick Reference
## Reading Content
## Editing Workflow
## Creating from Scratch
## Design Ideas
## Skill metadata
## Reference: full SKILL.md
## Setup
## API Basics
## Python helper script (ergonomic alternative)
## Skill metadata
## Reference: full SKILL.md
## References
## Scripts
## First-Time Setup
## Skill metadata
## Reference: full SKILL.md
## Step 1: Remote URL Available?
## Step 2: Choose Local Extractor
## pymupdf (lightweight)
## Skill metadata
## Reference: full SKILL.md
## Prerequisites
## API Basics
## Field Types (request body shapes)
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Prerequisites
## Commands
## Skill metadata
## Reference: full SKILL.md
## Setup
## API Basics
## Path A — `ntn` CLI (preferred, macOS / Linux)
## Skill metadata
## Reference: full SKILL.md
## When to use this skill
## Prerequisites
## Command reference
## Skill metadata
## Reference: full SKILL.md
## Prerequisites
## Usage
## Examples
## Notes
## Skill metadata
## Reference: full SKILL.md
## When to use
## Gather User Preferences First
## Steps
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Startup Procedure
## Save and Load
## Skill metadata
## Reference: full SKILL.md
## When to Use This Skill
## Overview of Attack Modes
## Skill metadata
## Reference: full SKILL.md
## Prerequisites
## Quick Start
## Visualization Types
## Common Flags
## Notes
## Skill metadata
## Reference: full SKILL.md
## When to use
## Setup
## Helper Script
## Output Formats
## Workflow
## Skill metadata
## Reference: full SKILL.md
## Overview
## When to Use
## Hardware Requirements
## Installation Steps
## Skill metadata
## Reference: full SKILL.md
## When to use
## Setup
## Prerequisites
## Search for GIFs
## Download a GIF
## Get Full Metadata
## API Parameters
## Available Media Formats
## Skill metadata
## Reference: full SKILL.md
## When to use this skill
## The 7 tools
## Canonical patterns (minimize tool calls)
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Prerequisites
## Binary Resolution (Important)
## One-Shot Tasks
## Skill metadata
## Reference: full SKILL.md
## When to use
## Prerequisites
## One-Shot Tasks
## Background Mode (Long Tasks)
## Key Flags
## Skill metadata
## Reference: full SKILL.md
## Skill metadata
## Reference: full SKILL.md
## Prerequisites
## Two Orchestration Modes
## Skill metadata
## Reference: full SKILL.md
## Overview
## Prerequisites
## Inputs
## Workflow
## Skill metadata
## Reference: full SKILL.md
## CRITICAL: How Messaging Works
## Available Tools
## @Mention Workflow
## Send DM (Private Message) Workflow
## Skill metadata
## Reference: full SKILL.md
## Profiles are user-configured — not a fixed roster
## When to use the board (vs. just 
## Skill metadata
## Reference: full SKILL.md
## Setup (Required First)
## Commands
## Prompt Templates
## Skill metadata
## Reference: full SKILL.md
## Workspace handling
## Tenant isolation
## Good summary + metadata shapes
## Skill metadata
## Reference: full SKILL.md
## Prerequisites
## When to Use
## When NOT to Use
## Quick Reference
## Service Options
## Rules
## Example Workflow
## Skill metadata
## Reference: full SKILL.md
## Prerequisites
## When to Use
## Method 1: AppleScript + Screenshot (Basic)
## Method 2: Peekaboo UI Automation (Recommended)
## Skill metadata
## Reference: full SKILL.md
## Prerequisites
## When to Use
## When NOT to Use
## Quick Reference
## Limitations
## Rules
## Skill metadata
## Reference: full SKILL.md
## Prerequisites
## When to Use
## When NOT to Use
## Quick Reference
## Date Formats
## Rules
## Skill metadata
## Reference: full SKILL.md
## The canonical workflow
## Capture modes
## Actions
## Skill metadata
## Reference: full SKILL.md
## Prerequisites
## When to Use
## Common Commands
## Quick Presets
## Notes
## Skill metadata
## Reference: full SKILL.md
## Overview
## When to Use
## The Process
## Skill metadata
## Reference: full SKILL.md
## Overview
## When to Use
## Required Frontmatter
## Size Limits
## Skill metadata
## Reference: full SKILL.md
## Core behavior
## Output requirements
## Save location
## Interaction style
## Skill metadata
## Reference: full SKILL.md
## When to Use
## Step 1 — Get the diff
## Step 2 — Static security scan
## Skill metadata
## Reference: full SKILL.md
## Overview
## When to Use
## Bite-Sized Task Granularity
## Plan Docu
## Skill metadata
## Reference: full SKILL.md
## When NOT to use this
## If the user has the full GSD system installed
## Core method
## Skill metadata
## Reference: full SKILL.md
## Overview
## When to Use
## The Iron Law
## Red-Green-Refactor Cycle
## Skill metadata
## Reference: full SKILL.md
## Overview
## The Iron Law
## When to Use
## The Four Phases
## Phase 1: Root Cause Investigation
## Skill metadata
## Reference: full SKILL.md
## Overview
## When to Use
## Architecture Overview
## Investigation Steps
## Skill metadata
## Reference: full SKILL.md
## Overview
## When to Use
## Quick Reference: `node inspect` REPL
## Skill metadata
## Reference: full SKILL.md
## Overview
## When to Use
## pdb Quick Reference
## How it works
## Why machine accounts (and why no 2FA prompt)
## Setup
## Setup
## The board at a glance
## Overview
## Setup
## What cron can do now
## Creating scheduled tasks
## Skill-backed cron jobs
## Running a job inside a project directory
## Configuration
## Options
## Practical Examples
## Prerequisites
## Overview
## Requirements
## How It Works
## How Memory Appears in the System Prompt
## Memory Tool Actions
## When to use it
## Quick start
## Commands
## Adding criteria mid-goal: `/subgoal`
## Quick Start
## Available providers
## Check status
## Allowed paths
## How it works
## Enabling
## Keeping cua-driver up to date
## Quick example
## Supported Context Files
## AGENTS.md
## How discovery works
## Bundled plugins are opt-in
## Currently shipped
## Quick Start
## How It Works
## Available Providers
## Kanban vs. `delegate_task`
## How It Works
## Paste Methods
## Platform Compatibility
## What MCP gives you
## Quick start
## Two kinds of MCP servers
## Basic configuration reference
## Backends
## How `web_extract` handles long pages
## Change skins
## Built-in skins
## Complete list of configurable keys
## Using Skills
## Progressive Disclosure
## SKILL.md Format
## When to Use
## Single Task
## Parallel Batch
## How Subagent Context Works
## Practical Examples
## How SOUL.md works now
## Why this design
## Where to edit it
## What should go in SOUL.md?
## Good SOUL.md content
## Supported Models
## Setup
## Primary Model Fallback
## Quick overview
## What plugins can do
## Core
## Automation
## Media & Web
## Text-to-Speech
## Quick Start
## Endpoints
## Available Tools
## Using Toolsets
## When LSP runs
## Supported languages
## How It Works
## When the Agent Uses This
## Practical Examples
## How it runs
## Supported References
## Usage Examples
## CLI Tab Completion
## Line Ranges
## Size Limits
## Security
## Why
## What tools the model actually has
## Table of contents
## Gateway Event Hooks
## What's included
## Why it's here
## Get started
## Quick Start
## Prerequisites
## Pages
## The hierarchy
## What a lane provides
## How it works
## Supported file extensions
## Encouraging the agent to produce artifacts
## What Hermes exposes in ACP mode
## Installation
## Launching the ACP server
## Editor setup
## What Honcho Adds
## Setup
## Architecture
## How It Works
## Quick Start
## Interactive Management
## CLI Commands
## Overview
## Quick Start
## Dataset Format
## Configuration Options
## Prerequisites
## Setup
## Authentication
## Enabling the tool
## Configuration
## Tool parameters

---

### OpenAI Agents SDK

## Docs
## Raw response events
## Streaming and approvals
## Installation
## Generating a graph
## Understanding the visualization
## Customizing the graph
## Minor (`Y`) versions
## Patch (`Z`) versions
## Breaking change changelog
## Workflow boundaries
## Input guardrails
## API keys and clients
## Tracing
## What is tracked
## Accessing usage from a run
## Per-request usage tracking
## Accessing usage with sessions
## Creating a handoff
## Runner lifecycle and configuration
## Categories
## Prerequisites
## Installation
## Create a local sandbox agent
## Choosing an MCP integration
## Agent-level MCP configuration
## Local context
## Choose the right result surface
## Final output
## Input, next-turn history, and new items
## Traces and spans
## Default tracing
## Choosing a tool type
## Hosted tools
## Create a project and virtual environment
## Create your first agent
## Run your first agent
## Give your agent tools
## Marking tools that need approval
## How the approval flow works
## Why use the Agents SDK
## Agents SDK or Responses API?
## Choose the next guide
## Basic configuration
## Orchestrating via LLM
## 原始响应事件
## 流式传输与审批
## 当前轮次后的流式传输取消
## 安装
## 图形生成
## 可视化理解
## 图形自定义
## 次版本（`Y`）
## 补丁版本（`Z`）
## 破坏性变更日志
## 工作流边界
## 输入安全防护措施
## 输出安全防护措施
## 工具安全防护措施
## 触发线
## 安全防护措施实现
## API 密钥和客户端
## 追踪
## 跟踪内容
## 运行中的用量访问
## 按请求的用量跟踪
## 会话中的用量访问
## 钩子中的用量使用
## API 参考
## 任务转移的创建
## 任务转移输入
## Runner 生命周期与配置
## 目录
## 前提条件
## 安装
## 本地沙盒智能体的创建
## 关键选择
## MCP集成选择
## 智能体级MCP配置
## 跨传输方式的通用模式
## 1. 托管MCP服务工具
## 本地上下文
## 合适的结果接口
## 最终输出
## 输入、下一轮历史记录和新条目
## 追踪和Span
## 默认追踪
## 长时间运行的工作进程与即时导出
## 更高层级的追踪
## 工具类型选择
## 托管工具
## 快速开始
## 工作原理
## 内存操作
## 内存选项
## 项目与虚拟环境的创建
## 首个智能体的创建
## 首个智能体的运行
## 智能体工具的提供
## 更多智能体的添加
## 需要审批的工具标记
## 审批流程机制
## 自定义拒绝消息
## 使用 Agents SDK 的理由
## Agents SDK 与 Responses API 的选择
## 安装
## Hello world 示例
## 入门起点
## 路径选择
## 下一篇指南
## 基本配置
## Prompt模板
## 通过 LLM 编排
## 通过代码编排
## 相关指南
## Decision guide
## Server-side WebSocket is the default Python path
## SIP attach is the telephony path
## Browser WebRTC is outside this SDK
## Overview
## Session lifecycle
## Agent and session configuration
## Prerequisites
## Installation
## Create a server-side realtime session
## What t
## 원문 응답 이벤트
## 스트리밍 및 승인
## 현재 턴 이후 스트리밍 취소
## 설치
## 그래프 생성
## 시각화 이해
## 그래프 사용자 지정
## 마이너 (`Y`) 버전
## 패치 (`Z`) 버전
## 호환성을 깨는 변경 사항 변경 로그
## 워크플로 경계
## 입력 가드레일
## 출력 가드레일
## 도구 가드레일
## API 키 및 클라이언트
## 트레이싱
## 추적 항목
## 실행에서 사용량 접근
## 요청별 사용량 추적
## 세션에서 사용량 접근
## 훅에서 사용량 사용
## API 참조
## 핸드오프 생성
## 핸드오프 입력
## Runner 수명 주기와 구성
## 카테고리
## 사전 요구 사항
## 설치
## 로컬 샌드박스 에이전트 생성
## MCP 통합 선택
## 에이전트 수준 MCP 구성
## 전송 방식 전반의 공통 패턴
## 로컬 컨텍스트
## 적절한 결과 접근 지점 선택
## 최종 출력
## 입력, 다음 턴 기록 및 새 항목
## 트레이스와 스팬
## 기본 트레이싱
## 장기 실행 워커와 즉시 내보내기
## 도구 유형 선택
## 호스티드 툴
## 빠른 시작
## 동작 방식
## 메모리 작업
## 메모리 옵션
## 프로젝트 및 가상 환경 생성
## 첫 에이전트 생성
## 첫 에이전트 실행
## 에이전트에 도구 제공
## 에이전트 몇 개 더 추가
## 승인이 필요한 도구 표시
## 승인 흐름의 작동 방식
## Agents SDK를 사용하는 이유
## Agents SDK 또는 Responses API
## 설치
## Hello world 예제
## 시작 지점
## 경로 선택
## 다음 가이드 선택
## 기본 설정
## LLM을 통한 오케스트레이션
## 코드를 통한 오케스트레이션
## 관련 가이드
## raw レスポンスイベント
## ストリーミングと承認
## 現在のターン後のストリーミングのキャンセル
## インストール
## グラフの生成
## 可視化の理解
## グラフのカスタマイズ
## マイナー (`Y`) バージョン
## パッチ (`Z`) バージョン
## 破壊的変更の変更履歴
## ワークフローの境界
## 入力ガードレール
## 出力ガードレール
## ツールガードレール
## API キーとクライアント
## トレーシング
## 追跡対象
## 実行からの使用量へのアクセス
## リクエストごとの使用量追跡
## セッションでの使用量へのアクセス
## フックでの使用量の利用
## API リファレンス
## ハンドオフの作成
## ハンドオフ入力
## Runner のライフサイクルと設定
## カテゴリー
## 前提条件
## インストール
## ローカルサンドボックスエージェントの作成
## MCP 統合の選択
## エージェントレベルの MCP 設定
## トランスポート間で共通するパターン
## ローカルコンテキスト
## 適切な実行結果サーフェスの選択
## 最終出力
## 入力、次ターン履歴、新規項目
## トレースとスパン
## デフォルトのトレーシング
## 長時間実行ワーカーと即時エクスポート
## ツールタイプの選択
## ホスト型ツール
## クイックスタート
## 仕組み
## メモリ操作
## メモリオプション
## プロジェクトと仮想環境の作成
## 最初のエージェントの作成
## 最初のエージェントの実行
## エージェントへのツールの付与
## さらにいくつかのエージェントの追加
## 承認が必要なツールのマーク付け
## 承認フローの仕組み
## Agents SDK の利用理由
## Agents SDK と Responses API の選択
## インストール
## Hello world の例
## 開始ポイント
## 次のガイドの選択
## 基本設定
## LLM によるオーケストレーション
## コードによるオーケストレーション
## 関連ガイド
## Features
## Quick start
## Initialization
## Usage tracking
## Features
## Installation
## Quick start
## Configuration
## Usage with different session types
## Quick start
## Resuming interrupted runs with the same session
## Core session behavior
## Control how history and new input merge
## Installation
## Quick start
## API reference
## Enable memory
## Decision guide
## Local clients
## Mounts and remote storage
## Configuring a pipeline
## Running a pipeline
## Results
## Prerequisites
## Concepts
## Agents
## Voice pipeline
## Run the pipeline
## Root
## Get started
## When to Use an ExecPlan
## How to Use This File
## Non-Negotiable Requirements
## Formatting Rules
## Guidelines
## Milestones
## Living Sections (must be present and maintained)
## Table of Contents
## Policies & Mandatory Rules

---

### OpenSandbox

## Components
## Table of Contents
## Overview
## Core Features
## Architecture
## Table of Contents
## Getting Started
## Project Structure
## Coding Standar
## Docs
## Architecture Overview
## 1. OpenSandbox SDKs
## Single-host routing model
## Network modes
## Examples
## Integrations / Sandboxes
## How to Run
## Kubernetes
## 关键特性
## 功能特性
## 入门指南
## Key Features
## Features
## Getting Star
## Oseps
## Summary
## Motivation
## Getting started
## Template
## Status lifecycle
## Root
## Table of Contents
## Code of Conduct
## Getting Started
## Development Environment Setup
## Expected Behavior
## Unacceptable Behavior
## Scope
## Reporting
## Enforcement
## 📥 Download Now!
## 🚀 Getting Started
## 📋 System Requirements
## 🌐 Features
## 🔗 Download & Install
## 🐛 Troubleshooting
## 🌟 Additional Resources
## 💬 Support
## Project Structure & Module Organization
## Build, Test, and Development Commands
## Coding Style & Naming Conventions
## Testing Guidelines
## Commit & Pull Request Guidelines
## Security & Configuration Tips
## Sdks
## Prerequisites
## Installation
## Quick Start
## Installation
## Quick Start
## Usage Examples
## Server
## Features
## Requirements
## Quick Start
## 📋 Table of Contents
## Development Environment Setup
## Project Structure
## Specs
## Specification Files

---

### Manus.im

## 1. CORE ARCHITECTURE
## 2. SIGNUP & ONBOARDING FLOW
## About [User Name]
## Operating Context
## 3. LEFT SIDEBAR — DETAILED
## 4. CENTER PANEL — CHAT INTERFACE
## 5. RIGHT PANEL — CONTEXT-DEPENDENT
## 6. WORKFLOWS
## 7. MCP SYSTEM
## 8. SKILL SYSTEM
## 9. AUTOMATION / SCHEDULED TASKS
## 10. COLLABORATION
## 11. DESKTOP / LOCAL MODE
## 12. RIGHT PANEL TAB REFERENCE
## 13. ENVIRONMENT CONFIGURATION
## 14. COMPLETE FEATURE LIST (from Manus docs)
## 15. DEPLOYMENT ARCHITECTURE
## 16. DATABASE SCHEMA
## 17. MEMORY
## 18. KEY DESIGN PRINCIPLES

---

## Implementation Blueprint

### Phase 1: Foundation
1. Extract docs → KGs (Hermes, OpenAI SDK, OpenSandbox, Manus)
2. Build auth: signup/login/JWT + all auth methods (API keys, OAuth Nous/Codex/xAI)
3. Build 3-column layout: sidebar | chat | right panel
4. OpenSandbox integration: sandbox create per user, command execution, filesystem
5. OpenAI Agents SDK agent inside sandbox with WebSearch, Computer, CodeInterpreter tools

### Phase 2: Features
6. Projects system with master instructions
7. MCP server registry + ON/OFF toggles + install
8. Automation/scheduled tasks
9. Self-evolving skills (SKILL.md files, /commands, auto-improvement)
10. Cross-session memory

### Phase 3: Right Panel
11. Context-dependent tabs (Files/Canvas/Browser/Terminal per mode)
12. Website mode: all 8 tabs
13. Slide mode: Preview/Editor/Themes/Notes
14. Image mode: Preview/Design Tools/Gallery
15. Document mode: Preview/Editor/File Tree
16. Code mode: Files/Review/Lint/Test
