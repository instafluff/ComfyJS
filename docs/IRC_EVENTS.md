# Twitch IRC Event Samples

> **Purpose:** Real IRC event samples for testing and documentation
> **Last Updated:** 2026-01-28
> **Captured from:** instafluff, xqc, hasanabi, summit1g, tarik, shroud, pokimane, lirik, timthetatman, nickmercs, sodapoppin, ludwig, mizkif, nmplol, trainwreckstv

These are real IRC messages captured from Twitch chat. Use them for:
- Unit test inputs
- Documentation examples
- Parser verification

---

## UNKNOWN/CAP

### unknown

**Raw IRC:**
```
:tmi.twitch.tv CAP * ACK :twitch.tv/membership twitch.tv/tags twitch.tv/commands
```

**Parsed Tags:**
```json
{}
```

**Handler Args:**
```json
{
  "handler": "none",
  "note": "No handler for this IRC command",
  "parsed": {
    "command": "CAP",
    "prefix": "tmi.twitch.tv",
    "channel": null,
    "message": "twitch.tv/membership twitch.tv/tags twitch.tv/comm",
    "params": [
      "*",
      "ACK",
      "twitch.tv/membership twitch.tv/tags twitch.tv/commands"
    ]
  }
}
```

---

## UNKNOWN/GLOBALUSERSTATE

### unknown

**Raw IRC:**
```
@badge-info=;badges=share-the-love/1;color=#FFD166;display-name=Instafluff;emote-sets=0,19194,33563,324829,333884,333885,333886,771851,865926,1512303,300206295,300206296,300206297,300206298,300206299,300206300,300206301,300206302,300206303,300206304,300206305,300206306,300206307,300206308,300206309,300206310,300206311,300206312,300206313,300206314,300374282,300548756,300548757,300548758,300548759,300548760,300548761,300548762,300548763,300548764,300548765,300548766,300548767,300548768,300548769,300548770,300548771,300548772,300548773,302696035,302696036,302696037,302696038,302696039,302696040,383128538,421280206,472873131,477339272,488737509,518748368,537206155,564265402,577523466,592920959,610186276,801479613,868263170,971017745,1057995597,1076405244,1223307726,1436653090,1474918259,1509176912,1519678782,1522892374,1534799831,1566416866,1576090677,1835894843,1863013943,1890642083,1900511923,1905431156,1907705454,1933183046,2064775297,2065405943,2145098778,3af224e6-3bd8-4de7-8dda-cea4244fae3b,b19fed88-7841-4c00-b4b1-f4aaf2dc1707;user-id=83118047;user-type= :tmi.twitch.tv GLOBALUSERSTATE
```

**Parsed Tags:**
```json
{
  "badge-info": "",
  "badges": "share-the-love/1",
  "color": "#FFD166",
  "display-name": "Instafluff",
  "emote-sets": "0,19194,33563,324829,333884,333885,333886,771851,865926,1512303,300206295,300206296,300206297,300206298,300206299,300206300,300206301,300206302,300206303,300206304,300206305,300206306,300206307,300206308,300206309,300206310,300206311,300206312,300206313,300206314,300374282,300548756,300548757,300548758,300548759,300548760,300548761,300548762,300548763,300548764,300548765,300548766,300548767,300548768,300548769,300548770,300548771,300548772,300548773,302696035,302696036,302696037,302696038,302696039,302696040,383128538,421280206,472873131,477339272,488737509,518748368,537206155,564265402,577523466,592920959,610186276,801479613,868263170,971017745,1057995597,1076405244,1223307726,1436653090,1474918259,1509176912,1519678782,1522892374,1534799831,1566416866,1576090677,1835894843,1863013943,1890642083,1900511923,1905431156,1907705454,1933183046,2064775297,2065405943,2145098778,3af224e6-3bd8-4de7-8dda-cea4244fae3b,b19fed88-7841-4c00-b4b1-f4aaf2dc1707",
  "user-id": "83118047",
  "user-type": ""
}
```

**Handler Args:**
```json
{
  "handler": "none",
  "note": "No handler for this IRC command",
  "parsed": {
    "command": "GLOBALUSERSTATE",
    "prefix": "tmi.twitch.tv",
    "channel": null,
    "params": []
  }
}
```

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

## UNKNOWN/USERSTATE

### unknown

