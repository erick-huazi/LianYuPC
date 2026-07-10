# LianYu E2E Tests (Playwright)

## Prerequisites

```bash
pip install playwright
python -m playwright install chromium   # or use system Edge (script auto-fallback)
```

## Run against local Lite stack (default)

```bash
docker compose -f docker-compose.yml -f docker-compose.lite.yml up -d --build
python scripts/e2e/lianyu_e2e.py
```

## Run against another target

```powershell
$env:LIANYU_E2E_BASE_URL="https://your-lianyu.example"
python scripts/e2e/lianyu_e2e.py
```

The suite creates an isolated random user and starts a deterministic OpenAI-compatible mock on
the host. It verifies authentication, local-provider calls, Character Card round-trip, single chat,
RabbitMQ-backed memory extraction and recall audit, authenticated STOMP group chat, privacy
controls, primary pages, and screenshots.

For a backend that cannot reach `host.docker.internal`, point the suite at an existing compatible
mock instead:

```powershell
$env:LIANYU_E2E_MOCK_AI_BASE_URL="http://mock-openai.internal:18089"
```

## Artifacts

- `scripts/e2e/artifacts/report.json` — machine-readable results
- `scripts/e2e/artifacts/*.png` — screenshots per step / failures
