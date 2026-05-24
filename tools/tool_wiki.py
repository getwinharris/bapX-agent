#!/usr/bin/env python3
"""bapX Wiki tool — Build and query markdown knowledge base"""
import sys, json, os, glob
WIKI = os.environ.get("BAPX_WIKI", os.path.expanduser("~/.bapx/wiki"))

def cmd_init(args):
    for d in ["entities","concepts","raw/articles"]:
        os.makedirs(WIKI+"/"+d, exist_ok=True)
    idx = WIKI+"/index.md"
    if not os.path.exists(idx):
        open(idx,"w").write("# Wiki\n\nLast updated: "+args.get("domain","bapX knowledge base")+"\n")
    return {"status":"ok","path":WIKI}

def cmd_search(args):
    q = args.get("q","").lower()
    results = []
    for root, dirs, files in os.walk(WIKI):
        for f in files:
            if not f.endswith(".md"): continue
            if "raw/" in root: continue
            with open(os.path.join(root,f)) as fh:
                if q in fh.read().lower():
                    results.append({"file":os.path.relpath(os.path.join(root,f),WIKI),"match":True})
    return {"results":results,"count":len(results)}

def cmd_read(args):
    path = args.get("page","")
    fpath = WIKI+"/"+path+(not path.endswith(".md") and ".md" or "")
    if not os.path.exists(fpath): return {"error":"Page not found: "+path}
    with open(fpath) as f: return {"content":f.read(),"path":os.path.relpath(fpath,WIKI)}

def cmd_create(args):
    name = args.get("name","")
    content = args.get("content","")
    category = args.get("category","concepts")
    os.makedirs(WIKI+"/"+category, exist_ok=True)
    fpath = WIKI+"/"+category+"/"+name+".md"
    with open(fpath,"w") as f: f.write(content)
    return {"status":"created","path":os.path.relpath(fpath,WIKI)}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    a = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"init":cmd_init,"search":cmd_search,"read":cmd_read,"create":cmd_create}
    if cmd=="help": print(json.dumps({"commands":list(cmds.keys())}))
    elif cmd in cmds: print(json.dumps(cmds[cmd](a)))
    else: print(json.dumps({"error":"Unknown: "+cmd}))
