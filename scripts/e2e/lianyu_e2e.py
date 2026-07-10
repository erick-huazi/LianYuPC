"""
LianYu-PC end-to-end smoke + flow tests (Playwright).

Default target: local Lite stack at http://localhost:8088
Override with LIANYU_E2E_BASE_URL for another deployment.
"""
from __future__ import annotations

import json
import os
import re
import socket
import ssl
import sys
import threading
import time
import uuid
import urllib.error
import urllib.request
from base64 import b64decode
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Callable

from playwright.sync_api import Page, sync_playwright, expect

BASE_URL = os.environ.get("LIANYU_E2E_BASE_URL", "http://localhost:8088").rstrip("/")
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
PASSWORD = "TestPass1a"
REPO_ROOT = Path(__file__).resolve().parents[2]
BROWSER_CAPTCHAS: list[tuple[str, str]] = []
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE


class MockOpenAIHandler(BaseHTTPRequestHandler):
    server_version = "LianYuE2E/1.0"

    def log_message(self, _format: str, *_args) -> None:
        return

    def send_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path.rstrip("/").endswith("/v1/models"):
            self.send_json({
                "object": "list",
                "data": [{
                    "id": "e2e-model",
                    "object": "model",
                    "created": 1,
                    "owned_by": "lianyu-e2e",
                }],
            })
            return
        self.send_json({"error": {"message": "not found"}}, 404)

    def do_POST(self) -> None:  # noqa: N802
        if not self.path.rstrip("/").endswith("/v1/chat/completions"):
            self.send_json({"error": {"message": "not found"}}, 404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        request_body = json.loads(self.rfile.read(length) or b"{}")
        content = "收到，我会认真记住，也会在之后的对话里继续回应。"
        if request_body.get("stream"):
            chunk = {
                "id": "chatcmpl-e2e",
                "object": "chat.completion.chunk",
                "created": 1,
                "model": "e2e-model",
                "choices": [{"index": 0, "delta": {"content": content}, "finish_reason": None}],
            }
            done = {
                "id": "chatcmpl-e2e",
                "object": "chat.completion.chunk",
                "created": 1,
                "model": "e2e-model",
                "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
            }
            body = (
                f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
                f"data: {json.dumps(done, ensure_ascii=False)}\n\n"
                "data: [DONE]\n\n"
            ).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_json({
            "id": "chatcmpl-e2e",
            "object": "chat.completion",
            "created": 1,
            "model": "e2e-model",
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": "stop",
            }],
            "usage": {"prompt_tokens": 12, "completion_tokens": 10, "total_tokens": 22},
        })


def start_mock_openai() -> tuple[ThreadingHTTPServer | None, str]:
    configured = os.environ.get("LIANYU_E2E_MOCK_AI_BASE_URL", "").strip().rstrip("/")
    if configured:
        return None, configured
    server = ThreadingHTTPServer(("0.0.0.0", 0), MockOpenAIHandler)
    thread = threading.Thread(target=server.serve_forever, name="lianyu-e2e-openai", daemon=True)
    thread.start()
    return server, f"http://host.docker.internal:{server.server_port}"


@dataclass
class TestResult:
    name: str
    passed: bool
    detail: str = ""
    duration_ms: int = 0


@dataclass
class TestRun:
    results: list[TestResult] = field(default_factory=list)

    def record(self, name: str, fn: Callable[[], None]) -> None:
        start = time.perf_counter()
        try:
            fn()
            ms = int((time.perf_counter() - start) * 1000)
            self.results.append(TestResult(name, True, duration_ms=ms))
            print(f"  PASS  {name} ({ms}ms)")
        except Exception as exc:  # noqa: BLE001
            ms = int((time.perf_counter() - start) * 1000)
            detail = str(exc)
            self.results.append(TestResult(name, False, detail, ms))
            print(f"  FAIL  {name} ({ms}ms)\n        {detail}")

    @property
    def passed(self) -> int:
        return sum(1 for r in self.results if r.passed)

    @property
    def failed(self) -> int:
        return sum(1 for r in self.results if not r.passed)


