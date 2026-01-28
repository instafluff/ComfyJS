# ComfyJS v2 Parity Testing

> **Purpose:** Track and verify that v2 matches v1 behavior exactly for all events
> **Last Updated:** January 28, 2026

---

## Event Handler Parity Status

| Event | v1 Handler | v2 Status | Tested Live |
|-------|------------|-----------|-------------|
| Chat | `onChat(user, message, flags, self, extra)` | ✅ | ✅ |
| Command | `onCommand(user, command, message, flags, extra)` | ✅ | ✅ |
| Whisper | `onWhisper(user, message, flags, self, extra)` | ✅ | ❌ |
| Sub | `onSub(user, message, subTierInfo, extra)` | ✅ | ❌ |
| Resub | `onResub(user, message, streakMonths, cumulativeMonths, subTierInfo, extra)` | ✅ | ✅ |
| SubGift | `onSubGift(gifterUser, streakMonths, recipientUser, senderCount, subTierInfo, extra)` | ✅ | ❌ |
| SubMysteryGift | `onSubMysteryGift(gifterUser, numbOfSubs, senderCount, subTierInfo, extra)` | ✅ | ❌ |
| GiftSubContinue | `onGiftSubContinue(user, sender, extra)` | ✅ | ❌ |
| Cheer | `onCheer(user, message, bits, flags, extra)` | ✅ | ❌ |
| Raid | `onRaid(user, viewers, extra)` | ✅ | ❌ |
| Join | `onJoin(user, self, extra)` | ✅ | ✅ |
| Part | `onPart(user, self, extra)` | ✅ | ❌ |
| Ban | `onBan(bannedUsername, extra)` | ✅ | ❌ |
| Timeout | `onTimeout(timedOutUsername, durationInSeconds, extra)` | ✅ | ❌ |
| MessageDeleted | `onMessageDeleted(id, extra)` | ✅ | ❌ |
| ChatMode | `onChatMode(flags, channel)` | ✅ | ✅ |
| Reward | `onReward(user, reward, cost, message, extra)` | ✅ | ❌ |
| Shoutout | `onShoutout(channel, viewerCount, timeRemaining, extra)` | ✅ | ❌ |
| HypeTrain | `onHypeTrain(type, level, progress, goal, total, timeRemaining, extra)` | ✅ | ❌ |
| Poll | `onPoll(type, title, choices, votes, timeRemaining, extra)` | ✅ | ❌ |
| Prediction | `onPrediction(type, title, outcomes, topPredictors, timeRemaining, extra)` | ✅ | ❌ |
| Connected | `onConnected(address, port, isFirstConnect)` | ✅ | ✅ |
| Reconnect | `onReconnect(reconnectCount)` | ✅ | ❌ |

---

## Detailed Field Comparisons

### onChat / onCommand

**Handler Signature:**
```javascript
// v1
onChat(user, message, flags, self, extra)
onCommand(user, command, message, flags, extra)
```

**flags object (v1):**
```javascript
{
  broadcaster: boolean,  // "#" + username === channel
  mod: boolean,          // userstate["mod"]
  founder: boolean,      // badges.founder === "0"
  subscriber: boolean,   // isFounder || badges.subscriber || userstate.subscriber
  vip: boolean,          // badges.vip === "1"
  highlighted: boolean,  // msg-id === "highlighted-message"
  customReward: boolean  // !!custom-reward-id
}
```

**extra object (v1):**
```javascript
{
  id: string,            // messageId (userstate["id"])
  channel: string,       // channel without #
  roomId: string,        // userstate["room-id"]
  messageType: string,   // userstate["message-type"]
  messageEmotes: object, // userstate["emotes"]
  isEmoteOnly: boolean,  // userstate["emote-only"]
  userId: string,        // userstate["user-id"]
  username: string,      // userstate["username"]
  displayName: string,   // userstate["display-name"]
  userColor: string,     // userstate["color"]
  userBadges: object,    // userstate["badges"]
  userState: object,     // full userstate object
  customRewardId: string,// userstate["custom-reward-id"]
  flags: string,         // userstate["flags"] (automod flags)
  timestamp: string,     // userstate["tmi-sent-ts"]
  sinceLastCommand: {    // only for onCommand
    any: number,
    user: number
  }
}
```

**v2 Status:** ✅ MATCHES

---

### onSub

**Handler Signature:**
```javascript
// v1
onSub(user, message, subTierInfo, extra)
```

**subTierInfo (v1 - from tmi.js methods object):**
```javascript
{
  prime: boolean,        // plan === "Prime"
  plan: string,          // "Prime", "1000", "2000", "3000"
  planName: string       // "Channel Subscription", etc.
}
```

**extra object (v1):**
```javascript
{
  id: string,
  roomId: string,
  messageType: string,
  messageEmotes: object,
  userId: string,
  username: string,      // userstate["login"]
  displayName: string,
  userColor: string,
  userBadges: object,
  userState: object,
  channel: string
}
```

