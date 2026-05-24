#!/usr/bin/env python3
"""bapX Diagram tool — Generate Excalidraw JSON and SVG architecture diagrams"""
import sys, json, os, subprocess, tempfile

def cmd_excalidraw(args):
    """Generate an Excalidraw JSON diagram"""
    elements = args.get("elements", [])
    diagram = {
        "type": "excalidraw",
        "version": 2,
        "source": "bapX",
        "elements": elements,
        "appState": {"viewBackgroundColor": "#1a1a2e"}
    }
    path = args.get("output", "diagram.excalidraw")
    with open(path, "w") as f:
        json.dump(diagram, f, indent=2)
    return {"status": "ok", "path": path, "elements": len(elements)}

def cmd_svg_arch(args):
    """Generate an SVG architecture diagram"""
    title = args.get("title", "Architecture")
    nodes = args.get("nodes", [])
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 {50 + len(nodes)*80}" width="100%" height="100%">\n'
    svg += f'<rect width="100%" height="100%" fill="#0a0a1a"/>\n'
    svg += f'<text x="400" y="30" fill="#a78bfa" font-family="Inter, sans-serif" font-size="18" text-anchor="middle" font-weight="bold">{title}</text>\n'
    for i, node in enumerate(nodes):
        y = 60 + i * 80
        svg += f'<rect x="150" y="{y}" width="500" height="50" rx="8" fill="{node.get("color", "#1a1a2e")}" stroke="{node.get("border", "#a78bfa")}" stroke-width="1.5"/>\n'
        svg += f'<text x="400" y="{y+30}" fill="{node.get("text_color", "#e8e8f0")}" font-family="Inter, sans-serif" font-size="14" text-anchor="middle">{node.get("label", "")}</text>\n'
    svg += '</svg>'
    path = args.get("output", "architecture.svg")
    with open(path, "w") as f:
        f.write(svg)
    return {"status": "ok", "path": path, "nodes": len(nodes)}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"excalidraw": cmd_excalidraw, "svg-arch": cmd_svg_arch}
    if cmd == "help":
        print(json.dumps({"commands": list(cmds.keys())}))
    elif cmd in cmds:
        print(json.dumps(cmds[cmd](args)))
    else:
        print(json.dumps({"error": f"Unknown: {cmd}"}))
