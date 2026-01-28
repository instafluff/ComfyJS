# ComfyJS v2 - TypeScript Migration Plan

> **Branch:** v2  
> **Started:** January 27, 2026  
> **Last Updated:** January 28, 2026  
> **Status:** ✅ Core Implementation Complete

---

## Design Principles

1. **SIMPLE** - The codebase should be cleaner and potentially simpler than v1
2. **NO TMI.JS** - Handle IRC WebSocket directly (fewer dependencies = less complexity)
3. **MINIMAL FILES** - Keep files to a minimum, but split if it improves clarity
4. **BACKWARD COMPATIBLE** - Existing v1 code must work without changes
5. **PARITY FIRST** - Every v1 feature must work identically before adding new ones
6. **INTUITIVE** - Just as easy to use as v1, maybe even easier

---

## Implementation Status

### ✅ Completed

| Component | File | Lines | Status |
|-----------|------|-------|--------|
| Type Definitions | `src/types.ts` | ~450 | ✅ Complete |
| IRC Parsers | `src/parsers.ts` | ~305 | ✅ Complete + Tests |
| IRC WebSocket Client | `src/irc.ts` | ~330 | ✅ Complete + Tests |
| EventSub WebSocket | `src/eventsub.ts` | ~330 | ✅ Complete |
| P2P Coordination | `src/p2p.ts` | ~730 | ⏳ Pending OBS testing |
| Twitch REST API | `src/api.ts` | ~280 | ✅ Complete |
| Main Entry Point | `src/index.ts` | ~1000 | ✅ Complete |
| **Total** | | **~3075** | |

### ✅ Build Output

| File | Size | Purpose |
|------|------|---------|
| `dist/comfy.js` | 80KB | ESM for modern bundlers |
| `dist/comfy.js.map` | 200KB | Source map |
| `dist/comfy.cjs` | 82KB | CommonJS for Node.js |
| `dist/comfy.cjs.map` | 200KB | Source map |
| `dist/comfy.min.js` | 38KB | Minified IIFE for browsers |
| `dist/comfy.min.js.map` | 197KB | Source map |
| `dist/*.d.ts` | - | TypeScript declarations |

### ✅ Tests

| Test File | Tests | Status |
|-----------|-------|--------|
| `src/parsers.test.ts` | 41 | ✅ All passing |
| `src/irc.test.ts` | 13 | ✅ All passing |
| `src/events.test.ts` | 30 | ✅ All passing (real IRC data) |
| **Total** | **84** | ✅ |

### ✅ Examples

| File | Purpose |
|------|--------|
| `examples/v2-test.html` | Browser test page with full UI |
| `examples/test-node.mjs` | Node.js CLI test script |
| `examples/live-test.mjs` | Live IRC parity verification |
| `examples/capture-events.mjs` | Real event capture for testing |

---

## Files to Clean Up (v1 Legacy)

The following files are from v1 and can be archived or removed:

| File | Purpose | Action |
|------|---------|--------|
| `app.js` | v1 main file (1456 lines) | Keep as reference, exclude from npm |
| `test.js` | v1 test file | Replace with new tests |
| `version.js` | Version injection script | May not be needed |
| `_publish.sh` | Old publish script | Review and update |
| `build/` | Old build output | Remove (using dist/) |
| `vendor/tmi.min.js` | tmi.js bundle | Remove (no longer used) |
| `types/index.d.ts` | Old type definitions | Replace with auto-generated |

---

## Architecture

```
ComfyJS/
├── src/
│   ├── index.ts          # Main entry - ComfyJS object & exports
│   ├── irc.ts            # IRC WebSocket client
│   ├── eventsub.ts       # EventSub WebSocket client
│   ├── p2p.ts            # WebRTC P2P coordination
│   ├── api.ts            # Twitch REST API calls
│   ├── parsers.ts        # IRC message parsers
│   ├── types.ts          # TypeScript interfaces
│   ├── parsers.test.ts   # Parser unit tests
│   └── irc.test.ts       # IRC client unit tests
├── dist/                 # Build output (auto-generated)
├── examples/
│   ├── v2-test.html      # Browser test page
│   └── test-node.mjs     # Node.js test script
├── docs/
│   └── PLAN.md           # This file
├── package.json
├── tsconfig.json
└── README.md
```

---

## Multi-Instance Solution (WebRTC P2P)

### The Problem

When multiple ComfyJS instances run from the same computer (common with OBS browser sources):

