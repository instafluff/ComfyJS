# ComfyJS v2 - TypeScript Migration Plan

> **Branch:** v2  
> **Started:** January 27, 2026  
> **Philosophy:** Keep it simple, clean, and maintainable

---

## Design Principles

1. **SIMPLE** - The codebase should be cleaner and potentially simpler than v1
2. **NO TMI.JS** - Handle IRC WebSocket directly (fewer dependencies = less complexity)
3. **SINGLE FILE ARCHITECTURE** - Keep the core logic in one main file like v1
4. **BACKWARD COMPATIBLE** - Existing v1 code must work without changes
5. **PARITY FIRST** - Every v1 feature must work identically before adding new ones

---

## Current v1 Analysis

### What v1 Does (app.js - 1456 lines)

| Component | Lines | Purpose |
|-----------|-------|---------|
| Timestamp tracking | 1-55 | Rate limit commands per user |
| Nonce generator | 57-64 | Random string for PubSub |
| OAuth validation | 66-90 | Validate tokens via Twitch API |
| Channel ID fetch | 92-111 | Get broadcaster ID from username |
| EventSub subscribe | 113-147 | Subscribe to EventSub events |
| EventSub WebSocket | 149-640 | Handle channel points, hype train, polls, etc. |
| PubSub WebSocket | 654-762 | Legacy channel points (fallback) |
| TMI.js integration | 764-1380 | Chat messages, commands, subs, cheers, etc. |
| API functions | 1382-1450 | Reward management CRUD |

### Dependencies to Remove

| Package | Why Remove | Replacement |
|---------|------------|-------------|
| `tmi.js` | Large, we only use basic IRC | Direct WebSocket to `wss://irc-ws.chat.twitch.tv:443` |
| `node-fetch` | Node 18+ has native fetch | Native `fetch` (polyfill for old Node) |

---

## New Architecture (Simple)

```
ComfyJS/
├── src/
│   └── comfy.ts          # SINGLE MAIN FILE (~800-1000 lines)
├── types/
│   └── index.d.ts        # Type definitions (keep existing, update)
├── dist/
│   ├── comfy.js          # Browser bundle
│   ├── comfy.min.js      # Minified browser bundle  
│   └── comfy.node.js     # Node.js CommonJS
├── test/
│   ├── comfy.test.ts     # Main test file
│   └── fixtures/         # Test data (IRC messages, EventSub payloads)
├── package.json
├── tsconfig.json
└── README.md
```

**Total new files: 3** (comfy.ts, comfy.test.ts, tsconfig.json)

---

## The Single File (src/comfy.ts)

Structure within the file:

```typescript
// ═══════════════════════════════════════════════════════════════
// COMFY.JS v2 - Twitch Chat & Events Made Easy
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
// TYPES (inline, not separate files)
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// UTILITIES (nonce, timestamps, environment detection)
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// IRC CLIENT (replaces tmi.js - ~200 lines)
// - Connect to wss://irc-ws.chat.twitch.tv:443
// - PASS, NICK, CAP REQ
// - PING/PONG keepalive
// - JOIN/PART channels
// - PRIVMSG send/receive
// - Parse IRC tags
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// EVENTSUB CLIENT (~200 lines)
// - Connect to wss://eventsub.wss.twitch.tv/ws
// - Handle welcome, keepalive, reconnect
// - Subscribe to events based on scopes
// - Parse notifications
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// TWITCH API (~100 lines)
// - OAuth validation
// - Get user/channel info
// - Reward CRUD
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// COMFYJS MAIN OBJECT (~300 lines)
// - All event handlers (onCommand, onChat, etc.)
// - All methods (Init, Say, Reply, etc.)
// - Backward compatible API
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// EXPORTS (CommonJS, ESM, Browser global)
// ─────────────────────────────────────────────────────────────────
```

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

### Message Parsing
```
Input:  @badge-info=;badges=broadcaster/1;color=#0000FF;display-name=User;...
        :user!user@user.tmi.twitch.tv PRIVMSG #channel :Hello world

Parse:  tags     = { badge-info: "", badges: "broadcaster/1", ... }
        prefix   = "user!user@user.tmi.twitch.tv"
        command  = "PRIVMSG"
        channel  = "#channel"
        message  = "Hello world"
```

