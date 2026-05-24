#!/usr/bin/env python3
"""bapX Deploy tool — Deploy to Vercel, GitHub Pages, Firebase, Railway, GCP, Supabase"""
import sys, json, os, subprocess

def cmd_vercel(args):
    """Deploy to Vercel"""
    project_dir = args.get("dir", ".")
    token = args.get("token", os.environ.get("VERCEL_TOKEN", ""))
    if not token:
        return {"error": "VERCEL_TOKEN required"}
    result = subprocess.run(
        f"cd {project_dir} && npx vercel --token={token} --yes --prod 2>&1",
        shell=True, capture_output=True, text=True, timeout=120
    )
    output = result.stdout + result.stderr
    return {"status": "ok" if result.returncode == 0 else "error", "output": output[:2000]}

def cmd_firebase(args):
    """Deploy to Firebase Hosting"""
    project_dir = args.get("dir", ".")
    project_id = args.get("project", "")
    result = subprocess.run(
        f"cd {project_dir} && npx firebase-tools deploy --project={project_id} --non-interactive 2>&1",
        shell=True, capture_output=True, text=True, timeout=120
    )
    output = result.stdout + result.stderr
    return {"status": "ok" if result.returncode == 0 else "error", "output": output[:2000]}

def cmd_railway(args):
    """Deploy to Railway"""
    project_dir = args.get("dir", ".")
    token = args.get("token", os.environ.get("RAILWAY_TOKEN", ""))
    if not token:
        return {"error": "RAILWAY_TOKEN required"}
    result = subprocess.run(
        f"cd {project_dir} && RAILWAY_TOKEN={token} npx railway up 2>&1",
        shell=True, capture_output=True, text=True, timeout=120
    )
    return {"status": "ok" if result.returncode == 0 else "error", "output": (result.stdout + result.stderr)[:2000]}

def cmd_github(args):
    """Deploy to GitHub Pages"""
    project_dir = args.get("dir", ".")
    repo = args.get("repo", "")
    branch = args.get("branch", "gh-pages")
    result = subprocess.run(
        f"cd {project_dir} && npx gh-pages -d dist -b {branch} 2>&1",
        shell=True, capture_output=True, text=True, timeout=120
    )
    return {"status": "ok" if result.returncode == 0 else "error", "output": (result.stdout + result.stderr)[:2000]}

def cmd_gcloud(args):
    """Deploy to Google Cloud Run"""
    project_dir = args.get("dir", ".")
    service = args.get("service", "bapx-app")
    region = args.get("region", "us-central1")
    result = subprocess.run(
        f"cd {project_dir} && gcloud run deploy {service} --source . --region={region} --quiet 2>&1",
        shell=True, capture_output=True, text=True, timeout=300
    )
    return {"status": "ok" if result.returncode == 0 else "error", "output": (result.stdout + result.stderr)[:2000]}

def cmd_supabase(args):
    """Deploy to Supabase"""
    project_dir = args.get("dir", ".")
    project_id = args.get("project", "")
    result = subprocess.run(
        f"cd {project_dir} && npx supabase link --project-ref {project_id} && npx supabase db push 2>&1",
        shell=True, capture_output=True, text=True, timeout=120
    )
    return {"status": "ok" if result.returncode == 0 else "error", "output": (result.stdout + result.stderr)[:2000]}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"vercel": cmd_vercel, "firebase": cmd_firebase, "railway": cmd_railway,
            "github": cmd_github, "gcloud": cmd_gcloud, "supabase": cmd_supabase}
    if cmd == "help":
        print(json.dumps({"commands": list(cmds.keys())}))
    elif cmd in cmds:
        print(json.dumps(cmds[cmd](args)))
    else:
        print(json.dumps({"error": f"Unknown command: {cmd}"}))