def api_request(method: str, path: str, body: dict | None = None, token: str | None = None) -> dict:
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["lianyu-token"] = token
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=45) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        payload = exc.read().decode(errors="replace")
        raise RuntimeError(f"HTTP {exc.code} {path}: {payload[:300]}") from exc


def api_multipart(
    path: str,
    filename: str,
    content_type: str,
    content: bytes,
    fields: dict[str, str],
    token: str,
) -> dict:
    boundary = f"----LianYuE2E{uuid.uuid4().hex}"
    chunks: list[bytes] = []
    for name, value in fields.items():
        chunks.extend([
            f"--{boundary}\r\n".encode(),
            f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode(),
            str(value).encode("utf-8"),
            b"\r\n",
        ])
    chunks.extend([
        f"--{boundary}\r\n".encode(),
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode(),
        f"Content-Type: {content_type}\r\n\r\n".encode(),
        content,
        b"\r\n",
        f"--{boundary}--\r\n".encode(),
    ])
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=b"".join(chunks),
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "lianyu-token": token,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=60) as resp:
        return json.loads(resp.read())


def api_bytes(path: str, token: str) -> tuple[bytes, str]:
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        headers={"lianyu-token": token},
        method="GET",
    )
    with urllib.request.urlopen(req, context=SSL_CTX, timeout=60) as resp:
        return resp.read(), resp.headers.get("Content-Type", "")


def load_local_env() -> dict[str, str]:
    values: dict[str, str] = {}
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return values
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def read_resp(stream):
    prefix = stream.read(1)
    if not prefix:
        raise RuntimeError("Redis closed the connection")
    line = stream.readline().rstrip(b"\r\n")
    if prefix == b"+":
        return line.decode("utf-8")
    if prefix == b"-":
        raise RuntimeError(f"Redis error: {line.decode('utf-8', errors='replace')}")
    if prefix == b":":
        return int(line)
    if prefix == b"$":
        length = int(line)
        if length < 0:
            return None
        value = stream.read(length)
        stream.read(2)
        return value.decode("utf-8")
    raise RuntimeError(f"Unsupported Redis response prefix: {prefix!r}")


def send_redis_command(sock: socket.socket, stream, *parts: str):
    encoded = [part.encode("utf-8") for part in parts]
    payload = [f"*{len(encoded)}\r\n".encode()]
    for part in encoded:
        payload.extend([f"${len(part)}\r\n".encode(), part, b"\r\n"])
    sock.sendall(b"".join(payload))
    return read_resp(stream)


def captcha_answer(captcha_id: str) -> int:
    local_env = load_local_env()
    host = os.environ.get("LIANYU_E2E_REDIS_HOST", "127.0.0.1")
    port = int(os.environ.get("LIANYU_E2E_REDIS_PORT", local_env.get("REDIS_PORT", "6379")))
    password = os.environ.get("LIANYU_E2E_REDIS_PASSWORD", local_env.get("REDIS_PASSWORD", ""))
    if not password:
        raise RuntimeError("Set LIANYU_E2E_REDIS_PASSWORD or generate .env with scripts/init-local.ps1")
    with socket.create_connection((host, port), timeout=5) as sock:
        stream = sock.makefile("rb")
        send_redis_command(sock, stream, "AUTH", password)
        value = send_redis_command(sock, stream, "GET", f"captcha:{captcha_id}")
    if value is None:
        raise RuntimeError(f"Captcha answer not found in Redis: {captcha_id}")
    return int(value)


def capture_browser_captcha(response) -> None:
    if not response.url.rstrip("/").endswith("/api/auth/captcha") or not response.ok:
        return
    try:
        payload = response.json()
        data = payload.get("data") if isinstance(payload, dict) else None
        if not isinstance(data, dict):
            return
        captcha_id = str(data.get("captchaId") or "")
        image = str(data.get("imageBase64") or "").strip()
        if captcha_id and image:
            BROWSER_CAPTCHAS.append((captcha_id, image))
    except Exception:
        return


