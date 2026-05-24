#!/usr/bin/env python3
"""bapX Notion tool — Pages, databases, search via Notion API"""
import sys, json, os, urllib.request, urllib.error

API = "https://api.notion.com/v1"
VER = "2022-06-28"

def _headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Notion-Version": VER
    }

def _req(method, path, data=None, token=None):
    t = token or os.environ.get("NOTION_TOKEN", "")
    if not t:
        return {"error": "NOTION_TOKEN env var required"}
    url = f"{API}{path}"
    body = json.dumps(data).encode() if data else None
    r = urllib.request.Request(url, data=body, headers=_headers(t), method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}: {e.read().decode()[:300]}"}

def cmd_search(args):
    q = args.get("query", "")
    return _req("POST", "/search", {"query": q, "page_size": args.get("limit", 10)})

def cmd_page_create(args):
    return _req("POST", "/pages", {
        "parent": {"database_id": args["database_id"]},
        "properties": {k: {"title": [{"text": {"content": v}}]} if k == args.get("title_field", "Name") else {"rich_text": [{"text": {"content": v}}]} for k, v in args.get("properties", {}).items()}
    })

def cmd_page_read(args):
    return _req("GET", f"/pages/{args['page_id']}")

def cmd_db_query(args):
    return _req("POST", f"/databases/{args['database_id']}/query", {
        "page_size": args.get("limit", 100),
        "sorts": [{"property": args.get("sort", "created_time"), "direction": "descending"}]
    })

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"search": cmd_search, "page-create": cmd_page_create, "page-read": cmd_page_read, "db-query": cmd_db_query}
    if cmd == "help": print(json.dumps({"commands": list(cmds.keys())}))
    elif cmd in cmds: print(json.dumps(cmds[cmd](args)))
    else: print(json.dumps({"error": f"Unknown: {cmd}"}))
