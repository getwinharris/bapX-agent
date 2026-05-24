#!/usr/bin/env python3
"""bapX Linear tool — Issues, projects, teams via GraphQL"""
import sys, json, os, urllib.request, urllib.error

API = "https://api.linear.app/graphql"

def _gql(query, variables=None, token=None):
    t = token or os.environ.get("LINEAR_TOKEN", "")
    if not t:
        return {"error": "LINEAR_TOKEN env var required"}
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    r = urllib.request.Request(API, data=body, headers={
        "Authorization": t, "Content-Type": "application/json"
    })
    try:
        with urllib.request.urlopen(r) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}: {e.read().decode()[:300]}"}

def cmd_issues(args):
    q = """query($limit: Int) {
        issues(first: $limit) { nodes { id title description priority state { name } assignee { name } } }
    }"""
    return _gql(q, {"limit": args.get("limit", 20)})

def cmd_create(args):
    q = """mutation($title: String!, $desc: String, $teamId: String!) {
        issueCreate(input: { title: $title, description: $desc, teamId: $teamId }) {
            success issue { id title }
        }
    }"""
    return _gql(q, {"title": args["title"], "desc": args.get("desc", ""), "teamId": args["team_id"]})

def cmd_teams(args):
    q = """query { teams { nodes { id name key } } }"""
    return _gql(q)

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"issues": cmd_issues, "create": cmd_create, "teams": cmd_teams}
    if cmd == "help": print(json.dumps({"commands": list(cmds.keys())}))
    elif cmd in cmds: print(json.dumps(cmd[cmd](args)))
    else: print(json.dumps({"error": f"Unknown: {cmd}"}))
