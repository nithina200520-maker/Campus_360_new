"""
Smart Campus 360 - Development Orchestrator
Runs Flask/SQLite authentication, the Express module API, and React/Vite.
Compatible with: python run.dev / python run.py
"""

import os
import sys
import time
import socket
import subprocess
import threading
import webbrowser
import signal
from dotenv import load_dotenv

# Ensure UTF-8 output and instant unbuffered flushing on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
        sys.stderr.reconfigure(encoding='utf-8', line_buffering=True)
    except Exception:
        pass

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
CLIENT_DIR = os.path.join(PROJECT_ROOT, "client")
SERVER_DIR = os.path.join(PROJECT_ROOT, "server")

processes = []

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def stream_output(process, prefix, color_code):
    try:
        for line in iter(process.stdout.readline, ''):
            if not line:
                break
            clean_line = line.rstrip()
            if clean_line:
                print(f"\033[{color_code}m{prefix}\033[0m {clean_line}", flush=True)
    except Exception:
        pass

def kill_process_tree(proc):
    if proc is None:
        return
    try:
        if sys.platform == "win32":
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        else:
            proc.terminate()
    except Exception:
        pass

def cleanup_and_exit(signum=None, frame=None):
    print("\n\n  [*] Shutting down Campus 360 servers gracefully...")
    for p in processes:
        kill_process_tree(p)
    print("  [✔] All processes stopped. Goodbye!\n")
    sys.exit(0)

def ensure_npm_dependencies(npm_cmd):
    packages = [
        ("client", os.path.join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js")),
        ("server", os.path.join(SERVER_DIR, "node_modules", "express", "index.js")),
    ]
    for package_dir, entry_point in packages:
        if not os.path.isfile(entry_point):
            print(f"  [*] Installing {package_dir} dependencies from package-lock.json...")
            subprocess.run(
                [npm_cmd, "ci", "--prefix", package_dir],
                cwd=PROJECT_ROOT,
                check=True
            )

def main():
    signal.signal(signal.SIGINT, cleanup_and_exit)
    signal.signal(signal.SIGTERM, cleanup_and_exit)

    load_dotenv(os.path.join(PROJECT_ROOT, ".env"))
    flask_port = os.getenv("FLASK_PORT", "5000")
    module_api_port = os.getenv("MODULE_API_PORT", "5001")
    frontend_port = os.getenv("VITE_PORT", "5173")
    local_ip = get_local_ip()
    # Use the active interface address: another local service may own the
    # loopback listener even though this Flask app binds to all interfaces.
    flask_url = f"http://{local_ip}:{flask_port}"
    backend_url = f"http://localhost:{module_api_port}"
    frontend_url = f"http://localhost:{frontend_port}"
    network_url = f"http://{local_ip}:{frontend_port}"

    print("\n" + "=" * 76)
    print("  CAMPUS 360° - SMART CAMPUS MANAGEMENT SYSTEM")
    print("  Government Engineering College, Mosalehosahalli, Hassan")
    print("=" * 76)
    print(f"  [1] Shared SQL/Auth API   : {flask_url}/api/students/")
    print(f"  [2] Module API Service    : {backend_url}/")
    print(f"  [3] Frontend Application : {frontend_url}/")
    print(f"  [4] Network Access (LAN) : {network_url}/")
    print("=" * 76)
    print(f"  --> Connect your browser to: \033[1;36m{frontend_url}/\033[0m")
    print("  --> Press \033[1;31mCtrl+C\033[0m at any time to stop all services.")
    print("=" * 76 + "\n")

    # Command executables
    node_cmd = "node"
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    ensure_npm_dependencies(npm_cmd)

    # Start Flask: shared account database and authentication API
    print(f"  [*] Starting Shared Auth Service (Flask on port {flask_port})...")
    flask_proc = subprocess.Popen(
        [
            sys.executable, "-m", "flask", "--app", "app:create_app",
            "run", "--reload", "--host", "0.0.0.0", "--port", flask_port
        ],
        cwd=PROJECT_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    processes.append(flask_proc)

    # Start module API: Node.js Express server
    print(f"  [*] Starting Module API Service (Express on port {module_api_port})...")
    backend_env = os.environ.copy()
    backend_env["SERVER_PORT"] = module_api_port
    backend_env["SHARED_AUTH_API_URL"] = flask_url
    backend_proc = subprocess.Popen(
        [node_cmd, os.path.join(SERVER_DIR, "index.js")],
        cwd=PROJECT_ROOT,
        env=backend_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    processes.append(backend_proc)

    # Start Frontend: Vite dev server with host 0.0.0.0
    print(f"  [*] Starting Frontend Application (React + Vite on port {frontend_port})...")
    frontend_env = os.environ.copy()
    frontend_env["VITE_API_TARGET"] = backend_url
    frontend_env["VITE_FLASK_API_TARGET"] = flask_url
    frontend_env["VITE_PORT"] = frontend_port
    frontend_proc = subprocess.Popen(
        [npm_cmd, "--prefix", "client", "run", "dev", "--", "--host", "0.0.0.0"],
        cwd=PROJECT_ROOT,
        env=frontend_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    processes.append(frontend_proc)

    # Start background threads to stream output
    t_flask = threading.Thread(target=stream_output, args=(flask_proc, "[AUTH]", "33"), daemon=True)
    t_back = threading.Thread(target=stream_output, args=(backend_proc, "[API]", "32"), daemon=True)
    t_front = threading.Thread(target=stream_output, args=(frontend_proc, "[FRONTEND]", "36"), daemon=True)
    t_flask.start()
    t_back.start()
    t_front.start()

    # Wait 2 seconds and open browser
    def open_browser():
        time.sleep(2.5)
        try:
            print(f"  [✔] Opening default browser to {frontend_url}/ ...\n")
            webbrowser.open(frontend_url)
        except Exception:
            pass

    threading.Thread(target=open_browser, daemon=True).start()

    # Keep main thread alive
    try:
        while True:
            # Check if any process terminated unexpectedly
            if flask_proc.poll() is not None:
                print("  [!] Shared auth process ended.")
                break
            if backend_proc.poll() is not None:
                print("  [!] Module API process ended.")
                break
            if frontend_proc.poll() is not None:
                print("  [!] Frontend process ended.")
                break
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    finally:
        cleanup_and_exit()

if __name__ == "__main__":
    main()
