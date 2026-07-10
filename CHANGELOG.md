# Changelog

All notable changes to this project are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and releases use semantic versioning.

## [Unreleased]

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
