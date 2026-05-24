#!/usr/bin/env python3
"""bapX Sketch — Build HTML/CSS mockups and design variants"""
import sys, json

TMPL = '<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">\n<style>\n*{margin:0;padding:0;box-sizing:border-box}\nbody{font-family:-apple-system,system-ui,sans-serif;background:%s;color:%s;padding:2rem}\n.container{max-width:1200px;margin:0 auto}\n%s\n</style></head><body>\n<div class="container">\n%s\n</div></body></html>'

def cmd_html(args):
    content = args.get("content","<h1>Hello</h1>")
    css = args.get("css","")
    bg = args.get("bg","#ffffff")
    fg = args.get("fg","#1a1a1a")
    html = TMPL % (bg, fg, css, content)
    path = args.get("output","sketch.html")
    with open(path,"w") as f: f.write(html)
    return {"status":"ok","path":path,"size":len(html)}

def cmd_variants(args):
    content = args.get("content","<h1>Hello</h1>")
    themes = args.get("themes",[
        {"name":"light","bg":"#ffffff","fg":"#1a1a1a","accent":"#3b82f6"},
        {"name":"dark","bg":"#0a0a1a","fg":"#e8e8f0","accent":"#a78bfa"},
    ])
    output = []
    for t in themes:
        css = "h1{color:%s}button{background:%s;color:#fff;border:none;padding:.5rem 1rem;border-radius:6px}" % (t["accent"], t["accent"])
        html = TMPL % (t["bg"], t["fg"], css, content)
        path = args.get("output","sketch-"+t["name"]+".html")
        with open(path,"w") as f: f.write(html)
        output.append({"theme":t["name"],"path":path})
    return {"status":"ok","variants":output}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    a = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"html":cmd_html,"variants":cmd_variants}
    if cmd=="help": print(json.dumps({"commands":list(cmds.keys())}))
    elif cmd in cmds: print(json.dumps(cmds[cmd](a)))
    else: print(json.dumps({"error":"Unknown: "+cmd}))
