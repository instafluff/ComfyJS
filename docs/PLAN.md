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

**Also important**: Browsers cannot run WebSocket servers - they can only be clients.

### Solution: WebRTC P2P with IRC Signaling (v2.0)

ComfyJS v2 will use **WebRTC DataChannels** to share events between browser sources, with **Twitch IRC as the signaling channel**. No external server required!

#### How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TWITCH                                         │
│  ┌─────────────────────┐        ┌─────────────────────┐                 │
│  │   IRC Server        │        │   EventSub Server   │                 │
│  │ irc-ws.chat.twitch  │        │ eventsub.wss.twitch │                 │
│  └─────────┬───────────┘        └──────────┬──────────┘                 │
└────────────┼───────────────────────────────┼────────────────────────────┘
             │                               │
             │ (all sources)                 │ (leader only)
             │                               │
┌────────────┼───────────────────────────────┼────────────────────────────┐
│            │         LOCAL MACHINE         │                            │
│            ▼                               ▼                            │
│  ┌──────────────────────────────────────────────┐                       │
│  │           BROWSER SOURCE 1 (Leader)          │                       │
│  │  ┌────────────┐    ┌─────────────────────┐   │                       │
│  │  │ IRC Client │    │ EventSub Client     │   │                       │
│  │  └────────────┘    └──────────┬──────────┘   │                       │
│  │         │                     │              │                       │
│  │         │ signaling    events │              │                       │
│  │         ▼                     ▼              │                       │
│  │  ┌─────────────────────────────────────┐     │                       │
│  │  │         WebRTC Host                 │     │                       │
│  │  │   (accepts peer connections)        │     │                       │
│  │  └─────────────┬───────────────────────┘     │                       │
│  └────────────────┼─────────────────────────────┘                       │
│                   │ WebRTC DataChannel (P2P)                            │
│       ┌───────────┼───────────┬───────────┐                             │
│       ▼           ▼           ▼           ▼                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│  │ Source2 │ │ Source3 │ │ Source4 │ │ SourceN │  (followers)           │
│  │  (peer) │ │  (peer) │ │  (peer) │ │  (peer) │                        │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘                        │
│       │           │           │           │                             │
│       ▼           ▼           ▼           ▼                             │
│   [alerts]    [chat box]  [rewards]   [game]     ← Your OBS scenes     │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Signaling via IRC (The Clever Part)

WebRTC requires a "signaling" step to exchange connection info. We use IRC:

```typescript
// Leader announces itself with a special message (not visible in chat)
// Uses IRC tags to mark it as ComfyJS internal
@comfyjs-signal=leader;instance-id=abc123 PRIVMSG #channel :​

// Followers see this and know not to connect to EventSub
// They send their WebRTC offer to the leader
@comfyjs-signal=offer;to=abc123;sdp=... PRIVMSG #channel :​

// Leader responds with answer
@comfyjs-signal=answer;to=def456;sdp=... PRIVMSG #channel :​

// ICE candidates exchanged similarly
@comfyjs-signal=ice;to=abc123;candidate=... PRIVMSG #channel :​
```

These messages:
- Use zero-width spaces so they appear empty if somehow displayed
- Are filtered out by ComfyJS and never trigger onChat
- Only visible to other ComfyJS instances on same channel

#### Leader Election & Discovery

```typescript
// On Init, each instance:
1. Generate unique instance ID
2. Connect to IRC
3. Broadcast "looking for leader" message
4. Wait 2 seconds for response

5. If leader responds:
   - Don't connect to EventSub
   - Initiate WebRTC connection to leader
   - Receive events via DataChannel

6. If no response (no leader exists):
   - Become leader
   - Connect to EventSub  
   - Start accepting WebRTC peer connections
   - Respond to future discovery requests

// Leader behavior (ongoing):
- Respond immediately to "looking for leader" messages
- Send heartbeat every 30 seconds (backup, in case response missed)
- If leader disconnects, followers detect via WebRTC close
- First follower to detect becomes new leader
```

**Discovery Protocol:**
```
// New source broadcasts discovery request
@comfyjs-signal=discover;instance-id=def456 PRIVMSG #channel :​

// Leader responds (within milliseconds)
@comfyjs-signal=leader;instance-id=abc123;reply-to=def456 PRIVMSG #channel :​

// Periodic heartbeat (every 30s, backup mechanism)
@comfyjs-signal=heartbeat;instance-id=abc123 PRIVMSG #channel :​
```

**Why this works:**
- New sources always find existing leader (via discovery request)
- If leader misses a discovery (rare), heartbeat catches it
- Leader responds immediately, so connection is fast
- Heartbeats are infrequent (30s) to minimize IRC usage

#### User Experience (Zero Config!)

```javascript
// This just works - even with 10 browser sources!
ComfyJS.Init("channel", "oauth:xxx");

// All events work in ALL sources
ComfyJS.onReward = (user, reward, cost, message, extra) => {
  // Channel points work everywhere!
  // Only leader talks to Twitch, others get events via P2P
};

ComfyJS.onChat = (user, message, flags, self, extra) => {
  // IRC events come directly (all sources connect to IRC)
};
```

#### Fallback Behavior

```typescript
ComfyJS.Init("channel", "oauth:xxx", {
  p2pMode: "auto"      // Default: auto-negotiate leader/follower
  // p2pMode: "leader" // Force this instance to be leader
  // p2pMode: "follower" // Force this instance to be follower
  // p2pMode: "disabled" // Don't use P2P, each instance independent
});
```

If WebRTC fails (some networks block it):
1. Log warning
2. Fall back to independent mode
3. Only first 3 sources get EventSub, others IRC-only

#### Technical Details

**WebRTC DataChannel** is perfect for this:
- Works in all modern browsers (including CEF/OBS)
- Low latency (faster than going through a server)
- Reliable ordered delivery option
- No server required once connection established

**Message Format** (over DataChannel):
```typescript
{
  type: "event",
  name: "onReward",
  args: [user, reward, cost, message, extra],
  timestamp: 1706438400000
}
```

**Deduplication**:
- Each event has unique ID from Twitch
- Followers ignore events they've already seen
- Handles leader failover without duplicate events

### What Requires P2P/EventSub vs IRC-Only

| Feature | Source | P2P Benefit |
|---------|--------|-------------|
| Chat Messages | IRC | None (all get directly) |
| Commands | IRC | None (all get directly) |
| Subs/Resubs | IRC | None (all get directly) |
| Gift Subs | IRC | None (all get directly) |
| Cheers | IRC | None (all get directly) |
| Raids | IRC | None (all get directly) |
| Bans/Timeouts | IRC | None (all get directly) |
| **Channel Points** | EventSub | ✅ All sources get events |
| **Hype Train** | EventSub | ✅ All sources get events |
| **Polls** | EventSub | ✅ All sources get events |
| **Predictions** | EventSub | ✅ All sources get events |
| **Shoutouts** | EventSub | ✅ All sources get events |
| **Follows** | EventSub | ✅ All sources get events |
| **Stream Status** | EventSub | ✅ All sources get events |

### Why This Approach is Good

1. **Zero config** - Users just use ComfyJS.Init() as normal
2. **No external server** - Everything runs in browser
3. **Automatic** - Leader election and failover handled transparently
4. **Fast** - WebRTC is lower latency than going through a relay
5. **Scalable** - Works with any number of browser sources
6. **Graceful degradation** - Falls back if WebRTC unavailable

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
