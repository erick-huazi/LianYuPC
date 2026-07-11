# Amiweave Privacy Policy

Effective date: July 11, 2026

This policy describes how the Amiweave desktop client and the hosted service at
`amiweave.com` handle personal data. A self-hosted deployment is controlled by
its operator, who is responsible for its own privacy notice and data handling.

## Data We Process

Amiweave may process the following data when you choose to use the related
features:

- account information, such as username, nickname, avatar, and authentication
  records;
- characters, conversations, relationship state, long-term memories, recall
  audit records, diaries, moments, and user-uploaded files;
- AI provider configuration and API credentials, which are encrypted at rest;
- technical and security data, such as IP address, request time, trace ID,
  device identifier, rate-limit state, and error information; and
- an active-window title and a screen image when desktop observation is
  explicitly enabled.

Desktop observation is disabled by default. When enabled, a screen image and
window title are sent to the configured vision model to generate a contextual
response. Amiweave processes the image for that request and does not store the
screen image as a user content record. The configured AI provider may process
it under that provider's own terms and privacy policy.

## How We Use Data

We process data to provide authentication, character chat, memory, relationship
features, proactive companion features, file delivery, abuse prevention,
security monitoring, troubleshooting, and service maintenance. Amiweave does
not sell personal data and does not include advertising or third-party
behavioral analytics SDKs.

## Service Providers And AI Providers

The hosted service uses infrastructure and network providers, including
Cloudflare and a server hosted in Singapore. Requests sent to an AI provider
may contain prompts, conversation context, selected memories, character data,
and optional desktop-observation content needed to produce a response.

Users can select an OpenAI-compatible provider or a local provider. Those
providers are independent data processors with their own terms. Self-hosted
operators choose and control their infrastructure and providers.

## Retention And User Controls

Data is kept while needed to provide the service or until it is deleted by the
user or operator, subject to security, backup, and legal requirements. Memory
recall audit records have a default retention period of 30 days. The product
provides controls to disable long-term memory, delete individual memories,
clear memories and recall records, delete conversations and characters, and
remove AI credentials.

For a hosted-service access or deletion request that cannot be completed in the
product, contact the maintainers privately through a GitHub private
vulnerability report:

https://github.com/erick-huazi/LianYuPC/security/advisories/new

Do not include passwords, API keys, conversation content, or other sensitive
data in a public GitHub issue.

## Security

Amiweave uses TLS for the hosted service, encrypted storage for AI credentials,
access controls, rate limits, and release checksums. No system can guarantee
absolute security. Security issues should be reported according to
[SECURITY.md](SECURITY.md).

## International Processing

The hosted service is operated from infrastructure in Singapore and may use
providers in other countries. By choosing a remote AI provider, users direct
Amiweave to send the required request data to that provider's location.

## Changes

Material changes to this policy will be published in this repository with an
updated effective date.
