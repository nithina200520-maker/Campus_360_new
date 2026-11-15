"""
Smart Campus 360 - Development Orchestrator
Connects and runs both the Node.js Express backend and React Vite frontend.
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

def main():
    signal.signal(signal.SIGINT, cleanup_and_exit)
    signal.signal(signal.SIGTERM, cleanup_and_exit)

    local_ip = get_local_ip()
    backend_url = "http://localhost:5000"
    frontend_url = "http://localhost:5173"
    network_url = f"http://{local_ip}:5173"

    print("\n" + "=" * 76)
    print("  CAMPUS 360° - SMART CAMPUS MANAGEMENT SYSTEM")
    print("  Government Engineering College, Mosalehosahalli, Hassan")
    print("=" * 76)
    print(f"  [1] Backend API Service  : {backend_url}/")
    print(f"  [2] Frontend Application : {frontend_url}/")
    print(f"  [3] Network Access (LAN) : {network_url}/")
    print("=" * 76)
    print("  --> Connect your browser to: \033[1;36mhttp://localhost:5173/\033[0m")
    print("  --> Press \033[1;31mCtrl+C\033[0m at any time to stop both servers.")
    print("=" * 76 + "\n")

    # Command executables
    node_cmd = "node"
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"

    # Start Backend: Node.js Express server
    print("  [*] Starting Backend Service (Express on port 5000)...")
    backend_proc = subprocess.Popen(
        [node_cmd, os.path.join(SERVER_DIR, "index.js")],
        cwd=PROJECT_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    processes.append(backend_proc)

    # Start Frontend: Vite dev server with host 0.0.0.0
    print("  [*] Starting Frontend Application (React + Vite on port 5173)...")
    frontend_proc = subprocess.Popen(
        [npm_cmd, "--prefix", "client", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"],
        cwd=PROJECT_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    processes.append(frontend_proc)

    # Start background threads to stream output
    t_back = threading.Thread(target=stream_output, args=(backend_proc, "[BACKEND]", "32"), daemon=True)
    t_front = threading.Thread(target=stream_output, args=(frontend_proc, "[FRONTEND]", "36"), daemon=True)
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
            if backend_proc.poll() is not None:
                print("  [!] Backend process ended.")
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
