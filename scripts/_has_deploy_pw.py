import os
from pathlib import Path

root = Path(__file__).resolve().parents[1]
env = root / ".env"
if env.is_file():
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"'))
print("yes" if os.environ.get("DEPLOY_SSH_PASSWORD") else "no")