**v2 Status:** ⏳ Needs verification

---

### onResub

**Handler Signature:**
```javascript
// v1
onResub(user, message, streakMonths, cumulativeMonths, subTierInfo, extra)
```

- `streakMonths`: msg-param-streak-months (0 if not sharing)
- `cumulativeMonths`: msg-param-cumulative-months

**v2 Status:** ⏳ Needs verification

---

### onSubGift

**Handler Signature:**
```javascript
// v1
onSubGift(gifterUser, streakMonths, recipientUser, senderCount, subTierInfo, extra)
```

**extra object (v1) - additional fields:**
```javascript
{
  ...baseExtra,
  recipientDisplayName: string, // msg-param-recipient-display-name
  recipientUsername: string,    // msg-param-recipient-user-name
  recipientId: string           // msg-param-recipient-id
}
```

**v2 Status:** ⏳ Needs verification

---

### onSubMysteryGift

**Handler Signature:**
```javascript
// v1
onSubMysteryGift(gifterUser, numbOfSubs, senderCount, subTierInfo, extra)
```

**extra object (v1) - additional fields:**
```javascript
{
  ...baseExtra,
  userMassGiftCount: number  // msg-param-mass-gift-count
}
```

**v2 Status:** ⏳ Needs verification

---

### onCheer

**Handler Signature:**
```javascript
// v1
onCheer(user, message, bits, flags, extra)
```

**v2 Status:** ✅ Implementation complete, needs live testing

---

### onRaid

**Handler Signature:**
```javascript
// v1
onRaid(user, viewers, extra)
```

**extra object (v1):**
```javascript
{
  channel: string  // channel without #
}
```

**v2 Status:** ⏳ Needs verification (uses msg-param-viewerCount)

---

### onBan

**Handler Signature:**
```javascript
// v1
onBan(bannedUsername, extra)
```

**extra object (v1):**
```javascript
{
  roomId: string,
  username: string,
  bannedUserId: string  // target-user-id
}
```

**v2 Status:** ⏳ Needs verification

---

### onTimeout

**Handler Signature:**
```javascript
// v1
onTimeout(timedOutUsername, durationInSeconds, extra)
```

**extra object (v1):**
```javascript
{
  roomId: string,
  username: string,
  timedOutUserId: string  // target-user-id
}
```

**v2 Status:** ⏳ Needs verification

---

### onMessageDeleted

**Handler Signature:**
```javascript
// v1
onMessageDeleted(id, extra)
```

**extra object (v1):**
```javascript
{
  id: string,        // target-msg-id
  roomId: string,
  username: string,
  message: string    // the deleted message content
}
```

**v2 Status:** ⏳ Needs verification

---

## Live Testing Log

### Session 1 - January 28, 2026

**Channel:** xqc (anonymous)

| Time | Event | Status | Notes |
|------|-------|--------|-------|
| 02:08 | onConnected | ✅ | address, port, isFirst all correct |
| 02:08 | onJoin | ✅ | self=true for own join |
| 02:08 | onChatMode | ✅ | followerOnly, emoteOnly etc. correct |
| 02:08 | onChat | ✅ | flags.subscriber detected correctly |
| 02:08 | onCommand | ✅ | !lastseen detected, sinceLastCommand works |

**Next:** Need channels with active subs, cheers, raids, bans

---

## Channels for Testing

| Channel | Why | Events Expected |
|---------|-----|-----------------|
| xqc | Very active | chat, commands, subs, cheers |
| kai_cenat | Popular | subs, gifted subs, raids |
| pokimane | Active mods | bans, timeouts, deletions |
| ludwig | Events | polls, predictions |
| hasanabi | Active chat | all types |

---

## Issues Found

| Issue | Severity | Status | Fix |
|-------|----------|--------|-----|
| onRaid extra had full UserExtra | Medium | ✅ Fixed | Changed to `{ channel }` only |
| onCheer extra missing subscriber | Low | ✅ Fixed | Added subscriber field |
| onTimeout extra uses wrong field name | Low | ✅ Fixed | Uses timedOutUserId per v1 |
| onJoin/onPart extra had full UserExtra | Low | ✅ Fixed | Changed to `{ channel }` only |
| Extra type interfaces inconsistent | Low | ✅ Fixed | Added RaidExtra, BanExtra, TimeoutExtra, JoinPartExtra |
| onShoutout missing timeRemaining | Medium | ✅ Fixed | Added timeRemaining parameter |
| onHypeTrain missing timeRemaining | Medium | ✅ Fixed | Added timeRemaining parameter |
| onPoll had wrong signature | Medium | ✅ Fixed | Changed to (type, title, choices[], votes[], timeRemaining, extra) |
| onPrediction had wrong signature | Medium | ✅ Fixed | Changed to (type, title, outcomes[], topPredictors[][], timeRemaining, extra) |

