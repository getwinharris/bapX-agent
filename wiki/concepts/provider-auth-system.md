---
title: Provider & Auth System
created: 2026-05-24
updated: 2026-05-24
type: concept
tags: [auth, oauth, api-key, provider, credential]
confidence: high
---

# Provider & Auth System

bapX supports 30 AI model providers with 7 OAuth options.

## Auth Methods
1. **API Key** — user enters key in settings, saved to sandbox `~/.bapx/config.toml`
2. **OAuth (Existing Plan)** — user logs in with their existing ChatGPT/Claude/etc subscription
3. **Custom Endpoint** — user provides base URL + API key

## 30 Providers
OpenAI, Anthropic, OpenRouter, Google Gemini, DeepSeek, xAI/Grok, HuggingFace,
GitHub Models, Mistral, Groq, Perplexity, Together AI, Fireworks AI, Cohere,
Replicate, Kimi/Moonshot, Qwen/Alibaba, ZHIPU AI, MiniMax, MiniMax CN,
DeepInfra, Nous Portal, GitHub Copilot, ElevenLabs, Xiaomi MiMo, Kilo Code,
AI Gateway (Vercel), OpenCode Zen, OpenCode Go, Custom Endpoint

## 7 OAuth Providers
ChatGPT (OpenAI) — Existing Plan, Claude (Anthropic) — Existing Plan, Google,
Nous Portal, Qwen (Alibaba), GitHub Copilot, OpenAI Codex

## Credential Flow
1. User enters API key or completes OAuth in frontend settings
2. Backend writes credential to sandbox `~/.bapx/auth.json` or `config.toml`
3. Agent inside sandbox reads credentials from its local files
4. `/v1/chat/completions` proxy routes to the correct provider using stored credential
5. Model list is fetched live from provider after authentication

## OAuth Device Code Flow
1. Frontend shows user_code and verification URL in modal
2. User opens URL on any device, enters code
3. Backend polls token endpoint
4. On completion, token saved to sandbox
