#!/usr/bin/env python3
"""bapX GIF tool — Search and download GIFs via Tenor"""
import sys, json, os, urllib.request, urllib.parse

TENOR_KEY = os.environ.get("TENOR_API_KEY", "AIzaSyDsJqYzK8M7mIv0MFCsgInTqZNlxzOyc-U")

def cmd_search(args):
    q = urllib.parse.quote(args.get("q",""))
    limit = args.get("limit", 10)
    url = "https://tenor.googleapis.com/v2/search?q=%s&key=%s&limit=%d&media_filter=minimal" % (q, TENOR_KEY, limit)
    with urllib.request.urlopen(url) as r:
        d = json.loads(r.read())
        results = [{"url":g["media_formats"]["gif"]["url"],"desc":g.get("content_description","")} for g in d.get("results",[])]
        return {"results": results, "count": len(results)}

def cmd_trending(args):
    limit = args.get("limit", 10)
    url = "https://tenor.googleapis.com/v2/featured?key=%s&limit=%d&media_filter=minimal" % (TENOR_KEY, limit)
    with urllib.request.urlopen(url) as r:
        d = json.loads(r.read())
        results = [{"url":g["media_formats"]["gif"]["url"],"desc":g.get("content_description","")} for g in d.get("results",[])]
        return {"results": results, "count": len(results)}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    a = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"search":cmd_search,"trending":cmd_trending}
    if cmd=="help": print(json.dumps({"commands":list(cmds.keys())}))
    elif cmd in cmds: print(json.dumps(cmds[cmd](a)))
    else: print(json.dumps({"error":"Unknown: "+cmd}))
