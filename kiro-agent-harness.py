#!/usr/bin/env python3
"""
Root entry forwarder for Kiro Agent Harness V4.0.
"""
import sys
import subprocess
from pathlib import Path

harness_path = Path(__file__).parent / "android-app" / "app" / "src" / "main" / "assets" / "kiro-agent-harness.py"

if harness_path.exists():
    cmd = [sys.executable, str(harness_path)] + sys.argv[1:]
    result = subprocess.run(cmd)
    sys.exit(result.returncode)
else:
    print(f"[ERROR] Cannot locate harness at: {harness_path}")
    sys.exit(1)
