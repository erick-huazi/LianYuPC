# Amiweave Code Signing Policy

## Provider

Windows releases accepted into the open-source signing program use:

**Free code signing provided by SignPath.io, certificate by SignPath Foundation.**

The certificate is issued in SignPath Foundation's name. Until Amiweave is
accepted into the program, unsigned release candidates are explicitly marked
as unsigned and are not represented as SignPath-signed artifacts.

## Source And Build Origin

- Source repository: https://github.com/erick-huazi/LianYuPC
- Release downloads: https://github.com/erick-huazi/LianYuPC/releases
- License: Apache-2.0
- Trusted build system: GitHub Actions

Release artifacts are built from version tags by the repository's Release
workflow. The workflow verifies backend and frontend tests, validates project
versions, builds platform packages, and publishes SHA-256 checksums. SignPath
origin verification will be restricted to this repository and approved release
tags.

## Roles

- Committers and reviewers: [erick-huazi](https://github.com/erick-huazi).
  External contributions require review by a maintainer before merge.
- Signing approver: [erick-huazi](https://github.com/erick-huazi).
- Release builder: the repository's GitHub Actions Release workflow.

Maintainer-authored changes are subject to required automated checks. Signing
approval is granted only after the release commit, version tag, workflow result,
and artifact metadata have been reviewed.

## Release Signing Rules

1. A release tag must point to reviewed source on the repository's release
   branch.
2. Required CI and release verification jobs must pass.
3. Signing requests must originate from the configured GitHub Actions workflow.
4. Artifact product name and version metadata must match the release tag.
5. The signing approver checks the source revision and artifact identity before
   approving the request.
6. Published artifacts include checksums and a link to this policy.

Private signing keys are generated and retained by SignPath's protected signing
infrastructure. They are never stored in the source repository or GitHub Actions
secrets.

## Incident Response

If a signing credential, build workflow, maintainer account, or published
artifact is suspected to be compromised, maintainers will stop signing and
publishing, investigate the affected revisions, notify SignPath, request
certificate or signature revocation when required, and publish remediation
information through the repository's security and release channels.

Security reports should follow [SECURITY.md](SECURITY.md). Privacy practices are
described in [PRIVACY.md](PRIVACY.md).