---

## Rate Limits to Enforce

| Limit | Value | Scope |
|-------|-------|-------|
| IRC Messages | 20/30s (non-mod) | Per channel |
| IRC Messages | 100/30s (mod) | Per channel |
| IRC Join | 20/10s | Per connection |
| EventSub Connections | 3 max | Per user/IP |
| EventSub Subscriptions | 300/connection | Per WebSocket |

**Simple approach:** Track message timestamps in an array, check before sending.

---

## Migration Phases

### Phase 1: Setup (Day 1) ✅ CURRENT
- [x] Create PLAN.md
- [ ] Create minimal tsconfig.json
- [ ] Update package.json (minimal changes)
- [ ] Create src/comfy.ts skeleton

### Phase 2: IRC Client (Days 2-3)
- [ ] Implement WebSocket connection
- [ ] Implement authentication (PASS, NICK, CAP)
- [ ] Implement PING/PONG
- [ ] Implement JOIN/PART
- [ ] Implement PRIVMSG send/receive
- [ ] Implement IRC tag parser
- [ ] Test: Connect to real Twitch IRC

### Phase 3: Message Handlers (Days 4-5)
- [ ] Parse PRIVMSG → onChat, onCommand
- [ ] Parse USERNOTICE → onSub, onResub, onSubGift, onCheer, onRaid
- [ ] Parse CLEARCHAT → onBan, onTimeout
- [ ] Parse CLEARMSG → onMessageDeleted
- [ ] Parse ROOMSTATE → onChatMode
- [ ] Parse JOIN/PART → onJoin, onPart
- [ ] Test: Verify parity with v1 for all events

### Phase 4: EventSub (Days 6-7)
- [ ] Implement EventSub WebSocket connection
- [ ] Handle session_welcome → subscribe to events
- [ ] Handle session_keepalive
- [ ] Handle session_reconnect
- [ ] Implement event handlers:
  - [ ] channel.channel_points_custom_reward_redemption.add → onReward
  - [ ] channel.hype_train.* → onHypeTrain
  - [ ] channel.shoutout.create → onShoutout
  - [ ] channel.poll.* → onPoll
  - [ ] channel.prediction.* → onPrediction
  - [ ] user.whisper.message → onWhisper
- [ ] Test: Verify parity with v1 EventSub

### Phase 5: API & Methods (Day 8)
- [ ] Implement Say(), Reply(), Whisper(), Announce()
- [ ] Implement DeleteMessage()
- [ ] Implement GetChannelRewards(), CreateChannelReward(), etc.
- [ ] Implement Disconnect()
- [ ] Test: All methods work

### Phase 6: Build & Compatibility (Day 9)
- [ ] Build Node.js CommonJS output
- [ ] Build browser bundle (IIFE)
- [ ] Test: `require("comfy.js")` works
- [ ] Test: `<script src="comfy.min.js">` works
- [ ] Test: Existing v1 code works unchanged

### Phase 7: Testing & Polish (Day 10)
- [ ] Write unit tests for IRC parser
- [ ] Write unit tests for EventSub handlers
- [ ] Integration test with real Twitch account
- [ ] Performance comparison with v1
- [ ] Update README.md
- [ ] Tag v2.0.0 release

---

## v1 API Parity Checklist

