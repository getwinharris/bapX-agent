#!/usr/bin/env python3
"""bapX Google Workspace — Gmail, Calendar, Drive"""
import sys, json, os, urllib.request, urllib.parse

TOKEN = os.environ.get("GWS_TOKEN","")

def _api(method, url, data=None):
    if not TOKEN: return {"error":"GWS_TOKEN env var required"}
    h = {"Authorization":"Bearer "+TOKEN,"Content-Type":"application/json"}
    b = json.dumps(data).encode() if data else None
    r = urllib.request.Request(url, data=b, headers=h, method=method)
    try:
        with urllib.request.urlopen(r) as resp: return json.loads(resp.read())
    except Exception as e: return {"error":str(e)[:200]}

def cmd_email_list(args):
    q = urllib.parse.quote(args.get("q",""))
    r = _api("GET", "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=%s&maxResults=%d" % (q, args.get("limit",10)))
    if "error" in r: return r
    msgs = []
    for m in r.get("messages",[]):
        d = _api("GET", "https://gmail.googleapis.com/gmail/v1/users/me/messages/%s?format=metadata" % m["id"])
        headers = {h["name"]:h["value"] for h in d.get("payload",{}).get("headers",[])}
        msgs.append({"id":m["id"],"from":headers.get("From",""),"subject":headers.get("Subject",""),"date":headers.get("Date","")})
    return {"messages":msgs,"count":len(msgs)}

def cmd_calendar(args):
    r = _api("GET", "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=%d&orderBy=startTime&singleEvents=true&timeMin=%s" % (args.get("limit",10), args.get("from","2000-01-01T00:00:00Z")))
    if "error" in r: return r
    events = [{"summary":e.get("summary",""),"start":e.get("start",{}).get("dateTime",""),"link":e.get("htmlLink","")} for e in r.get("items",[])]
    return {"events":events,"count":len(events)}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    a = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"email-list":cmd_email_list,"calendar":cmd_calendar}
    if cmd=="help": print(json.dumps({"commands":list(cmds.keys())}))
    elif cmd in cmds: print(json.dumps(cmds[cmd](a)))
    else: print(json.dumps({"error":"Unknown: "+cmd}))
