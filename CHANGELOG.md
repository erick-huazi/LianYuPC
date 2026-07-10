# Changelog

All notable changes to this project are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and releases use semantic versioning.

## [Unreleased]

## [0.3.0-rc.2] - 2026-07-10

### Added

- Isolated production deployment for `amiweave.com` with Cloudflare and HTTPS.
- macOS x64 and arm64 DMG/ZIP artifacts in the tag-driven release workflow.
- Combined SHA-256 checksums for all desktop release artifacts.

### Changed

- Public desktop branding, installer names, icon, and documentation now use Amiweave.
- Desktop packages connect to `https://amiweave.com` by default.
- macOS packages now receive the same ASAR integrity marker as Windows packages.
- Desktop build scripts now resolve Electron's platform-specific executable path, including the macOS app bundle.
- macOS packaging uses the official builder binary releases and writes ASAR integrity data inside the app bundle.
- Windows executables now embed Amiweave product, company, icon, and version metadata.
- Debugger-pause detection no longer mistakes normal startup stalls for an attached debugger.
- Launcher packaging checks now wait briefly for the rendered interaction hitbox instead of relying on a fixed delay.

## [0.3.0-rc.1] - 2026-07-10

First public release candidate prepared for maintainers to publish.

### Added

- SillyTavern Character Card V1/V2 import and V2 PNG/JSON export.
- Pluggable memory vector-store interface with a SQL-only fallback.
- Lite Docker Compose mode without Milvus or TLS certificates.
- Memory recall audit records that never store the raw user query.
- Per-character memory privacy toggle and bulk memory deletion.
- Opt-in private-network support for local OpenAI-compatible providers.
- CI and tag-driven GitHub Release workflows.
- Desktop/mobile screenshots and an 18-second product demo video.

### Changed

- Frontend lockfile is synchronized with `package.json` for reproducible installs.
- Local bootstrap generates random development credentials automatically.
- Desktop foreground-window detection uses the maintained `get-windows` API.
- Patched frontend sanitizer, localization, HTTP, and multipart dependencies.