**Raw IRC:**
```
@badge-info=subscriber/102;badges=broadcaster/1,subscriber/3012,share-the-love/1;color=#FFD166;display-name=Instafluff;emote-sets=0,19194,33563,324829,333884,333885,333886,771851,865926,1512303,300206295,300206296,300206297,300206298,300206299,300206300,300206301,300206302,300206303,300206304,300206305,300206306,300206307,300206308,300206309,300206310,300206311,300206312,300206313,300206314,300374282,300548756,300548757,300548758,300548759,300548760,300548761,300548762,300548763,300548764,300548765,300548766,300548767,300548768,300548769,300548770,300548771,300548772,300548773,302696035,302696036,302696037,302696038,302696039,302696040,383128538,421280206,472873131,477339272,488737509,518748368,537206155,564265402,577523466,592920959,610186276,801479613,868263170,971017745,1057995597,1076405244,1223307726,1436653090,1474918259,1509176912,1519678782,1522892374,1534799831,1566416866,1576090677,1835894843,1863013943,1890642083,1900511923,1905431156,1907705454,1933183046,2064775297,2065405943,2145098778,3af224e6-3bd8-4de7-8dda-cea4244fae3b,b19fed88-7841-4c00-b4b1-f4aaf2dc1707,b19fed88-7841-4c00-b4b1-f4aaf2dc1707;mod=0;subscriber=1;user-type= :tmi.twitch.tv USERSTATE #instafluff
```

**Parsed Tags:**
```json
{
  "badge-info": "subscriber/102",
  "badges": "broadcaster/1,subscriber/3012,share-the-love/1",
  "color": "#FFD166",
  "display-name": "Instafluff",
  "emote-sets": "0,19194,33563,324829,333884,333885,333886,771851,865926,1512303,300206295,300206296,300206297,300206298,300206299,300206300,300206301,300206302,300206303,300206304,300206305,300206306,300206307,300206308,300206309,300206310,300206311,300206312,300206313,300206314,300374282,300548756,300548757,300548758,300548759,300548760,300548761,300548762,300548763,300548764,300548765,300548766,300548767,300548768,300548769,300548770,300548771,300548772,300548773,302696035,302696036,302696037,302696038,302696039,302696040,383128538,421280206,472873131,477339272,488737509,518748368,537206155,564265402,577523466,592920959,610186276,801479613,868263170,971017745,1057995597,1076405244,1223307726,1436653090,1474918259,1509176912,1519678782,1522892374,1534799831,1566416866,1576090677,1835894843,1863013943,1890642083,1900511923,1905431156,1907705454,1933183046,2064775297,2065405943,2145098778,3af224e6-3bd8-4de7-8dda-cea4244fae3b,b19fed88-7841-4c00-b4b1-f4aaf2dc1707,b19fed88-7841-4c00-b4b1-f4aaf2dc1707",
  "mod": "0",
  "subscriber": "1",
  "user-type": ""
}
```

**Handler Args:**
```json
{
  "handler": "none",
  "note": "No handler for this IRC command",
  "parsed": {
    "command": "USERSTATE",
    "prefix": "tmi.twitch.tv",
    "channel": "instafluff",
    "params": [
      "#instafluff"
    ]
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

### regular

**Raw IRC:**
```

```

**Parsed Tags:**
```json
{
  "badge-info": "",
  "badges": "gingko-leaf/1",
  "client-nonce": "e4f489073afb40acb7db0cc957eeaa6d",
  "color": "#00FF7F",
  "display-name": "Nevblu7",
  "emotes": "",
  "first-msg": "0",
  "flags": "",
  "id": "aee44555-5b3d-4a9b-8fd0-034633b97755",
  "mod": "0",
  "returning-chatter": "0",
  "room-id": "71092938",
  "subscriber": "0",
  "tmi-sent-ts": "1769566594885",
  "turbo": "0",
  "user-id": "422337160",
  "user-type": ""
}
```

**Handler Args:**
```json
{
  "handler": "onChat",
  "args": {
    "user": "Nevblu7",
    "message": "sarajevo",
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
    "id": "aee44555-5b3d-4a9b-8fd0-034633b97755",
    "channel": "xqc",
    "roomId": "71092938",
    "userId": "422337160",
    "displayName": "Nevblu7"
  }
}
```

---

### vip

**Raw IRC:**
```

