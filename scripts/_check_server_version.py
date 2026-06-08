#!/usr/bin/env python3
import os
import sys
from pathlib import Path
import paramiko

ROOT = Path(__file__).resolve().parents[1]
for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"'))
pw = os.environ.get("DEPLOY_SSH_PASSWORD")
if not pw:
    sys.exit("no DEPLOY_SSH_PASSWORD")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("154.219.111.30", username="root", password=pw, timeout=30)
for cmd in [
    "cd /opt/lianyu && git log -1 --oneline",
    "docker ps --format '{{.Names}} {{.Status}}' | grep lianyu",
]:
    _, out, _ = c.exec_command(cmd, timeout=60)
    print(out.read().decode("utf-8", errors="replace").strip())
c.close()
