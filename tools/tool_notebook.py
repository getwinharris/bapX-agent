#!/usr/bin/env python3
"""bapX Notebook tool — Interactive Python via Jupyter kernel"""
import sys, json, os, tempfile, subprocess

def cmd_run(args):
    code = args.get("code","")
    if not code: return {"error":"code required"}
    tmp = tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False)
    tmp.write(code)
    tmp.close()
    try:
        r = subprocess.run(["python3", tmp.name], capture_output=True, text=True, timeout=30)
        os.unlink(tmp.name)
        return {"stdout":r.stdout[:5000],"stderr":r.stderr[:2000],"exit":r.returncode}
    except subprocess.TimeoutExpired:
        os.unlink(tmp.name)
        return {"error":"Execution timed out (30s)"}

def cmd_notebook(args):
    cells = args.get("cells",[])
    nb = {"nbformat":4,"nbformat_minor":5,"metadata":{},"cells":[]}
    for c in cells:
        nb["cells"].append({
            "cell_type":"code" if c.get("type","code")=="code" else "markdown",
            "metadata":{},"source":c.get("source","").split("\n")
        })
    path = args.get("output","notebook.ipynb")
    import json as _j; _j.dump(nb, open(path,"w"), indent=1)
    return {"status":"ok","path":path,"cells":len(cells)}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    a = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"run":cmd_run,"notebook":cmd_notebook}
    if cmd=="help": print(json.dumps({"commands":list(cmds.keys())}))
    elif cmd in cmds: print(json.dumps(cmds[cmd](a)))
    else: print(json.dumps({"error":f"Unknown:{cmd}"}))