- **EventSub limit**: 3 WebSocket connections per user token
- **OBS browser sources**: Isolated CEF processes (no shared storage)
- **Result**: 4+ browser sources = EventSub connection failures

### The Solution

ComfyJS v2 uses **WebRTC DataChannels** with **IRC signaling**:

1. First instance becomes **leader** and connects to EventSub
2. Additional instances become **followers** and connect via WebRTC
3. Leader broadcasts events to all followers via DataChannel
4. IRC is used for signaling (no external server needed!)

```
┌─────────────────────────────────────────────────────────────────┐
│                        TWITCH                                   │
│    ┌──────────────┐              ┌──────────────┐               │
│    │  IRC Server  │              │EventSub Server│              │
│    └──────┬───────┘              └───────┬──────┘               │
└───────────┼──────────────────────────────┼──────────────────────┘
            │                              │
            │ (all sources)                │ (leader only!)
            │                              │
┌───────────┼──────────────────────────────┼──────────────────────┐
│           ▼                              ▼                      │
│  ┌────────────────────────────────────────────┐                 │
│  │        BROWSER SOURCE 1 (Leader)           │                 │
│  │   IRC ──► Parser ──► Events                │                 │
│  │   EventSub ──► Events ──► WebRTC Host      │                 │
│  └───────────────────┬────────────────────────┘                 │
│                      │ WebRTC DataChannel                       │
│       ┌──────────────┼──────────────┐                           │
│       ▼              ▼              ▼                           │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                      │
│  │ Source2 │    │ Source3 │    │ Source4 │  (followers)         │
│  └─────────┘    └─────────┘    └─────────┘                      │
│                                                                 │
│                     LOCAL MACHINE                               │
└─────────────────────────────────────────────────────────────────┘
```

### Discovery Protocol (via localStorage)

OBS browser sources share the same CEF profile directory, meaning localStorage is shared between all sources. We use this for WebRTC signaling:

```typescript
// Leader writes to localStorage
localStorage['comfyjs_leader'] = {
  id: 'abc123',
  channel: 'channelname',
  timestamp: Date.now()
};

// Follower writes its peer entry
localStorage['comfyjs_peer_def456'] = {
  id: 'def456',
  leaderId: 'abc123',
  timestamp: Date.now(),
  offer: null,        // Leader will write offer here
  answer: null,       // Follower writes answer here
  leaderIce: [],      // Leader writes ICE candidates here
  followerIce: []     // Follower writes ICE candidates here
};

// Both sides poll localStorage every 500ms for updates
// Once WebRTC DataChannel opens, direct P2P communication begins
```

### How It Works

1. **First Load**: No leader found → become leader, write to `comfyjs_leader`
2. **Leader**: Polls for new peer entries, initiates WebRTC connections
3. **Follower**: Creates peer entry, waits for offer in localStorage
4. **Handshake**: Offer/answer/ICE candidates exchanged via localStorage polling
5. **Connection**: DataChannel opens, leader broadcasts events to followers
6. **Heartbeat**: Leader updates timestamp every 3s, times out after 10s
7. **Failover**: If leader dies, first follower to detect becomes new leader

### Why localStorage Works

- OBS uses a single CEF (Chromium Embedded Framework) installation
- All browser sources share the same profile data directory
- localStorage is persisted to disk and shared across processes
- Storage events don't fire across processes, but polling works fine

**Note**: This approach is specifically designed for OBS browser sources.
Regular browser tabs can use storage events for instant updates.

---

## IRC Protocol (Replacing tmi.js)

### Connection Flow

```
1. Connect to wss://irc-ws.chat.twitch.tv:443
2. Send: CAP REQ :twitch.tv/membership twitch.tv/tags twitch.tv/commands
3. Send: PASS oauth:<token>
4. Send: NICK <username>
5. Wait for: :tmi.twitch.tv 001 <user> :Welcome, GLHF!
6. Send: JOIN #<channel>
7. Handle: PING :tmi.twitch.tv → respond PONG :tmi.twitch.tv
```

### Rate Limits Enforced

| Limit | Value | Implementation |
|-------|-------|----------------|
| IRC Messages | 20/30s (non-mod) | ✅ Tracked in `irc.ts` |
| IRC Messages | 100/30s (mod) | ✅ Tracked in `irc.ts` |
| IRC Join | 20/10s | ✅ Tracked in `irc.ts` |
| EventSub Connections | 3 per user token | ✅ Solved via P2P |
| EventSub Subscriptions | 300/connection | ✅ Tracked in `eventsub.ts` |

