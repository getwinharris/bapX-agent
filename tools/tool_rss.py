#!/usr/bin/env python3
"""bapX RSS tool — Monitor blogs, fetch feeds"""
import sys, json, urllib.request
try: import feedparser
except: feedparser=None

def cmd_fetch(args):
    url = args.get("url","")
    if not url: return {"error":"url required"}
    if not feedparser: return {"error":"feedparser not installed"}
    with urllib.request.urlopen(url, timeout=10) as r:
        raw = r.read()
    f = feedparser.parse(raw)
    entries = []
    for e in f.entries[:int(args.get("limit",20))]:
        entries.append({
            "title": e.get("title",""),
            "link": e.get("link",""),
            "published": e.get("published",""),
            "summary": ((e.get("summary","") or "")[:300]),
        })
    return {"feed":f.feed.get("title",""),"entries":entries,"count":len(entries)}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    a = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"fetch":cmd_fetch}
    if cmd=="help": print(json.dumps({"commands":list(cmds.keys())}))
    elif cmd in cmds: print(json.dumps(cmds[cmd](a)))
    else: print(json.dumps({"error":"Unknown: "+cmd}))
