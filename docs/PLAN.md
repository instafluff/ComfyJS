# ComfyJS v2 - TypeScript Migration Plan

> **Branch:** v2  
> **Started:** January 27, 2026  
> **Philosophy:** Keep it simple, clean, and maintainable

---

## Design Principles

1. **SIMPLE** - The codebase should be cleaner and potentially simpler than v1
2. **NO TMI.JS** - Handle IRC WebSocket directly (fewer dependencies = less complexity)
3. **MINIMAL FILES** - Keep files to a minimum, but split if it improves clarity
4. **BACKWARD COMPATIBLE** - Existing v1 code must work without changes
5. **PARITY FIRST** - Every v1 feature must work identically before adding new ones
6. **INTUITIVE** - Just as easy to use as v1, maybe even easier

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

## New Architecture (Minimal & Clean)

```
ComfyJS/
├── src/
│   ├── index.ts          # Main entry - ComfyJS object & exports (~300 lines)
│   ├── irc.ts            # IRC WebSocket client (~250 lines)
│   ├── eventsub.ts       # EventSub WebSocket client (~250 lines)
│   ├── api.ts            # Twitch API calls (~100 lines)
│   ├── parsers.ts        # IRC message & EventSub payload parsers (~200 lines)
│   └── types.ts          # TypeScript interfaces (~150 lines)
├── types/
│   └── index.d.ts        # Type definitions for JS users (auto-generated)
├── dist/
│   ├── comfy.js          # Browser bundle (ESM + UMD)
│   ├── comfy.min.js      # Minified browser bundle  
│   └── comfy.cjs         # Node.js CommonJS
├── test/
│   ├── irc.test.ts       # IRC parser tests
│   ├── eventsub.test.ts  # EventSub handler tests
│   └── fixtures/         # Real message samples
├── package.json
├── tsconfig.json
└── README.md
```

**Total: ~1250 lines of TypeScript** across 6 small, focused files.

Each file has ONE job:
- **index.ts** - Public API (Init, Say, onChat, etc.)
- **irc.ts** - Talk to IRC WebSocket
- **eventsub.ts** - Talk to EventSub WebSocket  
- **api.ts** - Talk to REST API
- **parsers.ts** - Parse all message formats
- **types.ts** - All TypeScript types

---

## File Responsibilities

### src/index.ts (Main Entry)
```typescript
// The ComfyJS object that users interact with
const ComfyJS = {
  // Configuration
  isDebug: false,
  useEventSub: true,
  
  // Event handlers (users override these)
  onChat: null,
  onCommand: null,
  onReward: null,
  // ... etc
  
  // Methods
  Init(channel, oauth, options) { ... },
  Say(message, channel) { ... },
  Disconnect() { ... },
  // ... etc
};

export default ComfyJS;
```

### src/irc.ts (IRC Client)
```typescript
// Handles: wss://irc-ws.chat.twitch.tv:443
export class IRCClient {
  connect(channel: string, oauth: string): Promise<void>;
  disconnect(): void;
  send(message: string): void;
  join(channel: string): void;
  part(channel: string): void;
  
  // Events
  onMessage: (parsed: IRCMessage) => void;
  onConnected: () => void;
  onDisconnected: () => void;
}
```

### src/eventsub.ts (EventSub Client)
```typescript
// Handles: wss://eventsub.wss.twitch.tv/ws
export class EventSubClient {
  connect(oauth: string): Promise<string>; // Returns session ID
  disconnect(): void;
  subscribe(type: string, condition: object): Promise<void>;
  
  // Events  
  onNotification: (type: string, event: object) => void;
  onError: (error: Error) => void;
}
```

