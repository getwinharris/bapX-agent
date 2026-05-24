#!/usr/bin/env python3
"""bapX Spotify tool — Play, search, queue, playlists"""
import sys, json, os
try:
    import spotipy
    from spotipy.oauth2 import SpotifyOAuth
except ImportError:
    spotipy = None

SCOPE = "user-read-playback-state user-modify-playback-state playlist-read-private playlist-modify-public"

def _sp():
    if not spotipy: return None
    return spotipy.Spotify(auth_manager=SpotifyOAuth(
        client_id=os.environ.get("SPOTIFY_CLIENT_ID",""),
        client_secret=os.environ.get("SPOTIFY_CLIENT_SECRET",""),
        redirect_uri="http://localhost:8888/callback",
        scope=SCOPE,
        cache_handler=spotipy.cachehandler.CacheFileHandler(cache_path="/tmp/.spotify_cache")
    ))

def cmd_search(args):
    sp = _sp()
    if not sp: return {"error":"spotipy not installed"}
    r = sp.search(args.get("q",""), limit=args.get("limit",10), type="track,artist,playlist")
    return {"results":{k:[{"id":i["id"],"name":i["name"]} for i in (v["items"] if v else [])[:5]] for k,v in r.items()}}

def cmd_play(args):
    sp = _sp()
    if not sp: return {"error":"spotipy not installed"}
    sp.start_playback(uris=[args["uri"]] if args.get("uri") else None, context_uri=args.get("context"))
    return {"status":"playing","uri":args.get("uri","")}

def cmd_queue(args):
    sp = _sp()
    if not sp: return {"error":"spotipy not installed"}
    sp.add_to_queue(args["uri"])
    return {"status":"queued","uri":args["uri"]}

def cmd_current(args):
    sp = _sp()
    if not sp: return {"error":"spotipy not installed"}
    c = sp.current_playback()
    if not c: return {"status":"nothing playing"}
    return {"track":c["item"]["name"],"artist":c["item"]["artists"][0]["name"],"progress":c["progress_ms"]}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"
    a = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    cmds = {"search":cmd_search,"play":cmd_play,"queue":cmd_queue,"current":cmd_current}
    if cmd=="help": print(json.dumps({"commands":list(cmds.keys())}))
    elif cmd in cmds: print(json.dumps(cmds[cmd](a)))
    else: print(json.dumps({"error":"Unknown: "+cmd}))
