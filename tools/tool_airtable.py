#!/usr/bin/env python3
"""bapX Airtable — CRUD records via REST API"""
import sys, json, os, urllib.request, urllib.parse, urllib.error

TOKEN = os.environ.get("AIRTABLE_TOKEN","")

def _api(method, base, table, data=None):
    if not TOKEN: return {"error":"AIRTABLE_TOKEN env var required"}
    url = "https://api.airtable.com/v0/%s/%s" % (base, urllib.parse.quote(table))
    h = {"Authorization":"Bearer "+TOKEN,"Content-Type":"application/json"}
    b = json.dumps(data).encode() if data else None
    r = urllib.request.Request(url, data=b, headers=h, method=method)
    try:
        with urllib.request.urlopen(r) as resp: return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"error":"HTTP %d: %s" % (e.code, e.read().decode()[:200])}

def cmd_list(args):
    return _api("GET", args["base"], args["table"])

def cmd_get(args):
    return _api("GET", args["base"], args["table"]+"/"+args["record_id"])

def cmd_create(args):
    return _api("POST", args["base"], args["table"], {"records":[{"fields":args.get("fields",{})}]})

def cmd_update(args):
    return _api("PATCH", args["base"], args["table"], {"records":[{"id":args["record_id"],"fields":args.get("fields",{})}]})

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    a = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"list":cmd_list,"get":cmd_get,"create":cmd_create,"update":cmd_update}
    if cmd=="help": print(json.dumps({"commands":list(cmds.keys())}))
    elif cmd in cmds: print(json.dumps(cmds[cmd](a)))
    else: print(json.dumps({"error":"Unknown: "+cmd}))
