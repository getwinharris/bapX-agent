"""
bapX Agent Runner — runs inside Docker sandbox per user.

Listens on port 8765 for chat messages via SSE.
Uses OpenAI Agents SDK to process messages with user's config.
"""
import os
import json
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uuid

app = FastAPI(title="bapX Agent")

class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    history: list[dict] | None = None

@app.get("/health")
def health():
    return {"status": "ok", "service": "bapx-agent"}

@app.post("/chat")
async def chat(req: ChatRequest, request: Request):
    """Stream a chat completion to the user through the API bridge."""
    
    api_key = os.environ.get("BAPX_API_KEY", "")
    provider = os.environ.get("BAPX_PROVIDER", "openai")
    model = os.environ.get("BAPX_MODEL", "gpt-4o")
    soul_md = os.environ.get("BAPX_SOUL_MD", "")
    agent_name = os.environ.get("BAPX_AGENT_NAME", "BapX")
    user_name = os.environ.get("BAPX_USER_NAME", "User")
    
    # Build system prompt from SOUL.md
    system_prompt = soul_md if soul_md else f"You are {agent_name}, {user_name}'s personal autonomous AI agent."
    
    messages = [{"role": "system", "content": system_prompt}]
    if req.history:
        messages.extend(req.history)
    messages.append({"role": "user", "content": req.message})
    
    async def stream():
        try:
            # Determine API endpoint based on provider
            if provider == "anthropic":
                base_url = "https://api.anthropic.com/v1/messages"
                headers = {
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                }
                body = {
                    "model": model,
                    "messages": [m for m in messages if m["role"] != "system"],
                    "system": system_prompt,
                    "max_tokens": 4096,
                    "stream": True,
                }
            elif provider == "google":
                base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent"
                headers = {"x-goog-api-key": api_key, "content-type": "application/json"}
                body = {"contents": [{"parts": [{"text": req.message}]}]}
            else:
                # OpenAI / OpenRouter / Custom
                if provider == "openrouter":
                    base_url = "https://openrouter.ai/api/v1/chat/completions"
                elif provider == "custom":
                    base_url = os.environ.get("BAPX_CUSTOM_BASE_URL", "https://api.openai.com/v1/chat/completions")
                else:
                    base_url = "https://api.openai.com/v1/chat/completions"
                
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "content-type": "application/json",
                }
                body = {"model": model, "messages": messages, "stream": True, "max_tokens": 4096}
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream("POST", base_url, json=body, headers=headers) as resp:
                    if resp.status_code != 200:
                        error_text = await resp.aread()
                        yield f"data: {json.dumps({'error': f'API error: {resp.status_code}'})}\n\n"
                        return
                    
                    full_content = ""
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:].strip()
                            if data == "[DONE]":
                                break
                            try:
                                parsed = json.loads(data)
                                if provider == "anthropic":
                                    if parsed.get("type") == "content_block_delta":
                                        text = parsed.get("delta", {}).get("text", "")
                                        if text:
                                            full_content += text
                                            yield f"data: {json.dumps({'text': text})}\n\n"
                                else:
                                    delta = parsed.get("choices", [{}])[0].get("delta", {})
                                    if delta.get("content"):
                                        full_content += delta["content"]
                                        yield f"data: {json.dumps({'text': delta['content']})}\n\n"
                                    if delta.get("tool_calls"):
                                        for tc in delta["tool_calls"]:
                                            yield f"data: {json.dumps({'tool_call': tc})}\n\n"
                            except json.JSONDecodeError:
                                pass
            
            yield f"data: {json.dumps({'done': True, 'sessionId': req.session_id or str(uuid.uuid4())})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("AGENT_PORT", "8765"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