def register_user_via_api(username: str) -> dict:
    cap = api_request("GET", "/api/auth/captcha")["data"]
    answer = captcha_answer(cap["captchaId"])
    payload = {
        "username": username,
        "password": PASSWORD,
        "nickname": "E2E Tester",
        "captcha": {"captchaId": cap["captchaId"], "captchaAnswer": answer},
    }
    resp = api_request("POST", "/api/auth/register", payload)
    if resp.get("code") != 200:
        raise RuntimeError(f"Register failed: {resp}")
    return resp["data"]


def wait_for_captcha(page: Page) -> int:
    image = page.locator(".captcha-image")
    expect(image).to_be_visible(timeout=15000)
    deadline = time.time() + 15
    while time.time() < deadline:
        src = image.get_attribute("src") or ""
        encoded = src.split(",", 1)[-1] if "," in src else src
        for captcha_id, image_base64 in reversed(BROWSER_CAPTCHAS):
            if encoded == image_base64:
                return captcha_answer(captcha_id)
        page.wait_for_timeout(100)
    raise AssertionError("Captcha image loaded without a matching API challenge")


def fill_captcha(page: Page) -> None:
    answer = wait_for_captcha(page)
    page.locator(".captcha-input input").fill(str(answer))


def dismiss_onboarding_if_present(page: Page) -> None:
    for _ in range(3):
        cancel = page.get_by_role("button", name=re.compile(r"^(取消|关闭|知道了|Skip)$"))
        if cancel.count() == 0:
            break
        try:
            cancel.first.click(timeout=800)
            page.wait_for_timeout(300)
        except Exception:
            break


def goto_hash(page: Page, path: str) -> None:
    if not path.startswith("/"):
        path = f"/{path}"
    if BASE_URL not in page.url:
        page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
    page.evaluate("(p) => { window.location.hash = p; }", path)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(400)
    dismiss_onboarding_if_present(page)


def expect_hash(page: Page, fragment: str) -> None:
    if not fragment.startswith("#"):
        fragment = f"#{fragment}"
    expect(page).to_have_url(re.compile(re.escape(fragment)), timeout=15000)


def inject_auth(page: Page, auth: dict) -> None:
    page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
    page.evaluate(
        """async (auth) => {
            const toHex = bytes => Array.from(bytes)
              .map(value => value.toString(16).padStart(2, '0'))
              .join('')
            const rawKey = crypto.getRandomValues(new Uint8Array(32))
            const key = await crypto.subtle.importKey(
              'raw', rawKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
            )
            const iv = crypto.getRandomValues(new Uint8Array(12))
            const encrypted = await crypto.subtle.encrypt(
              { name: 'AES-GCM', iv }, key, new TextEncoder().encode(auth.token)
            )
            const combined = new Uint8Array(iv.length + encrypted.byteLength)
            combined.set(iv, 0)
            combined.set(new Uint8Array(encrypted), iv.length)
            localStorage.setItem('_lkt', toHex(rawKey))
            localStorage.setItem('_ltt', toHex(combined))
            localStorage.setItem('lianyu-user-profile', JSON.stringify({
              userId: auth.userId,
              username: auth.username,
              nickname: auth.nickname || '',
              avatarUrl: auth.avatarUrl || '',
            }))
            localStorage.setItem('lianyu-last-username', auth.username || '')
        }""",
        auth,
    )
    page.reload(wait_until="domcontentloaded")
    goto_hash(page, "/app")


def assert_page_title(page: Page, text: str) -> None:
    expect(page.locator("h1.page-title").first).to_contain_text(text, timeout=15000)


def launch_browser(playwright):
    try:
        return playwright.chromium.launch(headless=True)
    except Exception:
        return playwright.chromium.launch(headless=True, channel="msedge")