### Event Handlers
- [ ] `onError(error)`
- [ ] `onCommand(user, command, message, flags, extra)`
- [ ] `onChat(user, message, flags, self, extra)`
- [ ] `onWhisper(user, message, flags, self, extra)`
- [ ] `onMessageDeleted(id, extra)`
- [ ] `onBan(bannedUsername, extra)`
- [ ] `onTimeout(timedOutUsername, durationInSeconds, extra)`
- [ ] `onJoin(user, self, extra)`
- [ ] `onPart(user, self, extra)`
- [ ] `onHosted(user, viewers, autohost, extra)`
- [ ] `onRaid(user, viewers, extra)`
- [ ] `onSub(user, message, subTierInfo, extra)`
- [ ] `onResub(user, message, streakMonths, cumulativeMonths, subTierInfo, extra)`
- [ ] `onSubGift(gifterUser, streakMonths, recipientUser, senderCount, subTierInfo, extra)`
- [ ] `onSubMysteryGift(gifterUser, numbOfSubs, senderCount, subTierInfo, extra)`
- [ ] `onGiftSubContinue(user, sender, extra)`
- [ ] `onCheer(user, message, bits, flags, extra)`
- [ ] `onChatMode(flags, channel)`
- [ ] `onReward(user, reward, cost, message, extra)`
- [ ] `onShoutout(channelDisplayName, viewerCount, timeRemainingInMS, extra)`
- [ ] `onHypeTrain(type, level, progress, goal, total, timeRemainingInMS, extra)`
- [ ] `onPoll(type, title, choices, votes, timeRemainingInMS, extra)`
- [ ] `onPrediction(type, title, outcomes, topPredictors, timeRemainingInMS, extra)`
- [ ] `onConnected(address, port, isFirstConnect)`
- [ ] `onReconnect(reconnectCount)`

### Methods
- [ ] `Init(username, password, channels, isDebug)`
- [ ] `Say(message, channel)`
- [ ] `Reply(parentId, message, channel)`
- [ ] `Whisper(message, user)`
- [ ] `Announce(message, channel, color)`
- [ ] `DeleteMessage(id, channel)`
- [ ] `GetClient()` - Returns internal client (may differ from v1)
- [ ] `Disconnect()`
- [ ] `GetChannelRewards(clientId, manageableOnly)`
- [ ] `CreateChannelReward(clientId, rewardInfo)`
- [ ] `UpdateChannelReward(clientId, rewardId, rewardInfo)`
- [ ] `DeleteChannelReward(clientId, rewardId)`

### Properties
- [ ] `isDebug`
- [ ] `useEventSub`
- [ ] `chatModes`
- [ ] `version()`

---

## Multi-Instance Considerations

When multiple ComfyJS instances run from the same computer:

### Problem
- Same IP → shared rate limits
- EventSub: Max 3 WebSocket connections per user
- IRC: 20 joins per 10 seconds

### Simple Solution (for v2.0)
1. **Document the limits** clearly in README
2. **Expose rate limit state** so users can check before connecting
3. **Add connection options** to reuse existing connections (future v2.1)

Not over-engineering this in v2.0. Users with advanced needs can:
- Use different OAuth tokens
- Stagger connections
- Run on different machines

---

## Testing Strategy

### Unit Tests (test/comfy.test.ts)
```typescript
describe('IRC Parser', () => {
  it('parses PRIVMSG with tags', () => { ... })
  it('parses USERNOTICE for subs', () => { ... })
  // etc.
})

describe('EventSub Parser', () => {
  it('handles channel.channel_points_custom_reward_redemption.add', () => { ... })
  // etc.
})
```

### Integration Tests (manual)
1. Connect to Twitch IRC as test account
2. Send !test command
3. Verify onCommand fires with correct data
4. Compare output with v1

### Test Fixtures
Save real IRC messages and EventSub payloads in `test/fixtures/` for unit tests.

---

## Success Criteria

1. **Parity**: All v1 handlers fire with identical data
2. **Simplicity**: Main file < 1000 lines
3. **Size**: Bundle smaller than v1 (no tmi.js = big win)
4. **Speed**: Equal or better connection time
5. **Compatibility**: `var ComfyJS = require("comfy.js")` works
6. **Clean**: Easy to read and understand

---

## Progress Tracking

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Setup | 🚧 In Progress | |
| Phase 2: IRC Client | ⏳ Pending | |
| Phase 3: Message Handlers | ⏳ Pending | |
| Phase 4: EventSub | ⏳ Pending | |
| Phase 5: API & Methods | ⏳ Pending | |
| Phase 6: Build & Compatibility | ⏳ Pending | |
| Phase 7: Testing & Polish | ⏳ Pending | |

---

## Commits

Each phase completion = 1 commit to v2 branch

```
git commit -m "feat(v2): Phase 1 - project setup"
git commit -m "feat(v2): Phase 2 - IRC WebSocket client"
...
```
