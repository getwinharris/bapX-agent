#!/usr/bin/env python3
"""bapX YouTube tool — Get transcripts, summarize videos, search"""
import sys, json, subprocess, re

def cmd_transcript(args):
    """Get transcript of a YouTube video"""
    url = args.get("url", "")
    lang = args.get("language", "en")
    if not url:
        return {"error": "url required"}
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        video_id = _extract_id(url)
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=[lang])
        text = " ".join([t["text"] for t in transcript])
        return {"status": "ok", "video_id": video_id, "text": text, "length": len(text)}
    except ImportError:
        return {"error": "Install: pip install youtube-transcript-api"}

def cmd_info(args):
    """Get video info using yt-dlp"""
    url = args.get("url", "")
    if not url:
        return {"error": "url required"}
    try:
        result = subprocess.run(
            ["yt-dlp", "--dump-json", url],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            return {"error": result.stderr[:500]}
        data = json.loads(result.stdout)
        return {
            "status": "ok",
            "title": data.get("title", ""),
            "duration": data.get("duration", 0),
            "channel": data.get("channel", ""),
            "description": (data.get("description", "") or "")[:500],
            "view_count": data.get("view_count", 0),
        }
    except subprocess.TimeoutExpired:
        return {"error": "yt-dlp timed out"}
    except Exception as e:
        return {"error": str(e)[:200]}

def cmd_summarize(args):
    """Get transcript and return summary-ready text"""
    url = args.get("url", "")
    lang = args.get("language", "en")
    result = cmd_transcript({"url": url, "language": lang})
    if "error" in result:
        return result
    # Return transcript trimmed for LLM context
    text = result["text"]
    if len(text) > 15000:
        text = text[:15000] + "... [truncated]"
    return {"status": "ok", "video_id": result["video_id"], "transcript": text}

def _extract_id(url):
    patterns = [
        r'(?:v=|/v/|youtu\.be/|/embed/)([a-zA-Z0-9_-]{11})',
        r'(?:shorts/)([a-zA-Z0-9_-]{11})',
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return url.strip()

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"transcript": cmd_transcript, "info": cmd_info, "summarize": cmd_summarize}
    if cmd == "help":
        print(json.dumps({"commands": list(cmds.keys())}))
    elif cmd in cmds:
        print(json.dumps(cmds[cmd](args)))
    else:
        print(json.dumps({"error": f"Unknown: {cmd}"}))