### src/parsers.ts (Message Parsers)
```typescript
// Parse IRC messages
export function parseIRCMessage(raw: string): IRCMessage;
export function parseIRCTags(tagString: string): Record<string, string>;

// Parse specific IRC events
export function parseUserNotice(msg: IRCMessage): SubEvent | CheerEvent | RaidEvent;
export function parseClearChat(msg: IRCMessage): BanEvent | TimeoutEvent;

// Parse EventSub payloads
export function parseEventSubNotification(payload: object): ComfyEvent;
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
- [ ] Implement graceful degradation (fall back to IRC on connection limit)
- [ ] Implement event handlers:
  - [ ] channel.channel_points_custom_reward_redemption.add → onReward
  - [ ] channel.hype_train.begin/progress/end → onHypeTrain
  - [ ] channel.shoutout.create/receive → onShoutout
  - [ ] channel.poll.begin/progress/end → onPoll
  - [ ] channel.prediction.begin/progress/lock/end → onPrediction
  - [ ] user.whisper.message → onWhisper
  - [ ] channel.follow → onFollow (v2 NEW!)
  - [ ] channel.subscribe → onSubscribe (EventSub version)
  - [ ] channel.subscription.gift → onSubGift (EventSub version)
  - [ ] channel.cheer → onCheer (EventSub version)  
  - [ ] channel.raid → onRaid (EventSub version)
  - [ ] channel.ban → onBan (EventSub version)
  - [ ] channel.charity_campaign.donate → onCharityDonation (NEW!)
  - [ ] stream.online/offline → onStreamChange (NEW!)
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

### Event Handlers (v1 Parity)
- [ ] `onError(error)`
- [ ] `onCommand(user, command, message, flags, extra)`
- [ ] `onChat(user, message, flags, self, extra)`
- [ ] `onWhisper(user, message, flags, self, extra)`
- [ ] `onMessageDeleted(id, extra)`
- [ ] `onBan(bannedUsername, extra)`
- [ ] `onTimeout(timedOutUsername, durationInSeconds, extra)`
- [ ] `onJoin(user, self, extra)`
- [ ] `onPart(user, self, extra)`
- [ ] `onHosted(user, viewers, autohost, extra)` *(deprecated by Twitch)*
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

### NEW Event Handlers (v2 Additions)
- [ ] `onFollow(user, extra)` - New follower (requires moderator:read:followers scope)
- [ ] `onStreamOnline(channel, extra)` - Broadcaster went live
- [ ] `onStreamOffline(channel, extra)` - Broadcaster ended stream
- [ ] `onCharityDonation(user, charity, amount, extra)` - User donated to charity campaign
- [ ] `onBitsUsed(user, bits, type, extra)` - Bits used (cheer, power-up, combo)
- [ ] `onAdBreak(duration, isAutomatic, extra)` - Ad break started
- [ ] `onShoutoutReceived(fromChannel, viewerCount, extra)` - Received a shoutout
- [ ] `onVIPAdd(user, extra)` - User became VIP
- [ ] `onVIPRemove(user, extra)` - User no longer VIP
- [ ] `onModAdd(user, extra)` - User became moderator
- [ ] `onModRemove(user, extra)` - User no longer moderator

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

### The Problem

When multiple ComfyJS instances run from the same computer (common with OBS browser sources):

| Limit | Value | Impact |
|-------|-------|--------|
| **EventSub WebSocket connections** | 3 max per user token | 4+ browser sources = connection failures |
| **EventSub subscriptions** | 300 per connection | Usually not a problem |
| **IRC join rate** | 20 channels per 10 seconds | Usually not a problem |
| **IRC message rate** | 20/30s (non-mod), 100/30s (mod) | Shared across all instances |

**Key insight**: OBS browser sources use Chromium Embedded Framework (CEF) with **completely isolated processes**. They do NOT share:
- ❌ localStorage (each source has its own)
- ❌ BroadcastChannel (requires same browsing context)
- ❌ SharedWorker (requires same browsing context)
- ❌ Cookies or session storage

This means browser-based communication patterns don't work between OBS sources.

### Solutions (v2.0 Implementation)

#### 1. Simplest: Just Use IRC (Recommended for Most Users)

Most popular events work perfectly over IRC with **no connection limits**:

```typescript
ComfyJS.Init("channel", "oauth:xxx", { useEventSub: false });

// All of these work via IRC - no EventSub needed!
ComfyJS.onCommand = (user, command, message, flags, extra) => { };
ComfyJS.onChat = (user, message, flags, self, extra) => { };
ComfyJS.onSub = (user, message, subTierInfo, extra) => { };
ComfyJS.onResub = (user, message, streakMonths, cumulativeMonths, subTierInfo, extra) => { };
ComfyJS.onSubGift = (gifterUser, streakMonths, recipientUser, senderCount, subTierInfo, extra) => { };
ComfyJS.onCheer = (user, message, bits, flags, extra) => { };
ComfyJS.onRaid = (user, viewers, extra) => { };
ComfyJS.onBan = (bannedUsername, extra) => { };
ComfyJS.onTimeout = (timedOutUsername, durationInSeconds, extra) => { };
```

**Have 10 browser sources?** No problem - IRC handles it.

#### 2. Smart EventSub with Graceful Degradation

ComfyJS will attempt EventSub but gracefully handle connection limits:

```typescript
ComfyJS.Init("channel", "oauth:xxx", {
  useEventSub: true,        // Try EventSub first
  eventSubFallback: "irc",  // Fall back to IRC for basic events
});
```

When EventSub connection fails with limit error:
1. Log a clear warning explaining the limit
2. Fall back to IRC-only mode (chat, commands, subs, cheers still work)
3. Only channel points, polls, predictions, hype trains affected

#### 3. Local Hub Server (For Channel Points Across Multiple Sources)

For users who NEED channel points/polls/predictions in multiple browser sources, we'll provide a tiny local relay server:

```bash
# Install and run the hub (one time, keeps running)
npx comfyjs-hub --oauth=oauth:xxx --channel=yourchannel

