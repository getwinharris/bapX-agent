#!/usr/bin/env python3
"""bapX p5.js — Generate p5.js sketches"""
import sys, json

SKETCH = '<!DOCTYPE html>\n<html><head><script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>\n<style>body{margin:0;overflow:hidden}canvas{display:block}</style></head><body>\n<script>\n%s\nfunction draw(){\n%s\n}\n</script></body></html>'

def cmd_sketch(args):
    setup = args.get("setup","function setup(){createCanvas(800,600)}")
    draw = args.get("draw","background(20);fill(139,92,246);ellipse(mouseX,mouseY,50,50)")
    html = SKETCH % (setup, draw)
    path = args.get("output","sketch.html")
    with open(path,"w") as f: f.write(html)
    return {"status":"ok","path":path}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    a = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"sketch":cmd_sketch}
    if cmd=="help": print(json.dumps({"commands":list(cmds.keys())}))
    elif cmd in cmds: print(json.dumps(cmds[cmd](a)))
    else: print(json.dumps({"error":"Unknown: "+cmd}))