```

**Parsed Tags:**
```json
{
  "badge-info": "",
  "badges": "vip/1,glhf-pledge/1",
  "color": "#5F9EA0",
  "display-name": "ThePositiveBot",
  "emotes": "305954156:62-69",
  "first-msg": "0",
  "flags": "",
  "id": "b37565af-2ab1-4c23-913a-e3bde6911db8",
  "mod": "0",
  "returning-chatter": "0",
  "room-id": "71092938",
  "subscriber": "0",
  "tmi-sent-ts": "1769566595069",
  "turbo": "0",
  "user-id": "425363834",
  "user-type": "",
  "vip": "1"
}
```

**Handler Args:**
```json
{
  "handler": "onChat",
  "args": {
    "user": "ThePositiveBot",
    "message": "\u0001ACTION [Trivia] nevblu7, you got the answer right",
    "flags": {
      "broadcaster": false,
      "mod": false,
      "vip": true,
      "subscriber": false,
      "founder": false,
      "highlighted": false,
      "customReward": false
    },
    "self": false
  },
  "extra": {
    "id": "b37565af-2ab1-4c23-913a-e3bde6911db8",
    "channel": "xqc",
    "roomId": "71092938",
    "userId": "425363834",
    "displayName": "ThePositiveBot"
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
  "badge-info": "subscriber/3",
  "badges": "subscriber/3,no_video/1",
  "client-nonce": "53D6366B-FF88-456B-A213-6294B49E2129",
  "color": "#1E90FF",
  "display-name": "christian_pr24",
  "emotes": "",
  "first-msg": "0",
  "flags": "",
  "id": "7326939c-1c37-47bb-b94c-0194ecf08536",
  "mod": "0",
  "returning-chatter": "0",
  "room-id": "26490481",
  "subscriber": "1",
  "tmi-sent-ts": "1769566595543",
  "turbo": "0",
  "user-id": "251527371",
  "user-type": ""
}
```

**Handler Args:**
```json
{
  "handler": "onChat",
  "args": {
    "user": "christian_pr24",
    "message": "MEGALUL EVIL",
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
    "id": "7326939c-1c37-47bb-b94c-0194ecf08536",
    "channel": "summit1g",
    "roomId": "26490481",
    "userId": "251527371",
    "displayName": "christian_pr24"
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
  "badge-info": "",
  "badges": "gingko-leaf/1",
  "client-nonce": "3755902c72704c658056f05d9fa4d266",
  "color": "#00FF7F",
  "display-name": "Nevblu7",
  "emotes": "",
  "first-msg": "0",
  "flags": "",
  "id": "97a93c0b-f445-4e5d-b1b2-7ce90d03bf18",
  "mod": "0",
  "returning-chatter": "0",
  "room-id": "71092938",
  "subscriber": "0",
  "tmi-sent-ts": "1769566597190",
  "turbo": "0",
  "user-id": "422337160",
  "user-type": ""
}
```

**Handler Args:**
```json
{
  "handler": "onCommand",
  "args": {
    "user": "Nevblu7",
    "command": "trivia",
    "message": "",
    "flags": {
      "broadcaster": false,
      "mod": false,
      "vip": false,
      "subscriber": false,
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

### mod

**Raw IRC:**
```

```

**Parsed Tags:**
```json
{
  "badge-info": "",
  "badges": "moderator/1",
  "color": "#8A2BE2",
  "display-name": "SchnozeBot",
  "emotes": "",
  "first-msg": "0",
  "flags": "",
  "id": "aaa4879d-a0c8-42eb-bab8-3b7666074dba",
  "mod": "1",
  "returning-chatter": "0",
  "room-id": "71092938",
  "subscriber": "0",
  "tmi-sent-ts": "1769566610336",
  "turbo": "0",
  "user-id": "264879410",
  "user-type": "mod"
}
```

**Handler Args:**
```json
{
  "handler": "onChat",
  "args": {
    "user": "SchnozeBot",
    "message": "\u0001ACTION GarfieldOnMars won 400 points in roulette ",
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
    "id": "aaa4879d-a0c8-42eb-bab8-3b7666074dba",
    "channel": "xqc",
    "roomId": "71092938",
    "userId": "264879410",
    "displayName": "SchnozeBot"
  }
}
```

---

## CLEARCHAT

### timeout

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
  "handler": "onTimeout",
  "args": {
    "timedOutUsername": "jiiyoh1",
    "durationInSeconds": 948
  },
  "extra": {
    "roomId": "71092938",
    "username": "jiiyoh1",
    "timedOutUserId": "192197614"
  }
}
```

---

## UNKNOWN/NOTICE

### emote_only_on

**Raw IRC:**
```
@msg-id=emote_only_on :tmi.twitch.tv NOTICE #instafluff :This room is now in emote-only mode.
```

**Parsed Tags:**
```json
{
  "msg-id": "emote_only_on"
}
```

**Handler Args:**
```json
{
  "handler": "none",
  "note": "No handler for this IRC command",
  "parsed": {
    "command": "NOTICE",
    "prefix": "tmi.twitch.tv",
    "channel": "instafluff",
    "message": "This room is now in emote-only mode.",
    "params": [
      "#instafluff",
      "This room is now in emote-only mode."
    ]
  }
}
```

---

### emote_only_off

**Raw IRC:**
```
@msg-id=emote_only_off :tmi.twitch.tv NOTICE #instafluff :This room is no longer in emote-only mode.
```

**Parsed Tags:**
```json
{
  "msg-id": "emote_only_off"
}
```

**Handler Args:**
```json
{
  "handler": "none",
  "note": "No handler for this IRC command",
  "parsed": {
    "command": "NOTICE",
    "prefix": "tmi.twitch.tv",
    "channel": "instafluff",
    "message": "This room is no longer in emote-only mode.",
    "params": [
      "#instafluff",
      "This room is no longer in emote-only mode."
    ]
  }
}
```

---

### r9k_on

**Raw IRC:**
```
@msg-id=r9k_on :tmi.twitch.tv NOTICE #instafluff :This room is now in unique-chat mode.
```

**Parsed Tags:**
```json
{
  "msg-id": "r9k_on"
}
```

**Handler Args:**
```json
{
  "handler": "none",
  "note": "No handler for this IRC command",
  "parsed": {
    "command": "NOTICE",
    "prefix": "tmi.twitch.tv",
    "channel": "instafluff",
    "message": "This room is now in unique-chat mode.",
    "params": [
      "#instafluff",
      "This room is now in unique-chat mode."
    ]
  }
}
```

---

### r9k_off

**Raw IRC:**
```
@msg-id=r9k_off :tmi.twitch.tv NOTICE #instafluff :This room is no longer in unique-chat mode.
```

**Parsed Tags:**
```json
{
  "msg-id": "r9k_off"
}
```

**Handler Args:**
```json
{
  "handler": "none",
  "note": "No handler for this IRC command",
  "parsed": {
    "command": "NOTICE",
    "prefix": "tmi.twitch.tv",
    "channel": "instafluff",
    "message": "This room is no longer in unique-chat mode.",
    "params": [
      "#instafluff",
      "This room is no longer in unique-chat mode."
    ]
  }
}
```

---

## USERNOTICE

### resub

**Raw IRC:**
```

```

**Parsed Tags:**
```json
{
  "badge-info": "subscriber/13",
  "badges": "subscriber/12",
  "color": "#FF69B4",
  "display-name": "silliestputtie",
  "emotes": "",
  "flags": "",
  "id": "8cadc2eb-708b-4804-a8b4-dc72e0105e66",
  "login": "silliestputtie",
  "mod": "0",
  "msg-id": "resub",
  "msg-param-cumulative-months": "13",
  "msg-param-months": "0",
  "msg-param-multimonth-duration": "1",
  "msg-param-multimonth-tenure": "0",
  "msg-param-should-share-streak": "0",
  "msg-param-sub-plan-name": "Woke Beys (hasanpiker): $4.99 Sub",
  "msg-param-sub-plan": "1000",
  "msg-param-was-gifted": "false",
  "room-id": "207813352",
  "subscriber": "1",
  "system-msg": "silliestputtie subscribed at Tier 1. They've subscribed for 13 months!",
  "tmi-sent-ts": "1769566636807",
  "user-id": "1200070558",
  "user-type": "",
  "vip": "0"
}
```

**Handler Args:**
```json
{
  "handler": "onResub",
  "args": {
    "user": "silliestputtie",
    "message": "PeepoClap",
    "streakMonths": 0,
    "cumulativeMonths": 13,
    "subTierInfo": {
      "prime": false,
      "plan": "1000",
      "planName": "Tier 1"
    }
  }
}
```

---

### sub

**Raw IRC:**
```

```

**Parsed Tags:**
```json
{
  "badge-info": "subscriber/1",
  "badges": "subscriber/0,premium/1",
  "color": "#FF0000",
  "display-name": "post_honk",
  "emotes": "",
  "flags": "",
  "id": "6063c312-c4be-409d-a7cb-3f9008e8b24a",
  "login": "post_honk",
  "mod": "0",
  "msg-id": "sub",
  "msg-param-cumulative-months": "1",
  "msg-param-months": "0",
  "msg-param-multimonth-duration": "1",
  "msg-param-multimonth-tenure": "0",
  "msg-param-should-share-streak": "0",
  "msg-param-sub-plan-name": "Tier 1 Ludbud",
  "msg-param-sub-plan": "Prime",
  "msg-param-was-gifted": "false",
  "room-id": "40934651",
  "subscriber": "1",
  "system-msg": "post_honk subscribed with Prime.",
  "tmi-sent-ts": "1769566669819",
  "user-id": "148325771",
  "user-type": "",
  "vip": "0"
}
```

**Handler Args:**
```json
{
  "handler": "onSub",
  "args": {
    "user": "post_honk",
    "message": "",
    "subTierInfo": {
      "prime": true,
      "plan": "Prime",
      "planName": "Prime"
    }
  }
}
```

---

### submysterygift

**Raw IRC:**
```

```

**Parsed Tags:**
```json
{
  "badge-info": "subscriber/3",
  "badges": "subscriber/3,sub-gifter/5",
  "color": "#0000FF",
  "display-name": "HuskerPuppy",
  "emotes": "",
  "flags": "",
  "id": "fd97af13-1e9b-4212-bd32-7cd8b3c4f21e",
  "login": "huskerpuppy",
  "mod": "0",
  "msg-id": "submysterygift",
  "msg-param-community-gift-id": "9213871498341169447",
  "msg-param-mass-gift-count": "5",
  "msg-param-origin-id": "9213871498341169447",
  "msg-param-sender-count": "10",
  "msg-param-sub-plan": "1000",
  "room-id": "40934651",
  "subscriber": "1",
  "system-msg": "HuskerPuppy is gifting 5 Tier 1 Subs to Ludwig's community! They've gifted a total of 10 in the channel!",
  "tmi-sent-ts": "1769566754580",
  "user-id": "24121523",
  "user-type": "",
  "vip": "0"
}
```

**Handler Args:**
```json
{
  "handler": "onSubMysteryGift",
  "args": {
    "gifterUser": "HuskerPuppy",
    "numbOfSubs": 5,
    "senderCount": 10,
    "subTierInfo": {
      "prime": false,
      "plan": "1000",
      "planName": "Tier 1"
    }
  }
}
```

---

### subgift

**Raw IRC:**
```

```

**Parsed Tags:**
```json
{
  "badge-info": "subscriber/3",
  "badges": "subscriber/3,sub-gifter/10",
  "color": "#0000FF",
  "display-name": "HuskerPuppy",
  "emotes": "",
  "flags": "",
  "id": "53a8a22e-5fbf-4e9d-b625-720f73a13ecc",
  "login": "huskerpuppy",
  "mod": "0",
  "msg-id": "subgift",
  "msg-param-community-gift-id": "9213871498341169447",
  "msg-param-gift-months": "1",
  "msg-param-months": "1",
  "msg-param-origin-id": "9213871498341169447",
  "msg-param-recipient-display-name": "Flyty14",
  "msg-param-recipient-id": "48268936",
  "msg-param-recipient-user-name": "flyty14",
  "msg-param-sender-count": "0",
  "msg-param-sub-plan-name": "Tier 1 Ludbud",
  "msg-param-sub-plan": "1000",
  "room-id": "40934651",
  "subscriber": "1",
  "system-msg": "HuskerPuppy gifted a Tier 1 sub to Flyty14!",
  "tmi-sent-ts": "1769566754990",
  "user-id": "24121523",
  "user-type": "",
  "vip": "0"
}
```

**Handler Args:**
```json
{
  "handler": "onSubGift",
  "args": {
    "gifterUser": "HuskerPuppy",
    "streakMonths": 1,
    "recipientUser": "Flyty14",
    "senderCount": 0,
    "subTierInfo": {
      "prime": false,
      "plan": "1000",
      "planName": "Tier 1"
    }
  }
}
```

---