# Hub runs on ws://localhost:9001
# Holds the SINGLE EventSub connection
# Broadcasts events to all connected browser sources
```

**Browser sources connect to the hub instead of Twitch:**
```html
<script src="comfy.min.js"></script>
<script>
  // Connect to local hub instead of Twitch directly
  ComfyJS.Init("channel", null, { 
    hubUrl: "ws://localhost:9001"
  });
  
  // All events work - hub forwards them
  ComfyJS.onReward = (user, reward, cost, message, extra) => {
    // This works in ALL browser sources simultaneously!
  };
</script>
```

**Hub architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                    comfyjs-hub (Node.js)                    │
│                   runs on localhost:9001                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐                         │
│  │ IRC Client  │    │ EventSub    │  ← Single connections   │
│  │ (1 conn)    │    │ (1 conn)    │    to Twitch            │
│  └──────┬──────┘    └──────┬──────┘                         │
│         │                  │                                │
│         └────────┬─────────┘                                │
│                  ▼                                          │
│         ┌───────────────┐                                   │
│         │ Event Router  │                                   │
│         └───────────────┘                                   │
│                  │                                          │
│    ┌─────────────┼─────────────┬─────────────┐             │
│    ▼             ▼             ▼             ▼             │
│ ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐              │
│ │ WS 1 │    │ WS 2 │    │ WS 3 │    │ WS N │  ← Browser   │
│ └──────┘    └──────┘    └──────┘    └──────┘    sources   │
└─────────────────────────────────────────────────────────────┘
      │             │             │             │
      ▼             ▼             ▼             ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ OBS Src1 │ │ OBS Src2 │ │ OBS Src3 │ │ OBS SrcN │
│ (alerts) │ │ (chat)   │ │ (points) │ │ (etc)    │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

#### 4. Designate One "Master" Source

Simple manual approach - one source handles EventSub features:

**Source 1 (Master) - Has EventSub:**
```javascript
ComfyJS.Init("channel", "oauth:xxx", { useEventSub: true });
ComfyJS.onReward = (user, reward, cost, message, extra) => {
  // Handle channel points HERE only
};
```

**Sources 2, 3, 4... - IRC only:**
```javascript
ComfyJS.Init("channel", "oauth:xxx", { useEventSub: false });
// These still get chat, commands, subs, cheers, raids
```

### Connection Limit Detection

ComfyJS v2 will detect and report connection limit issues clearly:

```typescript
ComfyJS.onError = function(error, context) {
  if (error.code === "EVENTSUB_CONNECTION_LIMIT") {
    console.warn(
      "⚠️ EventSub connection limit reached (max 3 per user).\n" +
      "This usually happens with multiple OBS browser sources.\n\n" +
      "Options:\n" +
      "  1. Use IRC-only mode: ComfyJS.Init(ch, oauth, { useEventSub: false })\n" +
      "  2. Run comfyjs-hub locally: npx comfyjs-hub --oauth=xxx\n" +
      "  3. Designate one source as 'master' for EventSub features\n\n" +
      "Most features (chat, commands, subs, cheers) work fine without EventSub!"
    );
  }
};
```

### What Requires EventSub (Cannot Fall Back to IRC)

| Feature | Requires EventSub | Works in IRC | Notes |
|---------|-------------------|--------------|-------|
| Chat Messages | No | ✅ Yes | - |
| Commands (!cmd) | No | ✅ Yes | - |
| Subs/Resubs | No | ✅ Yes | Via USERNOTICE |
| Gift Subs | No | ✅ Yes | Via USERNOTICE |
| Cheers | No | ✅ Yes | Via USERNOTICE |
| Raids | No | ✅ Yes | Via USERNOTICE |
| Bans/Timeouts | No | ✅ Yes | Via CLEARCHAT |
| **Channel Point Redemptions** | ✅ Yes | ❌ No | Use hub or master source |
| **Hype Train Events** | ✅ Yes | ❌ No | Use hub or master source |
| **Polls** | ✅ Yes | ❌ No | Use hub or master source |
| **Predictions** | ✅ Yes | ❌ No | Use hub or master source |
| **Shoutouts** | ✅ Yes | ❌ No | Use hub or master source |
| Follows | ✅ Yes | ❌ No | Requires mod scope |
| Stream Online/Offline | ✅ Yes | ❌ No | - |

### Future: WebRTC P2P (v2.1+)

A more advanced solution could use WebRTC for browser-to-browser communication:

1. First browser source to load becomes the "host"
2. Subsequent sources discover host via a simple signaling mechanism
3. P2P connections established between sources
4. Host forwards EventSub events to peers

This is complex to implement reliably but eliminates the need for a local server.

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
