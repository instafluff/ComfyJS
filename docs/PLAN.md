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

**Key insight**: OBS browser sources are completely isolated processes. They cannot use SharedWorker, BroadcastChannel, or localStorage to communicate with each other.

### Solutions (v2.0 Implementation)

#### 1. Smart EventSub with Graceful Degradation

```typescript
// ComfyJS v2 will attempt EventSub, but gracefully handle failures
ComfyJS.Init("channel", "oauth:xxx", {
  useEventSub: true,        // Try EventSub first
  eventSubFallback: "irc",  // Fall back to IRC for basic events
  eventSubRetryMs: 0        // Don't retry if connection limit hit (0 = disabled)
});
```

When EventSub connection fails with limit error:
1. Log a clear warning explaining the limit
2. Fall back to IRC-only mode (chat, commands, basic events still work)
3. Only channel points, polls, predictions, hype trains affected
4. User can fix by reducing browser sources

#### 2. Dedicated "Hub" Pattern (Recommended for OBS)

For users who NEED channel points in multiple browser sources:

**Browser Source 1 (Hub)** - The only one that connects to EventSub:
```html
<script src="comfy.min.js"></script>
<script>
  ComfyJS.Init("channel", "oauth:xxx", { useEventSub: true });
  
  // Broadcast events to other sources via localStorage
  ComfyJS.onReward = function(user, reward, cost, message, extra) {
    localStorage.setItem("comfyjs_event", JSON.stringify({
      type: "reward",
      data: { user, reward, cost, message, extra },
      timestamp: Date.now()
    }));
  };
</script>
```

**Browser Source 2, 3, 4... (Listeners)** - IRC only, receive events via localStorage:
```html
<script src="comfy.min.js"></script>
<script>
  // Don't use EventSub - listen to localStorage instead
  ComfyJS.Init("channel", "oauth:xxx", { useEventSub: false });
  
  // Listen for events from the hub
  window.addEventListener("storage", function(e) {
    if (e.key === "comfyjs_event") {
      var event = JSON.parse(e.newValue);
      if (event.type === "reward" && Date.now() - event.timestamp < 5000) {
        // Handle the reward
        handleReward(event.data);
      }
    }
  });
</script>
```

**Note**: localStorage events work across OBS browser sources if they share the same origin (which they do when using the same HTML files or custom dock URLs).

#### 3. Connection Limit Detection

ComfyJS v2 will detect and report connection limit issues:

```typescript
ComfyJS.onError = function(error, context) {
  if (error.code === "EVENTSUB_CONNECTION_LIMIT") {
    console.warn(
      "EventSub connection limit reached (max 3 per user).\n" +
      "This usually happens with multiple OBS browser sources.\n" +
      "Options:\n" +
      "  1. Use the Hub pattern (one source with EventSub, others listen)\n" +
      "  2. Reduce number of browser sources\n" +
      "  3. Continue without EventSub features (channel points, etc.)"
    );
  }
};
```

### IRC-Only Mode (No EventSub Limits)

For simple use cases, IRC has no practical connection limits:

```typescript
ComfyJS.Init("channel", "oauth:xxx", { useEventSub: false });

// These still work perfectly:
ComfyJS.onCommand = function(user, command, message, flags, extra) {};
ComfyJS.onChat = function(user, message, flags, self, extra) {};
ComfyJS.onSub = function(user, message, subTierInfo, extra) {};
ComfyJS.onCheer = function(user, message, bits, flags, extra) {};
ComfyJS.onRaid = function(user, viewers, extra) {};
```

### What Requires EventSub (Cannot Fall Back to IRC)

| Feature | Requires EventSub | Alternative |
|---------|-------------------|-------------|
| Channel Point Redemptions | ✅ Yes | Hub pattern or single source |
| Hype Train Events | ✅ Yes | Hub pattern or single source |
| Polls | ✅ Yes | Hub pattern or single source |
| Predictions | ✅ Yes | Hub pattern or single source |
| Shoutouts | ✅ Yes | Hub pattern or single source |
| Whispers | ✅ Yes* | IRC whispers (deprecated) |
| Chat Messages | No (IRC) | - |
| Commands | No (IRC) | - |
| Subs/Resubs | No (IRC USERNOTICE) | - |
| Cheers | No (IRC USERNOTICE) | - |
| Raids | No (IRC USERNOTICE) | - |
| Bans/Timeouts | No (IRC CLEARCHAT) | - |

### Future Enhancements (v2.1+)

1. **Auto-detect Hub**: ComfyJS instances could auto-negotiate which becomes the hub
2. **Conduit Support**: For server-side applications, support Twitch Conduits for unlimited scale
3. **WebSocket Proxy**: Optional local WebSocket server that acts as EventSub hub

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
