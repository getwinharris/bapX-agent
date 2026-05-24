#!/usr/bin/env python3
"""bapX Maps tool — Geocode, POIs, routes, timezones via OSM"""
import sys, json, urllib.request, urllib.parse, urllib.error

OSM = "https://nominatim.openstreetmap.org"
ORS = "https://router.project-osrm.org"

def cmd_geocode(args):
    q = urllib.parse.quote(args.get("query", ""))
    url = f"{OSM}/search?q={q}&format=json&limit={args.get('limit', 5)}"
    with urllib.request.urlopen(url) as r:
        return {"results": json.loads(r.read())}

def cmd_reverse(args):
    lat, lon = args.get("lat", 0), args.get("lon", 0)
    url = f"{OSM}/reverse?lat={lat}&lon={lon}&format=json"
    with urllib.request.urlopen(url) as r:
        return json.loads(r.read())

def cmd_route(args):
    start = f"{args['from_lon']},{args['from_lat']}"
    end = f"{args['to_lon']},{args['to_lat']}"
    url = f"{ORS}/route/v1/driving/{start};{end}?overview=false"
    with urllib.request.urlopen(url) as r:
        d = json.loads(r.read())
        if d.get("code") != "Ok":
            return {"error": d.get("message", "Route failed")}
        route = d["routes"][0]
        return {"distance_km": round(route["distance"]/1000, 1), "duration_min": round(route["duration"]/60, 1)}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"geocode": cmd_geocode, "reverse": cmd_reverse, "route": cmd_route}
    if cmd == "help": print(json.dumps({"commands": list(cmds.keys())}))
    elif cmd in cmds: print(json.dumps(cmds[cmd](args)))
    else: print(json.dumps({"error": f"Unknown: {cmd}"}))
