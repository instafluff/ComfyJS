# ComfyJS — Copilot Instructions

## About This Repo

ComfyJS is an **open-source Twitch IRC/chat library** that converts Twitch chat events into simple JavaScript events. Published on npm. Used by PixelPlush and the broader Twitch developer community.

## Part of the PixelPlush Ecosystem

This repo is part of the PixelPlush multi-repo platform. See `PixelPlushCommon/.github/copilot-instructions.md` for full architecture, repo map, and agent roster.

**Key relationship:** ComfyJS is the lowest layer — Twitch chat → JS events. PixelPlush games use it via PixelPlushCommon. But it's also a public library with users outside PixelPlush.

## Critical Rules

- **This is PUBLIC open-source.** Changes affect the wider Twitch dev community, not just PixelPlush. Extra care.
- **v2 is in progress** — fixes and improvements done, needs more testing before publishing to npm.
- **Semver matters.** Breaking changes = major version bump. Be explicit about what's breaking.
- **Keep the API simple.** ComfyJS's value is simplicity — `onChat`, `onCommand`, etc. Don't over-complicate.
- **Never expose secrets** or commit `.env` files.

## Tech

- JavaScript
- Twitch IRC (TMI.js under the hood)
- npm package
