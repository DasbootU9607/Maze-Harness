"""Start or reuse the local, read-only Authoring Observatory viewer."""
import json
import argparse
import os
from pathlib import Path
import subprocess
import time
import urllib.request

BASE = Path(__file__).resolve().parent
STATE = BASE / "server-state.json"


def healthy(url, root):
    try:
        with urllib.request.urlopen(url + "/api/health", timeout=2) as response:
            data = json.load(response)
            return data.get("application") == "authoring-observatory" and data.get("root") == str(root)
    except Exception:
        return False


def start():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=0)
    parser.add_argument("--root", type=Path, default=BASE / "runs")
    args = parser.parse_args()
    root = args.root.resolve()
    if STATE.exists():
        previous = json.loads(STATE.read_text(encoding="utf-8"))
        if healthy(previous.get("url", ""), root):
            print(previous["url"])
            return
    log_path = BASE / "viewer.stdout.log"
    error_path = BASE / "viewer.stderr.log"
    with log_path.open("w", encoding="utf-8") as stdout, error_path.open("w", encoding="utf-8") as stderr:
        process = subprocess.Popen(
            ["node", str(BASE / "server.cjs"), "--port", str(args.port), "--root", str(root)],
            cwd=BASE, stdout=stdout, stderr=stderr, stdin=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            start_new_session=os.name != "nt",
        )
    for _ in range(50):
        if process.poll() is not None:
            raise RuntimeError(error_path.read_text(encoding="utf-8"))
        text = log_path.read_text(encoding="utf-8")
        if "http://127.0.0.1:" in text:
            url = "http://127.0.0.1:" + text.split("http://127.0.0.1:", 1)[1].split()[0]
            if healthy(url, root):
                STATE.write_text(json.dumps({"pid": process.pid, "url": url, "root": str(root)}, indent=2) + "\n", encoding="utf-8")
                print(url)
                return
        time.sleep(0.1)
    raise RuntimeError("Viewer did not become ready; inspect viewer.stderr.log")


def main():
    lock = BASE / ".viewer-start-lock"
    for _ in range(150):
        try:
            lock.mkdir()
            break
        except FileExistsError:
            time.sleep(0.1)
    else:
        raise RuntimeError("Viewer startup is locked; inspect .viewer-start-lock before retrying")
    try:
        start()
    finally:
        lock.rmdir()


if __name__ == "__main__":
    main()
