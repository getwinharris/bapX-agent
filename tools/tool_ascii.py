#!/usr/bin/env python3
"""bapX ASCII Art — Banners, figlet, cowsay, boxes"""
import sys, json, subprocess

def cmd_banner(args):
    text = args.get("text","bapX")
    try:
        import pyfiglet
        r = pyfiglet.figlet_format(text, font=args.get("font","standard"))
        return {"result":r}
    except ImportError:
        r = subprocess.run(["figlet","-f",args.get("font","standard"),text], capture_output=True, text=True)
        if r.returncode==0: return {"result":r.stdout}
        return {"error":"Install pyfiglet or figlet"}

def cmd_cowsay(args):
    text = args.get("text","Hello")
    r = subprocess.run(["cowsay",text], capture_output=True, text=True)
    return {"result":r.stdout or r.stderr}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    a = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"banner":cmd_banner,"cowsay":cmd_cowsay}
    if cmd=="help": print(json.dumps({"commands":list(cmds.keys())}))
    elif cmd in cmds: print(json.dumps(cmds[cmd](a)))
    else: print(json.dumps({"error":"Unknown: "+cmd}))
