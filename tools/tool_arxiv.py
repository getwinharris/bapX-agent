#!/usr/bin/env python3
"""bapX arXiv tool — Search papers, get abstracts"""
import sys, json, urllib.request, urllib.parse
from xml.etree import ElementTree

NS = {"a": "http://www.w3.org/2005/Atom"}

def cmd_search(args):
    q = urllib.parse.quote(args.get("q",""))
    limit = min(args.get("limit", 10), 100)
    url = "http://export.arxiv.org/api/query?search_query=all:%s&max_results=%d&sortBy=submittedDate&sortOrder=descending" % (q, limit)
    with urllib.request.urlopen(url) as r:
        root = ElementTree.fromstring(r.read())
        entries = []
        for e in root.findall("a:entry", NS):
            entries.append({
                "id": (e.find("a:id", NS).text or "").split("/")[-1] if e.find("a:id", NS) is not None else "",
                "title": ((e.find("a:title", NS).text or "").replace("\n"," ").strip()) if e.find("a:title", NS) is not None else "",
                "authors": [a.find("a:name", NS).text for a in e.findall("a:author", NS)] if e.findall("a:author", NS) else [],
                "summary": ((e.find("a:summary", NS).text or "").replace("\n"," ").strip()[:500]) if e.find("a:summary", NS) is not None else "",
                "published": (e.find("a:published", NS).text or "") if e.find("a:published", NS) is not None else "",
                "link": (e.find("a:id", NS).text or "") if e.find("a:id", NS) is not None else "",
            })
        return {"results": entries, "count": len(entries)}

def cmd_paper(args):
    ids = args.get("ids", [])
    if not ids: return {"error":"ids required"}
    id_list = ",".join(ids)
    url = "http://export.arxiv.org/api/query?id_list=%s" % id_list
    with urllib.request.urlopen(url) as r:
        root = ElementTree.fromstring(r.read())
        entries = []
        for e in root.findall("a:entry", NS):
            entries.append({
                "id": (e.find("a:id", NS).text or "").split("/")[-1] if e.find("a:id", NS) is not None else "",
                "title": ((e.find("a:title", NS).text or "").replace("\n"," ").strip()) if e.find("a:title", NS) is not None else "",
                "authors": [a.find("a:name", NS).text for a in e.findall("a:author", NS)] if e.findall("a:author", NS) else [],
                "summary": ((e.find("a:summary", NS).text or "").replace("\n"," ").strip()[:1000]) if e.find("a:summary", NS) is not None else "",
                "published": (e.find("a:published", NS).text or "") if e.find("a:published", NS) is not None else "",
            })
        return {"results": entries, "count": len(entries)}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    a = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"search":cmd_search,"paper":cmd_paper}
    if cmd=="help": print(json.dumps({"commands":list(cmds.keys())}))
    elif cmd in cmds: print(json.dumps(cmds[cmd](a)))
    else: print(json.dumps({"error":"Unknown: "+cmd}))