def run_tests() -> TestRun:
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    run = TestRun()
    username = f"e2e_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    mock_server, mock_ai_base_url = start_mock_openai()
    vault_provider = "e2e-mock"
    auth_data: dict = {}
    imported_character: dict = {}
    chat_conversation: dict = {}
    group_conversation: dict = {}

    with sync_playwright() as p:
        browser = launch_browser(p)
        context = browser.new_context(
            ignore_https_errors=True,
            locale="zh-CN",
            viewport={"width": 1280, "height": 900},
        )
        page = context.new_page()
        page.on("response", capture_browser_captcha)

        def snap(label: str) -> None:
            path = os.path.join(SCREENSHOT_DIR, f"{label}.png")
            page.screenshot(path=path, full_page=True)

        def test_landing() -> None:
            goto_hash(page, "/")
            expect(page.locator("body")).to_be_visible()
            snap("01-landing")

        def test_captcha_api() -> None:
            resp = api_request("GET", "/api/auth/captcha")
            assert resp.get("code") == 200, resp
            data = resp.get("data") or {}
            assert data.get("captchaId"), data
            assert "expression" not in data, data
            assert b64decode(data.get("imageBase64") or "").startswith(b"\x89PNG\r\n\x1a\n"), data

        def test_login_page() -> None:
            goto_hash(page, "/login")
            expect(page.get_by_role("heading", name="欢迎回来")).to_be_visible()
            wait_for_captcha(page)
            snap("02-login")

        def test_register_page() -> None:
            goto_hash(page, "/register")
            expect(page.get_by_role("heading", name="注册账号")).to_be_visible()
            wait_for_captcha(page)
            snap("03-register")

        def test_register_via_api() -> None:
            auth_data.update(register_user_via_api(username))
            assert auth_data.get("token"), auth_data

        def test_register_ui_form() -> None:
            goto_hash(page, "/register")
            page.locator('input[autocomplete="username"]').fill(f"{username}_ui")
            page.locator('input[placeholder="昵称（选填）"]').fill("UI Form")
            page.locator('input[autocomplete="new-password"]').first.fill(PASSWORD)
            page.locator('input[placeholder="确认密码"]').fill(PASSWORD)
            fill_captcha(page)
            page.locator("button.submit-btn").click()
            page.wait_for_timeout(3000)
            err = page.locator(".el-message--error")
            if err.count() and err.first.is_visible():
                raise AssertionError(f"Register UI error toast: {err.first.inner_text()}")
            if "#/app" not in page.url:
                raise AssertionError(f"Register UI did not reach /app, url={page.url}")

        def test_session_injection() -> None:
            inject_auth(page, auth_data)
            expect_hash(page, "#/app")
            encrypted_token = page.evaluate("() => localStorage.getItem('_ltt')")
            assert encrypted_token and auth_data["token"] not in encrypted_token

        def test_authenticated_api() -> None:
            resp = api_request("GET", "/api/character", token=auth_data["token"])
            if resp.get("code") != 200:
                raise AssertionError(
                    f"GET /api/character failed: code={resp.get('code')} msg={resp.get('message')}"
                )

        def test_openai_compatible_vault() -> None:
            created = api_request(
                "POST",
                "/api/ai/vault",
                {
                    "provider": vault_provider,
                    "apiKey": "sk-e2e-local-key-0001",
                    "baseUrl": mock_ai_base_url,
                    "modelDefault": "e2e-model",
                    "remark": "Local deterministic E2E provider",
                },
                auth_data["token"],
            )
            assert created.get("code") == 200, created
            assert created["data"]["provider"] == vault_provider
            models = api_request(
                "GET", f"/api/ai/models?provider={vault_provider}", token=auth_data["token"]
            )
            assert models.get("code") == 200, models
            assert any(model.get("id") == "e2e-model" for model in models.get("data") or []), models

        def test_character_card_round_trip() -> None:
            card = {
                "spec": "chara_card_v2",
                "spec_version": "2.0",
                "data": {
                    "name": "E2E Card",
                    "description": "A calm test companion.",
                    "personality": "Patient and concise.",
                    "scenario": "Local integration test.",
                    "first_mes": "Hello from the card.",
                    "mes_example": "<START>\n{{user}}: Hi\n{{char}}: Hello",
                    "creator_notes": "Round-trip marker",
                    "system_prompt": "",
                    "post_history_instructions": "",
                    "alternate_greetings": ["Welcome back."],
                    "tags": ["e2e"],
                    "creator": "LianYu E2E",
                    "character_version": "1.0",
                    "extensions": {"e2e/unknown": {"preserve": True}},
                },
            }
            response = api_multipart(
                "/api/character/import",
                "e2e-card.json",
                "application/json",
                json.dumps(card).encode("utf-8"),
                {"cityMode": "real", "city": "Shanghai"},
                auth_data["token"],
            )
            assert response.get("code") == 200, response
            imported_character.update(response["data"])
            exported, content_type = api_bytes(
                f"/api/character/{imported_character['id']}/export?format=json",
                auth_data["token"],
            )
            assert "application/json" in content_type, content_type
            exported_card = json.loads(exported)
            assert exported_card["data"]["name"] == "E2E Card"
            assert exported_card["data"]["extensions"]["e2e/unknown"]["preserve"] is True

        def test_memory_privacy_api() -> None:
            character_id = imported_character["id"]
            update = api_request(
                "PUT",
                f"/api/character/{character_id}",
                {"settings": {"memoryEnabled": False}},
                auth_data["token"],
            )
            assert update.get("code") == 200, update
            assert update["data"]["settings"]["memoryEnabled"] is False
            recalls = api_request(
                "GET", f"/api/memory/recalls?characterId={character_id}", token=auth_data["token"]
            )
            assert recalls.get("code") == 200, recalls
            cleared = api_request(
                "DELETE", f"/api/memory?characterId={character_id}", token=auth_data["token"]
            )
            assert cleared.get("code") == 200, cleared
            enabled = api_request(
                "PUT",
                f"/api/character/{character_id}",
                {"settings": {"memoryEnabled": True}},
                auth_data["token"],
            )
            assert enabled.get("code") == 200, enabled
            assert enabled["data"]["settings"]["memoryEnabled"] is True

        def test_chat_and_memory_recall() -> None:
            character_id = imported_character["id"]
            created = api_request(
                "POST",
                "/api/conversation",
                {"characterId": character_id, "mode": "SINGLE", "title": "E2E Chat"},
                auth_data["token"],
            )
            assert created.get("code") == 200, created
            chat_conversation.update(created["data"])

            first = api_request(
                "POST",
                f"/api/conversation/{chat_conversation['id']}/messages",
                {
                    "provider": vault_provider,
                    "model": "e2e-model",
                    "content": "我喜欢夜跑。",
                },
                auth_data["token"],
            )
            assert first.get("code") == 200, first
            assert "认真记住" in first["data"]["content"]

            deadline = time.time() + 60
            memories: list[dict] = []
            while time.time() < deadline:
                response = api_request(
                    "GET", f"/api/memory?characterId={character_id}&size=50", token=auth_data["token"]
                )
                assert response.get("code") == 200, response
                memories = response.get("data") or []
                if any("夜跑" in (item.get("summary") or "") for item in memories):
                    break
                time.sleep(2)
            assert any("夜跑" in (item.get("summary") or "") for item in memories), memories

            second = api_request(
                "POST",
                f"/api/conversation/{chat_conversation['id']}/messages",
                {
                    "provider": vault_provider,
                    "model": "e2e-model",
                    "content": "还记得我的爱好吗？",
                },
                auth_data["token"],
            )
            assert second.get("code") == 200, second

            deadline = time.time() + 20
            recalls: list[dict] = []
            while time.time() < deadline:
                response = api_request(
                    "GET",
                    f"/api/memory/recalls?characterId={character_id}",
                    token=auth_data["token"],
                )
                assert response.get("code") == 200, response
                recalls = response.get("data") or []
                if any((item.get("hitCount") or 0) > 0 for item in recalls):
                    break
                time.sleep(1)
            assert any((item.get("hitCount") or 0) > 0 for item in recalls), recalls
            assert any("夜跑" in summary for item in recalls for summary in item.get("summaries") or []), recalls

        def test_group_chat_flow() -> None:
            second_card = {
                "spec": "chara_card_v2",
                "spec_version": "2.0",
                "data": {
                    "name": "E2E Card Two",
                    "description": "A second deterministic companion.",
                    "personality": "Warm and direct.",
                    "scenario": "Local integration test.",
                    "first_mes": "Hello from card two.",
                    "mes_example": "",
                    "creator_notes": "Group E2E marker",
                    "system_prompt": "",
                    "post_history_instructions": "",
                    "alternate_greetings": [],
                    "tags": ["e2e"],
                    "creator": "LianYu E2E",
                    "character_version": "1.0",
                    "extensions": {},
                },
            }
            imported = api_multipart(
                "/api/character/import",
                "e2e-card-two.json",
                "application/json",
                json.dumps(second_card).encode("utf-8"),
                {"cityMode": "real", "city": "Shanghai"},
                auth_data["token"],
            )
            assert imported.get("code") == 200, imported
            created = api_request(
                "POST",
                "/api/conversation/group",
                {
                    "characterIds": [imported_character["id"], imported["data"]["id"]],
                    "title": "E2E Group",
                },
                auth_data["token"],
            )
            assert created.get("code") == 200, created
            group_conversation.update(created["data"])
            members = api_request(
                "GET",
                f"/api/conversation/group/{group_conversation['id']}/members",
                token=auth_data["token"],
            )
            assert members.get("code") == 200 and len(members.get("data") or []) == 2, members
            renamed = api_request(
                "PATCH",
                f"/api/conversation/group/{group_conversation['id']}/title",
                {"title": "E2E Group Renamed"},
                auth_data["token"],
            )
            assert renamed.get("code") == 200, renamed

            ws_url = re.sub(r"^http", "ws", BASE_URL) + "/ws"
            stomp_result = page.evaluate(
                r"""({ wsUrl, token, conversationId, provider }) => new Promise((resolve, reject) => {
                    const ws = new WebSocket(wsUrl)
                    const nul = String.fromCharCode(0)
                    const frame = (command, headers, body = '') => {
                      const lines = Object.entries(headers).map(([key, value]) => `${key}:${value}`)
                      return `${command}\n${lines.join('\n')}\n\n${body}${nul}`
                    }
                    const timer = setTimeout(() => {
                      ws.close()
                      reject(new Error('STOMP group message timeout'))
                    }, 20000)
                    ws.onerror = () => {
                      clearTimeout(timer)
                      reject(new Error('WebSocket connection failed'))
                    }
                    ws.onopen = () => ws.send(frame('CONNECT', {
                      'accept-version': '1.2',
                      'heart-beat': '0,0',
                      host: 'localhost',
                      token,
                    }))
                    ws.onmessage = event => {
                      const data = String(event.data || '')
                      if (data.startsWith('CONNECTED')) {
                        ws.send(frame('SUBSCRIBE', {
                          id: 'e2e-sub',
                          destination: `/topic/group/${conversationId}`,
                          ack: 'auto',
                        }))
                        setTimeout(() => ws.send(frame('SEND', {
                          destination: `/app/group/${conversationId}/send`,
                          'content-type': 'application/json',
                        }, JSON.stringify({
                          provider,
                          model: 'e2e-model',
                          content: '大家好，这是群聊端到端测试。',
                        }))), 150)
                      } else if (data.startsWith('ERROR')) {
                        clearTimeout(timer)
                        ws.close()
                        reject(new Error(data))
                      } else if (data.startsWith('MESSAGE') && data.includes('USER_MESSAGE')) {
                        clearTimeout(timer)
                        ws.close()
                        resolve(data)
                      }
                    }
                  })""",
                {
                    "wsUrl": ws_url,
                    "token": auth_data["token"],
                    "conversationId": group_conversation["id"],
                    "provider": vault_provider,
                },
            )
            assert "USER_MESSAGE" in stomp_result

            deadline = time.time() + 45
            records: list[dict] = []
            while time.time() < deadline:
                response = api_request(
                    "GET",
                    f"/api/conversation/{group_conversation['id']}/messages?limit=50",
                    token=auth_data["token"],
                )
                assert response.get("code") == 200, response
                records = (response.get("data") or {}).get("records") or []
                if any(record.get("role") == "ASSISTANT" for record in records):
                    break
                time.sleep(1)
            assert any(record.get("role") == "ASSISTANT" for record in records), records

        def test_home() -> None:
            goto_hash(page, "/app")
            expect_hash(page, "#/app")
            expect(page.locator(".home-page")).to_be_visible(timeout=15000)
            snap("05-home")

        def test_characters_page() -> None:
            goto_hash(page, "/app/characters")
            expect_hash(page, "#/app/characters")
            assert_page_title(page, "我的羁绊")
            expect(page.get_by_role("button", name="导入角色卡")).to_be_visible()
            snap("06-characters")

        def test_character_square() -> None:
            goto_hash(page, "/app/character-square")
            expect_hash(page, "#/app/character-square")
            assert_page_title(page, "角色广场")
            cards = page.locator(".template-card")
            empty = page.locator(".empty-state")
            if cards.count() == 0 and empty.count() == 0:
                err = page.locator(".el-message--error")
                if err.count():
                    raise AssertionError(f"Character square error: {err.first.inner_text()}")
            if cards.count():
                expect(cards.first).to_be_visible(timeout=5000)
            snap("07-character-square")

        def test_add_character_from_square() -> None:
            goto_hash(page, "/app/character-square")
            add_btn = page.get_by_role("button", name="加入我的角色")
            if add_btn.count() == 0:
                print("        [skip] no square templates available (API may be down)")
                return
            add_btn.click()
            dialog = page.locator(".el-message-box")
            expect(dialog).to_be_visible(timeout=10000)
            dialog.locator("input").fill("郑州")
            dialog.get_by_role("button", name=re.compile("确认|加入|确定")).click()
            page.wait_for_timeout(2000)
            success = page.locator(".el-message--success")
            if success.count():
                expect(success.first).to_be_visible(timeout=10000)
            confirm = page.locator(".el-message-box")
            if confirm.count() and confirm.is_visible():
                confirm.get_by_role("button", name=re.compile("取消|稍后|关闭")).first.click(timeout=5000)
            snap("08-after-add-character")

        def test_characters_has_entry() -> None:
            goto_hash(page, "/app/characters")
            cards = page.locator(".character-card")
            empty = page.locator(".empty-state")
            expect(cards.first.or_(empty.first)).to_be_visible(timeout=15000)

        def test_settings_page() -> None:
            goto_hash(page, "/app/settings")
            expect_hash(page, "#/app/settings")
            assert_page_title(page, "设置")
            snap("09-settings")

        def test_profile_page() -> None:
            goto_hash(page, "/app/profile")
            expect_hash(page, "#/app/profile")
            assert_page_title(page, "个人资料")
            snap("10-profile")

        def test_memory_page() -> None:
            goto_hash(page, "/app/memory")
            expect_hash(page, "#/app/memory")
            expect(page.locator(".memory-page")).to_be_visible(timeout=15000)
            snap("11-memory")

        def test_group_chat_page() -> None:
            goto_hash(page, "/app/group-chat")
            expect_hash(page, "#/app/group-chat")
            expect(page.locator(".group-chat-page")).to_be_visible(timeout=15000)
            snap("12-group-chat")

        def test_moments_page() -> None:
            goto_hash(page, "/app/moments")
            expect_hash(page, "#/app/moments")
            expect(page.locator(".moments-page")).to_be_visible(timeout=15000)
            snap("13-moments")

        def test_diary_page() -> None:
            goto_hash(page, "/app/diary")
            expect_hash(page, "#/app/diary")
            expect(page.locator(".diary-page")).to_be_visible(timeout=15000)
            snap("14-diary")

        def test_ai_models_api() -> None:
            resp = api_request(
                "GET",
                f"/api/ai/models?provider={vault_provider}",
                token=auth_data["token"],
            )
            assert resp.get("code") == 200, resp
            assert any(model.get("id") == "e2e-model" for model in resp.get("data") or []), resp

        def test_start_chat_if_character_exists() -> None:
            goto_hash(page, "/app/characters")
            chat_btn = page.get_by_role("button", name=re.compile("聊天|对话|继续"))
            if chat_btn.count() == 0:
                card = page.locator(".character-card, .char-card, .companion-card, .char-list-item").first
                if card.count():
                    card.click()
                    page.wait_for_timeout(800)
            chat_btn = page.get_by_role("button", name=re.compile("聊天|对话|继续"))
            if chat_btn.count() == 0:
                return
            chat_btn.first.click()
            page.wait_for_url(re.compile(r"#/app/chat/"), timeout=15000)
            expect(page.locator(".chat-page, .chat-view, .companion-page").first).to_be_visible(timeout=15000)
            snap("15-chat")

        def test_logout() -> None:
            goto_hash(page, "/app")
            page.locator("button.header-avatar").click()
            page.locator(".el-dropdown-menu__item").filter(has_text="退出登录").click()
            confirm = page.locator(".el-message-box")
            expect(confirm).to_be_visible(timeout=5000)
            confirm.locator("button").filter(has_text="退出登录").click()
            page.wait_for_url(re.compile(r"#/$|#/login"), timeout=15000)
            encrypted_token = page.evaluate("() => localStorage.getItem('_ltt')")
            assert not encrypted_token, "Encrypted token should be cleared after logout"
            snap("16-after-logout")

        def test_login_existing_user() -> None:
            goto_hash(page, "/login")
            page.locator('input[autocomplete="username"]').fill(username)
            page.locator('input[autocomplete="current-password"]').fill(PASSWORD)
            fill_captcha(page)
            page.locator("button.submit-btn").click()
            page.wait_for_url(re.compile(r"#/app"), timeout=20000)
            snap("17-login-again")

        steps = [
            ("Landing page loads", test_landing),
            ("Captcha API (GET /api/auth/captcha)", test_captcha_api),
            ("Login page + captcha widget", test_login_page),
            ("Register page + captcha widget", test_register_page),
            ("Register UI form (secondary)", test_register_ui_form),
            ("Register user via API", test_register_via_api),
            ("Inject session + open /app", test_session_injection),
            ("Authenticated API (GET /api/character)", test_authenticated_api),
            ("OpenAI-compatible local provider", test_openai_compatible_vault),
            ("SillyTavern character card JSON round-trip", test_character_card_round_trip),
            ("Memory privacy, recall and bulk-delete APIs", test_memory_privacy_api),
            ("Single chat + memory extraction + recall audit", test_chat_and_memory_recall),
            ("Group chat CRUD + authenticated STOMP message", test_group_chat_flow),
            ("Home dashboard", test_home),
            ("Characters page", test_characters_page),
            ("Character square catalog", test_character_square),
            ("Add character from square", test_add_character_from_square),
            ("Characters list has entry", test_characters_has_entry),
            ("Settings page", test_settings_page),
            ("Profile page", test_profile_page),
            ("Memory page", test_memory_page),
            ("Group chat page", test_group_chat_page),
            ("Moments page", test_moments_page),
            ("Diary page", test_diary_page),
            ("AI models API", test_ai_models_api),
            ("Open chat from character", test_start_chat_if_character_exists),
            ("Logout", test_logout),
            ("Login with registered user", test_login_existing_user),
        ]

        print(f"\nLianYu E2E — base URL: {BASE_URL}")
        print(f"Test user: {username}\n")
        print(f"Mock OpenAI: {mock_ai_base_url}\n")
        for name, fn in steps:
            run.record(name, fn)
            if not run.results[-1].passed:
                snap(f"fail-{len(run.results)}")

        browser.close()

    report_path = os.path.join(SCREENSHOT_DIR, "report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "baseUrl": BASE_URL,
                "mockAiBaseUrl": mock_ai_base_url,
                "username": username,
                "passed": run.passed,
                "failed": run.failed,
                "results": [r.__dict__ for r in run.results],
            },
            f,
            ensure_ascii=False,
            indent=2,
        )
    print(f"\nReport: {report_path}")
    print(f"Screenshots: {SCREENSHOT_DIR}")
    if mock_server is not None:
        mock_server.shutdown()
        mock_server.server_close()
    return run


if __name__ == "__main__":
    result = run_tests()
    print(f"\n{'=' * 50}")
    print(f"TOTAL: {result.passed} passed, {result.failed} failed / {len(result.results)} run")
    print(f"{'=' * 50}\n")
    if result.failed:
        for r in result.results:
            if not r.passed:
                print(f"  - {r.name}: {r.detail}")
        sys.exit(1)
    sys.exit(0)
