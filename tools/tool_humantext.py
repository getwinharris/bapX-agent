#!/usr/bin/env python3
"""bapX Humanizer — Strip AI-isms, add natural voice"""
import sys, json, re

PATTERNS = [
    (r"(?i)\b(delve|leverage|utilize|optimize|paradigm|synergy|holistic|seamless|game-changer|cutting-edge)\b",
     lambda m: {"delve":"explore","leverage":"use","utilize":"use","optimize":"improve","paradigm":"model",
                "synergy":"partnership","holistic":"complete","seamless":"smooth","game-changer":"breakthrough",
                "cutting-edge":"advanced"}.get(m.group(1).lower(), m.group(1))),
    (r"(?i)\b(it is important to note that|it should be noted that|notably|importantly)\b", ""),
    (r"(?i)\b(in order to)\b", "to"),
    (r"(?i)\b(as previously mentioned|as discussed earlier|as stated above)\b", ""),
    (r"\b(however|furthermore|moreover|nevertheless|consequently)\b,?", ""),
    (r"\s{2,}", " "),
]

def cmd_humanize(args):
    text = args.get("text","")
    if not text: return {"error":"text required"}
    changes = 0
    for pattern, replacement in PATTERNS:
        if callable(replacement):
            text, n = re.subn(pattern, replacement, text)
            changes += n
        else:
            text, n = re.subn(pattern, replacement, text)
            changes += n
    return {"result":text.strip(),"changes":changes,"original_length":len(args["text"]),"new_length":len(text)}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    a = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"humanize":cmd_humanize}
    if cmd=="help": print(json.dumps({"commands":list(cmds.keys())}))
    elif cmd in cmds: print(json.dumps(cmds[cmd](a)))
    else: print(json.dumps({"error":f"Unknown:{cmd}"}))
