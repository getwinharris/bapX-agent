#!/usr/bin/env python3
"""bapX Email tool — Send, receive, search via IMAP/SMTP"""
import sys, json, os, smtplib, imaplib, email
from email.mime.text import MIMEText

def _smtp_config():
    return {
        "host": os.environ.get("SMTP_HOST", os.environ.get("BAPX_SMTP_HOST", "")),
        "port": int(os.environ.get("SMTP_PORT", os.environ.get("BAPX_SMTP_PORT", "587"))),
        "user": os.environ.get("SMTP_USER", os.environ.get("BAPX_SMTP_USER", "")),
        "pass": os.environ.get("SMTP_PASS", os.environ.get("BAPX_SMTP_PASS", "")),
    }

def _imap_config():
    return {
        "host": os.environ.get("IMAP_HOST", os.environ.get("BAPX_IMAP_HOST", "")),
        "port": int(os.environ.get("IMAP_PORT", os.environ.get("BAPX_IMAP_PORT", "993"))),
        "user": os.environ.get("IMAP_USER", os.environ.get("BAPX_IMAP_USER", "")),
        "pass": os.environ.get("IMAP_PASS", os.environ.get("BAPX_IMAP_PASS", "")),
    }

def cmd_send(args):
    cfg = _smtp_config()
    if not cfg["host"]:
        return {"error": "SMTP not configured"}
    msg = MIMEText(args.get("body", ""), "plain", "utf-8")
    msg["Subject"] = args.get("subject", "")
    msg["From"] = cfg["user"]
    msg["To"] = args.get("to", "")
    try:
        with smtplib.SMTP(cfg["host"], cfg["port"]) as s:
            s.starttls()
            if cfg["user"]: s.login(cfg["user"], cfg["pass"])
            s.send_message(msg)
        return {"status": "ok", "to": args.get("to"), "subject": args.get("subject")}
    except Exception as e:
        return {"error": str(e)[:200]}

def cmd_inbox(args):
    cfg = _imap_config()
    if not cfg["host"]:
        return {"error": "IMAP not configured"}
    try:
        c = imaplib.IMAP4_SSL(cfg["host"], cfg["port"])
        c.login(cfg["user"], cfg["pass"])
        c.select("INBOX")
        _, data = c.search(None, "ALL" if args.get("all") else "UNSEEN")
        ids = data[0].split()[-20:] if data[0] else []
        msgs = []
        for mid in ids:
            _, d = c.fetch(mid, "(BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])")
            msgs.append(d[0][1].decode() if d[0] else "")
        c.logout()
        return {"status": "ok", "count": len(msgs), "messages": msgs}
    except Exception as e:
        return {"error": str(e)[:200]}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"send": cmd_send, "inbox": cmd_inbox}
    if cmd == "help": print(json.dumps({"commands": list(cmds.keys())}))
    elif cmd in cmds: print(json.dumps(cmd[cmd](args)))
    else: print(json.dumps({"error": f"Unknown: {cmd}"}))