---

## v1 API Parity

### Event Handlers

| Handler | Status | Notes |
|---------|--------|-------|
| `onError` | ✅ | |
| `onCommand` | ✅ | |
| `onChat` | ✅ | |
| `onWhisper` | ✅ | Via EventSub |
| `onMessageDeleted` | ✅ | |
| `onBan` | ✅ | |
| `onTimeout` | ✅ | |
| `onJoin` | ✅ | |
| `onPart` | ✅ | |
| `onHosted` | ⚠️ | Deprecated by Twitch |
| `onRaid` | ✅ | |
| `onSub` | ✅ | |
| `onResub` | ✅ | |
| `onSubGift` | ✅ | |
| `onSubMysteryGift` | ✅ | |
| `onGiftSubContinue` | ✅ | |
| `onCheer` | ✅ | |
| `onChatMode` | ✅ | |
| `onReward` | ✅ | Via EventSub |
| `onShoutout` | ✅ | Via EventSub |
| `onHypeTrain` | ✅ | Via EventSub |
| `onPoll` | ✅ | Via EventSub |
| `onPrediction` | ✅ | Via EventSub |
| `onConnected` | ✅ | |
| `onReconnect` | ✅ | |

### Methods

| Method | Status | Notes |
|--------|--------|-------|
| `Init()` | ✅ | Now async |
| `Say()` | ✅ | |
| `Reply()` | ✅ | |
| `Whisper()` | ⚠️ | Deprecated (use API) |
| `Announce()` | ✅ | |
| `DeleteMessage()` | ✅ | Via API |
| `GetClient()` | ✅ | Returns IRCClient |
| `Disconnect()` | ✅ | |
| `GetChannelRewards()` | ✅ | |
| `CreateChannelReward()` | ✅ | |
| `UpdateChannelReward()` | ✅ | |
| `DeleteChannelReward()` | ✅ | |

### Properties

| Property | Status |
|----------|--------|
| `isDebug` | ✅ |
| `useEventSub` | ✅ |
| `chatModes` | ✅ |
| `version()` | ✅ |

---

## Testing Instructions

### Run Unit Tests

```bash
npm test          # Watch mode
npm run test:run  # Single run
```

### Test in Browser

1. Build: `npm run build`
2. Open `examples/v2-test.html` in browser
3. Enter channel and optional OAuth token
4. Click Connect
5. Test chat, commands, rewards, etc.

### Test in Node.js

```bash
# Anonymous (read-only)
node examples/test-node.mjs instafluff

# Authenticated
node examples/test-node.mjs instafluff oauth:your_token_here
```

---

## Remaining Tasks

### High Priority

- [x] **Real-world IRC testing** - ✅ Verified with live Twitch (xqc channel)
- [x] **Real-world EventSub testing** - ✅ Verified polls, predictions, rewards on instafluff
- [x] **P2P signaling validation** - ✅ localStorage approach works in browsers
- [ ] **P2P OBS testing** - Test in real OBS browser sources
- [ ] **Integration test** - Full end-to-end with real Twitch account

### Medium Priority

- [ ] **More unit tests** - EventSub, P2P, API modules
- [ ] **Update README.md** - Usage docs for v2
- [x] **Clean up v1 files** - ✅ Archived to archive/v1/
- [ ] **npm publish config** - Verify package.json exports

### Low Priority

- [ ] **v2 new features** - onFollow, onStreamOnline, etc.
- [ ] **Performance benchmarks** - Compare to v1
- [ ] **Browser compatibility testing** - Safari, Firefox, Edge

---

## Version History

| Date | Changes |
|------|---------|
| 2026-01-27 | Created initial plan |
| 2026-01-28 | Completed core implementation |
| 2026-01-28 | Added unit tests (51 passing) |
| 2026-01-28 | Added source maps to all builds |
| 2026-01-28 | Added browser and Node.js test examples |
| 2026-01-28 | Updated PLAN.md with implementation status |
| 2026-01-28 | Replaced IRC P2P signaling with localStorage approach |
| 2026-01-28 | Added live-test.mjs, verified IRC parity |
| 2026-01-28 | Fixed UserExtra parity (54 tests passing) || 2026-01-28 | Added events.test.ts with real IRC data (84 tests) |
| 2026-01-28 | EventSub live testing: polls, predictions, rewards ✅ |
| 2026-01-28 | Added onRawMessage handler for unknown IRC commands |
| 2026-01-28 | Captured NOTICE events (emote_only, r9k modes) |