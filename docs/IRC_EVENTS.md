# Twitch IRC Event Samples

> **Purpose:** Real IRC event samples for testing and documentation
> **Last Updated:** 2026-01-28
> **Captured from:** instafluff, tarik

These are real IRC messages captured from Twitch chat. Use them for:
- Unit test inputs
- Documentation examples
- Parser verification

---

## JOIN

### self

**Raw IRC:**
```

```

**Parsed Tags:**
```json
{}
```

**Handler Args:**
```json
{
  "handler": "onJoin",
  "args": {
    "user": "instafluff",
    "self": true
  },
  "extra": {
    "channel": "instafluff",
    "roomId": ""
  }
}
```

---

## ROOMSTATE

### modes

**Raw IRC:**
```

```

**Parsed Tags:**
```json
{}
```

**Handler Args:**
```json
{
  "handler": "onChatMode",
  "args": {
    "modes": {
      "emoteOnly": false,
      "followerOnly": false,
      "subOnly": false,
      "r9kMode": false,
      "slowMode": false
    },
    "channel": "instafluff"
  }
}
```

---

## PRIVMSG

### mod

**Raw IRC:**
```

```

**Parsed Tags:**
```json
{
  "badge-info": "",
  "badges": "moderator/1,bot-badge/1",
  "color": "#1976D2",
  "display-name": "Fossabot",
  "emotes": "",
  "first-msg": "0",
  "flags": "",
  "id": "50b30470-badb-41d8-973f-6f96ec86d381",
  "mod": "1",
  "returning-chatter": "0",
  "room-id": "36340781",
  "subscriber": "0",
  "tmi-sent-ts": "1769564082484",
  "turbo": "0",
  "user-id": "237719657",
  "user-type": "mod"
}
```

**Handler Args:**
```json
{
  "handler": "onChat",
  "args": {
    "user": "Fossabot",
    "message": "GAMBA Locked! 🔒 👀 - the choice with most wagered",
    "flags": {
      "broadcaster": false,
      "mod": true,
      "vip": false,
      "subscriber": false,
      "founder": false,
      "highlighted": false,
      "customReward": false
    },
    "self": false
  },
  "extra": {
    "id": "50b30470-badb-41d8-973f-6f96ec86d381",
    "channel": "tarik",
    "roomId": "36340781",
    "userId": "237719657",
    "displayName": "Fossabot"
  }
}
```

---

### regular

**Raw IRC:**
```

```

**Parsed Tags:**
```json
{
  "badge-info": "",
  "badges": "streamer-awards-2024/1",
  "client-nonce": "332be3fe348f49298efb87300a073242",
  "color": "#DAA520",
  "display-name": "theonedeel",
  "emotes": "",
  "first-msg": "0",
  "flags": "",
  "id": "aa529bf3-aa17-45a2-977c-d5d3003d2e55",
  "mod": "0",
  "returning-chatter": "0",
  "room-id": "36340781",
  "subscriber": "0",
  "tmi-sent-ts": "1769564083143",
  "turbo": "0",
  "user-id": "447827340",
  "user-type": ""
}
```

**Handler Args:**
```json
{
  "handler": "onChat",
  "args": {
    "user": "theonedeel",
    "message": "LO",
    "flags": {
      "broadcaster": false,
      "mod": false,
      "vip": false,
      "subscriber": false,
      "founder": false,
      "highlighted": false,
      "customReward": false
    },
    "self": false
  },
  "extra": {
    "id": "aa529bf3-aa17-45a2-977c-d5d3003d2e55",
    "channel": "tarik",
    "roomId": "36340781",
    "userId": "447827340",
    "displayName": "theonedeel"
  }
}
```

---

### subscriber

**Raw IRC:**
```

```

**Parsed Tags:**
```json
{
  "badge-info": "predictions/no kekw,subscriber/4",
  "badges": "predictions/pink-2,subscriber/3,twitch-recap-2023/1",
  "client-nonce": "961F1EE3-A623-4457-A5D8-90367F1BD663",
  "color": "#D78986",
  "display-name": "sockfairy",
  "emotes": "",
  "first-msg": "0",
  "flags": "",
  "id": "1ec0b684-4c10-4e0b-a6a6-517e349973e2",
  "mod": "0",
  "returning-chatter": "0",
  "room-id": "36340781",
  "subscriber": "1",
  "tmi-sent-ts": "1769564097871",
  "turbo": "0",
  "user-id": "518405260",
  "user-type": ""
}
```

**Handler Args:**
```json
{
  "handler": "onChat",
  "args": {
    "user": "sockfairy",
    "message": "let unc cook HOLD",
    "flags": {
      "broadcaster": false,
      "mod": false,
      "vip": false,
      "subscriber": true,
      "founder": false,
      "highlighted": false,
      "customReward": false
    },
    "self": false
  },
  "extra": {
    "id": "1ec0b684-4c10-4e0b-a6a6-517e349973e2",
    "channel": "tarik",
    "roomId": "36340781",
    "userId": "518405260",
    "displayName": "sockfairy"
  }
}
```

---

### command

**Raw IRC:**
```

```

**Parsed Tags:**
```json
{
  "badge-info": "subscriber/2",
  "badges": "subscriber/0,premium/1",
  "client-nonce": "064f33e361cb463188272eb3741c8d37",
  "color": "",
  "display-name": "YoriichiWas",
  "emotes": "",
  "first-msg": "0",
  "flags": "",
  "id": "601da6df-37d2-458d-bf86-9a8377fd4fec",
  "mod": "0",
  "returning-chatter": "0",
  "room-id": "36340781",
  "subscriber": "1",
  "tmi-sent-ts": "1769564109780",
  "turbo": "0",
  "user-id": "418906214",
  "user-type": ""
}
```

**Handler Args:**
```json
{
  "handler": "onCommand",
  "args": {
    "user": "YoriichiWas",
    "command": "rank",
    "message": "",
    "flags": {
      "broadcaster": false,
      "mod": false,
      "vip": false,
      "subscriber": true,
      "founder": false,
      "highlighted": false,
      "customReward": false
    }
  },
  "extra": {
    "sinceLastCommand": {
      "any": 0,
      "user": 0
    }
  }
}
```

---

### mod,subscriber

**Raw IRC:**
```

```

**Parsed Tags:**
```json
{
  "badge-info": "subscriber/56",
  "badges": "moderator/1,subscriber/48,gamerduo/1",
  "client-nonce": "7ab389e3fdee4181bc910efbce5ec138",
  "color": "#00FFCF",
  "display-name": "dexterityCS",
  "emotes": "",
  "first-msg": "0",
  "flags": "",
  "id": "9b927357-e6dc-4ae0-aabe-0bbae552b989",
  "mod": "1",
  "returning-chatter": "0",
  "room-id": "36340781",
  "subscriber": "1",
  "tmi-sent-ts": "1769564147624",
  "turbo": "0",
  "user-id": "36451482",
  "user-type": "mod"
}
```

**Handler Args:**
```json
{
  "handler": "onChat",
  "args": {
    "user": "dexterityCS",
    "message": "alright everyone hope u guys have a good night, st",
    "flags": {
      "broadcaster": false,
      "mod": true,
      "vip": false,
      "subscriber": true,
      "founder": false,
      "highlighted": false,
      "customReward": false
    },
    "self": false
  },
  "extra": {
    "id": "9b927357-e6dc-4ae0-aabe-0bbae552b989",
    "channel": "tarik",
    "roomId": "36340781",
    "userId": "36451482",
    "displayName": "dexterityCS"
  }
}
```

---

