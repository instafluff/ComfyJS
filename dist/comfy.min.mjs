var Q = (a, r, s) => {
  if (!r.has(a))
    throw TypeError("Cannot " + s);
};
var e = (a, r, s) => (Q(a, r, "read from private field"), s ? s.call(a) : r.get(a)), c = (a, r, s) => {
  if (r.has(a))
    throw TypeError("Cannot add the same private member more than once");
  r instanceof WeakSet ? r.add(a) : r.set(a, s);
}, N = (a, r, s, i) => (Q(a, r, "write to private field"), i ? i.call(a, s) : r.set(a, s), s);
var M = (a, r, s) => (Q(a, r, "access private method"), s);
function Pa(a) {
  return !a || typeof a != "string" || !a.includes("\\") ? a : a.replace(/\\(.)/g, (r, s) => {
    switch (s) {
      case "\\":
        return "\\";
      case ":":
        return ";";
      case "s":
        return " ";
      case "r":
        return "\r";
      case "n":
        return `
`;
      default:
        return s;
    }
  });
}
function ta(a, r) {
  const s = a.indexOf(" ", r);
  return {
    component: a.slice(r + 1, s),
    nextIndex: s + 1
  };
}
function Ra(a) {
  const r = {
    raw: a,
    tags: {},
    source: null,
    command: null,
    parameters: null
  };
  let s = 0;
  if (a[0] === "@") {
    const { component: i, nextIndex: t } = ta(a, 0);
    for (const n of i.split(";")) {
      const b = n.indexOf("="), p = n.substring(0, b), d = n.substring(b + 1);
      switch (p) {
        case "emote-sets":
        case "ban-duration":
        case "bits":
        case "id":
        case "room-id":
        case "color":
        case "login":
          r.tags[p] = d;
          break;
        default:
          r.tags[p] = Pa(d);
          break;
      }
    }
    s = t;
  }
  if (a[s] === ":") {
    const { component: i, nextIndex: t } = ta(a, s);
    r.source = i, s = t;
  }
  if (s < a.length) {
    const i = a.slice(s).trim(), t = i.indexOf(":");
    r.command = i.slice(0, t < 0 ? void 0 : t).trim();
    const n = a.indexOf(":", s);
    n >= 0 && (r.parameters = a.slice(n + 1));
  }
  return r;
}
const va = globalThis.WebSocket || require("ws");
function Ea(a, r) {
  return new va(a, r);
}
var l = /* @__PURE__ */ ((a) => (a.None = "none", a.Ping = "Ping", a.Pong = "Pong", a.Connect = "connect", a.Reconnect = "reconnect", a.Error = "error", a.Warning = "Warning", a.ChatMode = "chatmode", a.ClearChat = "ClearChat", a.RoomState = "roomstate", a.GlobalUserState = "globaluserstate", a.UserState = "userstate", a.Notice = "notice", a.Join = "join", a.Leave = "leave", a.Command = "command", a.Chat = "message", a.Reply = "reply", a.Whisper = "whisper", a.Announcement = "announcement", a.Cheer = "Cheer", a.Subscribe = "sub", a.Resubscribe = "resub", a.SubGift = "subgift", a.MysterySubGift = "submysterygift", a.SubGiftContinue = "subgiftcontinue", a.Raid = "raid", a.Unraid = "unraid", a.Timeout = "Timeout", a.Ban = "Ban", a.MessageDeleted = "MessageDeleted", a.ViewerMilestone = "ViewerMilestone", a.All = "all", a))(l || {});
const C = {
  "": "Normal",
  admin: "Admin",
  global_mod: "Global Mod",
  staff: "Staff",
  mod: "Moderator"
};
function U(a) {
  const r = a.split("!");
  return r.length > 1 ? r[0] : void 0;
}
function m(a) {
  if (!a)
    return;
  const r = a.split(","), s = {};
  for (const i of r) {
    const [t, n] = i.split("/");
    s[t] = n;
  }
  return s;
}
function ra(a) {
  if (!a)
    return;
  const r = a.split(","), s = {};
  for (const i of r) {
    const [, t] = i.split(":"), [n, b] = t.split(".");
    switch (n) {
      case "A":
        s.aggressive = Math.max(s.aggressive || 0, parseInt(b));
        break;
      case "I":
        s[
          "identity-hate"
          /* IdentityBasedHate */
        ] = Math.max(s[
          "identity-hate"
          /* IdentityBasedHate */
        ] || 0, parseInt(b));
        break;
      case "P":
        s.profane = Math.max(s.profane || 0, parseInt(b));
        break;
      case "S":
        s.sexual = Math.max(s.sexual || 0, parseInt(b));
        break;
    }
  }
  return s;
}
function ka(a, r) {
  var z, x;
  const s = (z = a.parameters) == null ? void 0 : z.startsWith("ACTION"), i = s ? (x = a.parameters) == null ? void 0 : x.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1] : a.parameters, t = a.tags.id, n = a.tags["room-id"], b = a.tags["user-id"], p = U(a.source), d = a.tags["display-name"] || a.tags.login || p, P = C[a.tags["user-type"]], j = a.tags["badge-info"] ? m(a.tags["badge-info"]) : void 0, y = a.tags.badges ? m(a.tags.badges) : void 0, J = a.tags.color || void 0, H = a.tags.emotes, E = a.tags.flags, _ = void 0, da = p === r, ga = a.tags.mod === "1", pa = y ? !!y.founder : !1, Z = a.tags.subscriber === "1", ma = a.tags.turbo === "1", ca = y ? !!y.vip : !1, fa = y ? !!y.premium : !1, ba = y ? !!["partner"] : !1, ha = y ? !!y["game-developer"] : !1, q = parseInt(a.tags["tmi-sent-ts"]), A = a.tags["emote-only"] === "1", Ia = a.tags["msg-id"] === "highlighted-message", ya = a.tags["msg-id"] === "skip-subs-mode-message", D = a.tags["custom-reward-id"] || null, Ca = a.tags["first-msg"] === "1", Sa = a.tags["returning-chatter"] === "1", K = {
    broadcaster: da,
    mod: ga,
    founder: pa,
    subscriber: Z,
    vip: ca,
    partner: ba,
    gameDeveloper: ha,
    turbo: ma,
    prime: fa,
    highlighted: Ia,
    skipSubsMode: ya,
    customReward: !!D,
    emoteOnly: A,
    firstMessage: Ca,
    returningChatter: Sa
  };
  if (a.tags.bits)
    return {
      type: "Cheer",
      data: {
        channel: r,
        channelId: n,
        displayName: d,
        username: p,
        userId: b,
        userType: P,
        id: t,
        message: a.parameters,
        messageType: s ? "action" : "chat",
        // TODO: Can bits be an action?
        messageEmotes: H,
        messageFlags: E,
        contentFlags: _,
        isEmoteOnly: A,
        subscriber: Z,
        userColor: J,
        userBadgeInfo: j,
        userBadges: y,
        customRewardId: D,
        flags: K,
        bits: parseInt(a.tags.bits),
        timestamp: q,
        extra: {
          ...a.tags,
          flags: E || null
        }
      }
    };
  if (i != null && i.startsWith("!")) {
    const aa = i.split(/ (.*)/), Na = aa[0].substring(1).toLowerCase(), Ma = aa[1] || "";
    return {
      type: "command",
      data: {
        channel: r,
        channelId: n,
        displayName: d,
        username: p,
        userId: b,
        userType: P,
        command: Na,
        id: t,
        message: Ma,
        messageType: s ? "action" : "chat",
        messageEmotes: H,
        messageFlags: E,
        contentFlags: _,
        isEmoteOnly: A,
        userColor: J,
        userBadgeInfo: j,
        userBadges: y,
        customRewardId: D,
        flags: K,
        timestamp: q,
        extra: {
          ...a.tags,
          flags: E || null
        }
      }
    };
  } else
    return {
      type: "message",
      data: {
        channel: r,
        channelId: n,
        displayName: d,
        username: p,
        userId: b,
        userType: P,
        id: t,
        message: i,
        messageType: s ? "action" : "chat",
        messageEmotes: H,
        messageFlags: E,
        contentFlags: _,
        isEmoteOnly: A,
        userColor: J,
        userBadgeInfo: j,
        userBadges: y,
        customRewardId: D,
        flags: K,
        timestamp: q,
        extra: {
          ...a.tags,
          flags: E || null
        }
      }
    };
}
function Oa(a) {
  var r, s, i, t, n, b;
  try {
    if (a.command) {
      const p = a.command.split(" "), d = p.length > 1 ? p[1].substring(1) : void 0;
      switch (p[0]) {
        case "PING":
          return {
            type: "Ping"
            /* Ping */
          };
        case "PONG":
          return {
            type: "Pong"
            /* Pong */
          };
        case "CAP":
          return null;
        case "JOIN":
          return {
            type: "join",
            data: { channel: d, username: U(a.source) }
          };
        case "PART":
          return {
            type: "leave",
            data: { channel: d, username: U(a.source) }
          };
        case "ROOMSTATE":
          return {
            type: "roomstate",
            data: {
              // Only add the properties if they exist
              ...a.tags["broadcaster-lang"] && { broadcasterLanguage: a.tags["broadcaster-lang"] },
              ...a.tags["emote-only"] && { emoteOnly: a.tags["emote-only"] !== "0" },
              ...a.tags["followers-only"] && { followersOnly: a.tags["followers-only"] !== "-1" },
              ...a.tags["subs-only"] && { subscribersOnly: a.tags["subs-only"] !== "0" },
              ...a.tags.r9k && { r9k: a.tags.r9k !== "0" },
              ...a.tags.rituals && { rituals: a.tags.rituals !== "0" },
              ...a.tags.slow && { slow: a.tags.slow !== "0" },
              channel: d,
              channelId: a.tags["room-id"]
            }
          };
        case "GLOBALUSERSTATE":
          return {
            type: "globaluserstate",
            data: {
              displayName: a.tags["display-name"],
              userId: a.tags["user-id"],
              userType: C[a.tags["user-type"]],
              color: a.tags.color,
              badges: a.tags.badges,
              badgeInfo: a.tags["badge-info"],
              emoteSets: a.tags["emote-sets"],
              extra: a.tags
            }
          };
        case "USERSTATE":
          return {
            type: "userstate",
            data: {
              channel: d,
              displayName: a.tags["display-name"],
              userId: a.tags["user-id"],
              userType: C[a.tags["user-type"]],
              color: a.tags.color,
              badgeInfo: a.tags["badge-info"] ? m(a.tags["badge-info"]) : void 0,
              badges: a.tags.badges ? m(a.tags.badges) : void 0,
              emoteSets: a.tags["emote-sets"],
              ...a.tags.id && { id: a.tags.id },
              mod: a.tags.mod === "1",
              subscriber: a.tags.subscriber === "1",
              turbo: a.tags.turbo === "1",
              extra: a.tags
            }
          };
        case "HOSTTARGET":
          break;
        case "USERNOTICE":
          switch (a.tags["msg-id"]) {
            case "announcement":
              return {
                type: "announcement",
                data: {
                  displayName: a.tags["display-name"] || a.tags.login,
                  channel: d,
                  channelId: a.tags["room-id"],
                  username: a.tags.login,
                  userId: a.tags["user-id"],
                  message: a.parameters,
                  messageType: a.tags["msg-id"],
                  messageEmotes: a.tags.emotes,
                  timestamp: parseInt(a.tags["tmi-sent-ts"]),
                  extra: a.tags
                }
              };
            case "sub":
              return {
                type: "sub",
                data: {
                  id: a.tags.id,
                  displayName: a.tags["display-name"] || a.tags.login,
                  months: parseInt(a.tags["msg-param-months"]),
                  multiMonthDuration: parseInt(a.tags["msg-param-multimonth-duration"]),
                  multiMonthTenure: parseInt(a.tags["msg-param-multimonth-tenure"]),
                  shouldShareStreak: a.tags["msg-param-should-share-streak"] === "1",
                  subPlan: a.tags["msg-param-sub-plan"],
                  subPlanName: a.tags["msg-param-sub-plan-name"],
                  wasGifted: a.tags["msg-param-was-gifted"] === "true",
                  ...a.tags["msg-param-goal-contribution-type"] && { goalContributionType: a.tags["msg-param-goal-contribution-type"] },
                  ...a.tags["msg-param-goal-current-contributions"] && { goalCurrentContributions: parseInt(a.tags["msg-param-goal-current-contributions"]) },
                  ...a.tags["msg-param-goal-description"] && { goalDescription: a.tags["msg-param-goal-description"] },
                  ...a.tags["msg-param-goal-target-contributions"] && { goalTargetContributions: parseInt(a.tags["msg-param-goal-target-contributions"]) },
                  ...a.tags["msg-param-goal-user-contributions"] && { goalUserContributions: parseInt(a.tags["msg-param-goal-user-contributions"]) },
                  channel: d,
                  channelId: a.tags["room-id"],
                  username: a.tags.login,
                  userId: a.tags["user-id"],
                  userType: C[a.tags["user-type"]],
                  userBadgeInfo: a.tags["badge-info"] ? m(a.tags["badge-info"]) : void 0,
                  userBadges: a.tags.badges ? m(a.tags.badges) : void 0,
                  userColor: a.tags.color || void 0,
                  message: a.parameters,
                  messageType: a.tags["msg-id"],
                  messageEmotes: a.tags.emotes,
                  messageFlags: a.tags.flags,
                  contentFlags: ra(a.tags.flags),
                  timestamp: parseInt(a.tags["tmi-sent-ts"]),
                  extra: a.tags
                }
              };
            case "resub":
              return {
                type: "resub",
                data: {
                  id: a.tags.id,
                  displayName: a.tags["display-name"] || a.tags.login,
                  cumulativeMonths: parseInt(a.tags["msg-param-cumulative-months"]),
                  months: parseInt(a.tags["msg-param-months"]),
                  multiMonthDuration: parseInt(a.tags["msg-param-multimonth-duration"]),
                  multiMonthTenure: parseInt(a.tags["msg-param-multimonth-tenure"]),
                  ...a.tags["msg-param-streak-months"] && { streakMonths: parseInt(a.tags["msg-param-streak-months"]) },
                  shouldShareStreak: a.tags["msg-param-should-share-streak"] === "1",
                  subPlan: a.tags["msg-param-sub-plan"],
                  subPlanName: a.tags["msg-param-sub-plan-name"],
                  wasGifted: a.tags["msg-param-was-gifted"] === "true",
                  channel: d,
                  channelId: a.tags["room-id"],
                  username: a.tags.login,
                  userId: a.tags["user-id"],
                  userType: C[a.tags["user-type"]],
                  userBadgeInfo: a.tags["badge-info"] ? m(a.tags["badge-info"]) : void 0,
                  userBadges: a.tags.badges ? m(a.tags.badges) : void 0,
                  userColor: a.tags.color || void 0,
                  message: a.parameters,
                  messageType: a.tags["msg-id"],
                  messageEmotes: a.tags.emotes,
                  messageFlags: a.tags.flags,
                  contentFlags: ra(a.tags.flags),
                  timestamp: parseInt(a.tags["tmi-sent-ts"]),
                  extra: a.tags
                }
              };
            case "submysterygift":
              return {
                type: "submysterygift",
                data: {
                  id: a.tags.id,
                  displayName: a.tags["display-name"] || a.tags.login,
                  giftCount: parseInt(a.tags["msg-param-mass-gift-count"]),
                  senderCount: parseInt(a.tags["msg-param-sender-count"] || "0"),
                  subPlan: a.tags["msg-param-sub-plan"],
                  subPlanName: a.tags["msg-param-sub-plan-name"],
                  ...a.tags["msg-param-goal-contribution-type"] && { goalContributionType: a.tags["msg-param-goal-contribution-type"] },
                  ...a.tags["msg-param-goal-current-contributions"] && { goalCurrentContributions: parseInt(a.tags["msg-param-goal-current-contributions"]) },
                  ...a.tags["msg-param-goal-description"] && { goalDescription: a.tags["msg-param-goal-description"] },
                  ...a.tags["msg-param-goal-target-contributions"] && { goalTargetContributions: parseInt(a.tags["msg-param-goal-target-contributions"]) },
                  ...a.tags["msg-param-goal-user-contributions"] && { goalUserContributions: parseInt(a.tags["msg-param-goal-user-contributions"]) },
                  channel: d,
                  channelId: a.tags["room-id"],
                  username: a.tags.login,
                  userId: a.tags["user-id"],
                  userType: C[a.tags["user-type"]],
                  userBadgeInfo: a.tags["badge-info"] ? m(a.tags["badge-info"]) : void 0,
                  userBadges: a.tags.badges ? m(a.tags.badges) : void 0,
                  userColor: a.tags.color || void 0,
                  messageType: a.tags["msg-id"],
                  timestamp: parseInt(a.tags["tmi-sent-ts"]),
                  extra: a.tags
                }
              };
            case "subgift":
              return {
                type: "subgift",
                data: {
                  id: a.tags.id,
                  displayName: a.tags["display-name"] || a.tags.login,
                  recipientDisplayName: a.tags["msg-param-recipient-display-name"],
                  recipientId: a.tags["msg-param-recipient-id"],
                  recipientUsername: a.tags["msg-param-recipient-user-name"],
                  months: parseInt(a.tags["msg-param-months"]),
                  giftMonths: parseInt(a.tags["msg-param-gift-months"]),
                  senderCount: parseInt(a.tags["msg-param-sender-count"] || "0"),
                  // How many all-time total gift subs sender has sent the channel
                  subPlan: a.tags["msg-param-sub-plan"],
                  subPlanName: a.tags["msg-param-sub-plan-name"],
                  ...a.tags["msg-param-goal-contribution-type"] && { goalContributionType: a.tags["msg-param-goal-contribution-type"] },
                  ...a.tags["msg-param-goal-current-contributions"] && { goalCurrentContributions: parseInt(a.tags["msg-param-goal-current-contributions"]) },
                  ...a.tags["msg-param-goal-description"] && { goalDescription: a.tags["msg-param-goal-description"] },
                  ...a.tags["msg-param-goal-target-contributions"] && { goalTargetContributions: parseInt(a.tags["msg-param-goal-target-contributions"]) },
                  ...a.tags["msg-param-goal-user-contributions"] && { goalUserContributions: parseInt(a.tags["msg-param-goal-user-contributions"]) },
                  channel: d,
                  channelId: a.tags["room-id"],
                  username: a.tags.login,
                  userId: a.tags["user-id"],
                  userType: C[a.tags["user-type"]],
                  userBadgeInfo: a.tags["badge-info"] ? m(a.tags["badge-info"]) : void 0,
                  userBadges: a.tags.badges ? m(a.tags.badges) : void 0,
                  userColor: a.tags.color || void 0,
                  messageType: a.tags["msg-id"],
                  timestamp: parseInt(a.tags["tmi-sent-ts"]),
                  extra: a.tags
                }
              };
            case "giftpaidupgrade":
              return {
                type: "subgiftcontinue",
                data: {
                  id: a.tags.id,
                  displayName: a.tags["display-name"] || a.tags.login,
                  gifterDisplayName: a.tags["msg-param-sender-name"] || a.tags["msg-param-sender-login"],
                  gifterUsername: a.tags["msg-param-sender-login"],
                  channel: d,
                  channelId: a.tags["room-id"],
                  username: a.tags.login,
                  userId: a.tags["user-id"],
                  userType: C[a.tags["user-type"]],
                  userBadgeInfo: a.tags["badge-info"] ? m(a.tags["badge-info"]) : void 0,
                  userBadges: a.tags.badges ? m(a.tags.badges) : void 0,
                  userColor: a.tags.color || void 0,
                  messageType: a.tags["msg-id"],
                  timestamp: parseInt(a.tags["tmi-sent-ts"]),
                  extra: a.tags
                }
              };
            case "raid":
              return {
                type: "raid",
                data: {
                  id: a.tags.id,
                  profileImageURL: a.tags["msg-param-profileImageURL"],
                  displayName: a.tags["msg-param-displayName"] || a.tags["display-name"] || a.tags["msg-param-login"] || a.tags.login,
                  viewers: parseInt(a.tags["msg-param-viewerCount"]),
                  channel: d,
                  channelId: a.tags["room-id"],
                  username: a.tags["msg-param-login"] || a.tags.login,
                  userId: a.tags["user-id"],
                  userType: C[a.tags["user-type"]],
                  messageType: a.tags["msg-id"],
                  // TODO: Add flags and badges
                  timestamp: parseInt(a.tags["tmi-sent-ts"]),
                  extra: a.tags
                }
              };
            case "unraid":
              return console.log(a), {
                type: "unraid",
                data: {
                  id: a.tags.id,
                  displayName: a.tags["display-name"] || a.tags.login,
                  channel: a.tags.login,
                  channelId: a.tags["room-id"],
                  username: a.tags.login,
                  userId: a.tags["user-id"],
                  userType: C[a.tags["user-type"]],
                  userBadgeInfo: a.tags["badge-info"] ? m(a.tags["badge-info"]) : void 0,
                  userBadges: a.tags.badges ? m(a.tags.badges) : void 0,
                  userColor: a.tags.color || void 0,
                  messageType: a.tags["msg-id"],
                  timestamp: parseInt(a.tags["tmi-sent-ts"]),
                  extra: a.tags
                }
              };
            case "viewermilestone":
              return console.log(a), {
                type: "ViewerMilestone",
                data: {
                  id: a.tags.id,
                  displayName: a.tags["display-name"] || a.tags.login,
                  channel: d,
                  channelId: a.tags["room-id"],
                  username: a.tags.login,
                  userId: a.tags["user-id"],
                  userType: C[a.tags["user-type"]],
                  messageType: a.tags["msg-id"],
                  category: a.tags["msg-param-category"],
                  milestoneId: a.tags["msg-param-id"],
                  milestoneValue: parseInt(a.tags["msg-param-value"]),
                  timestamp: parseInt(a.tags["tmi-sent-ts"]),
                  extra: a.tags
                }
              };
            default:
              console.log("TODO IMPLEMENT COMMAND", a);
              break;
          }
          break;
        case "WHISPER":
          return {
            type: "whisper",
            data: {
              displayName: a.tags["display-name"] || a.tags.login || U(a.source),
              username: U(a.source),
              userId: a.tags["user-id"],
              userType: C[a.tags["user-type"]],
              userColor: a.tags.color || void 0,
              userBadgeInfo: a.tags["badge-info"] ? m(a.tags["badge-info"]) : void 0,
              userBadges: a.tags.badges ? m(a.tags.badges) : void 0,
              messageEmotes: a.tags.emotes,
              turbo: a.tags.turbo === "1",
              threadId: a.tags["thread-id"],
              messageId: a.tags["message-id"],
              message: a.parameters,
              messageType: "whisper",
              extra: a.tags
            }
          };
        case "NOTICE":
          return (r = a.parameters) != null && r.includes("Login unsuccessful") || (s = a.parameters) != null && s.includes("Login authentication failed") || (i = a.parameters) != null && i.includes("Error logging in") || (t = a.parameters) != null && t.includes("Improperly formatted auth") || (n = a.parameters) != null && n.includes("Invalid NICK") || (b = a.parameters) != null && b.includes("Invalid CAP REQ") ? {
            type: "error",
            data: {
              channel: d,
              message: a.parameters
            }
          } : {
            type: "notice",
            data: {
              channel: d,
              msgId: a.tags["msg-id"],
              message: a.parameters
            }
          };
        case "CLEARCHAT":
          return a.tags["target-user-id"] ? a.tags["ban-duration"] ? {
            type: "Timeout",
            data: {
              channel: d,
              channelId: a.tags["room-id"],
              duration: parseInt(a.tags["ban-duration"]),
              username: a.parameters,
              userId: a.tags["target-user-id"],
              timestamp: parseInt(a.tags["tmi-sent-ts"]),
              extra: a.tags
            }
          } : {
            type: "Ban",
            data: {
              channel: d,
              channelId: a.tags["room-id"],
              username: a.parameters,
              userId: a.tags["target-user-id"],
              timestamp: parseInt(a.tags["tmi-sent-ts"]),
              extra: a.tags
            }
          } : {
            type: "ClearChat",
            data: {
              channel: d,
              channelId: a.tags["room-id"],
              timestamp: parseInt(a.tags["tmi-sent-ts"]),
              extra: a.tags
            }
          };
        case "CLEARMSG":
          return {
            type: "MessageDeleted",
            data: {
              channel: d,
              channelId: a.tags["room-id"],
              // Room ID seems to be empty for this event
              displayName: a.tags["display-name"] || a.tags.login,
              username: a.tags.login,
              id: a.tags["target-msg-id"],
              message: a.parameters,
              timestamp: parseInt(a.tags["tmi-sent-ts"]),
              extra: a.tags
            }
          };
        case "PRIVMSG":
          return ka(a, d);
        case "RECONNECT":
          console.log("The Twitch IRC server is about to terminate the connection for maintenance.");
          break;
        default:
          {
            const P = parseInt(p[0]);
            if (P >= 400)
              return console.debug(`Error IRC command: ${P}`, a), null;
            switch (P) {
              case 1:
                return null;
              case 2:
              case 3:
              case 4:
              case 353:
              case 366:
              case 372:
              case 375:
                return null;
              case 376:
                return { type: "connect", data: { username: p[1] } };
              default:
                return console.debug("Unsupported numeric command", P), null;
            }
          }
          break;
      }
    } else
      console.debug("Unprocessed IRC message:", a.raw);
  } catch (p) {
    return console.error(p), {
      type: "Warning",
      data: p
    };
  }
  return console.log(a), null;
}
function Ua(a) {
  a.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
}
function Ba(a, r, s) {
  const i = s ? r : `justinfan${Math.floor(Math.random() * 99998999 + 1e3)}`, t = s || "INSTAFLUFF";
  a.send(`PASS ${t}`), a.send(`NICK ${i}`);
}
function sa(a, r) {
  if (Array.isArray(r)) {
    const s = r.map((i) => `#${i}`).join(",");
    a.send(`JOIN ${s}`);
  } else
    a.send(`JOIN #${r}`);
}
function wa(a, r) {
  a.send(`PART #${r}`);
}
function Ga(a) {
  a.send("PING");
}
function Aa(a) {
  a.send("PONG");
}
function Da(a, r, s) {
  a.send(`PRIVMSG #${r} :${s}`);
}
function La(a, r, s, i) {
  a.send(`@reply-parent-msg-id=${s} PRIVMSG #${r} :${i}`);
}
var u, R, B, v, k, O, w, X, I, S, L, na, W, ea, F, oa, $, ia, T, ua, V, la, G, Y;
class Wa {
  constructor(r, s, i, t) {
    c(this, w);
    c(this, I);
    c(this, L);
    c(this, W);
    c(this, F);
    c(this, $);
    c(this, T);
    c(this, V);
    c(this, G);
    c(this, u, void 0);
    c(this, R, void 0);
    c(this, B, void 0);
    c(this, v, void 0);
    c(this, k, void 0);
    c(this, O, void 0);
    N(this, k, 0), N(this, O, -1), this.reconnects = 0, this.chatModes = {}, this.handlers = {}, N(this, R, r), N(this, B, s), this.debug = !!t, (typeof i == "string" || i instanceof String) && (i = [i]), this.channels = i || [r], M(this, L, na).call(this);
  }
  get version() {
    return "2.0.0";
  }
  get latency() {
    return e(this, O);
  }
  get ws() {
    return e(this, u);
  }
  on(r, s) {
    this.handlers[r] = s;
  }
  say(r, s) {
    e(this, u) && e(this, I, S) && Da(e(this, u), s || e(this, w, X), r);
  }
  reply(r, s, i) {
    e(this, u) && e(this, I, S) && La(e(this, u), i || e(this, w, X), r, s);
  }
  join(r) {
    e(this, u) && e(this, I, S) && sa(e(this, u), r);
  }
  leave(r) {
    e(this, u) && e(this, I, S) && wa(e(this, u), r);
  }
  deleteMessage(r, s) {
    e(this, u) && e(this, I, S);
  }
  simulateIRCMessage(r) {
    e(this, u) && e(this, I, S) && M(this, G, Y).call(this, { data: r });
  }
  destroy() {
    e(this, u) && e(this, u).readyState !== e(this, u).CLOSED && e(this, u).close();
  }
}
u = new WeakMap(), R = new WeakMap(), B = new WeakMap(), v = new WeakMap(), k = new WeakMap(), O = new WeakMap(), w = new WeakSet(), X = function() {
  return this.channels[0];
}, I = new WeakSet(), S = function() {
  return !!(e(this, u) && e(this, u).readyState === e(this, u).OPEN);
}, L = new WeakSet(), na = function() {
  if (e(this, I, S))
    return;
  N(this, u, Ea("wss://irc-ws.chat.twitch.tv:443", "irc")), e(this, u).onopen = () => {
    M(this, W, ea).call(this);
  }, e(this, u).onmessage = (s) => {
    M(this, G, Y).call(this, s);
  }, e(this, u).onerror = (s) => {
    M(this, F, oa).call(this, s);
  }, e(this, u).onclose = (s) => {
    M(this, $, ia).call(this, s);
  };
}, W = new WeakSet(), ea = function() {
  e(this, u) && e(this, I, S) && (Ua(e(this, u)), Ba(e(this, u), e(this, R), e(this, B)));
}, F = new WeakSet(), oa = function(r) {
  console.error("ERROR", r);
}, $ = new WeakSet(), ia = function(r) {
  console.info("CLOSE", r), e(this, v) && clearInterval(e(this, v));
}, T = new WeakSet(), ua = function() {
  e(this, u) && e(this, I, S) && (N(this, k, Date.now()), Ga(e(this, u)));
}, V = new WeakSet(), la = function(r) {
  if (e(this, u) && e(this, I, S))
    switch (r.type) {
      case l.Connect:
        N(this, R, r.data.username), e(this, v) && clearInterval(e(this, v)), N(this, v, setInterval(() => {
          M(this, T, ua).call(this);
        }, 6e4));
        const s = new URL(e(this, u).url);
        r.data.address = s.host, r.data.port = s.protocol === "wss:" ? 443 : 80, r.data.isFirstConnect = this.reconnects === 0, sa(e(this, u), this.channels);
        break;
      case l.Ping:
        Aa(e(this, u));
        break;
      case l.Pong:
        r.data = r.data || {}, N(this, O, r.data.latency = Date.now() - e(this, k));
        break;
      case l.RoomState:
        this.chatModes[r.data.channel] = {
          ...this.chatModes[r.data.channel],
          ...r.data
        }, this.handlers[l.ChatMode] && this.handlers[l.ChatMode](this.chatModes[r.data.channel]);
        break;
      case l.Error:
        e(this, u).close();
        break;
      case l.Whisper:
        r.data.self = r.data.username === e(this, R);
        break;
      case l.Chat:
        r.data.self = r.data.username === e(this, R), this.handlers[l.Reply] && r.data.extra["reply-parent-msg-id"] && this.handlers[l.Reply]({
          ...r.data,
          parentId: r.data.extra["reply-parent-msg-id"],
          parentUserId: r.data.extra["reply-parent-user-id"],
          parentUser: r.data.extra["reply-parent-user-login"],
          parentMessage: r.data.extra["reply-parent-msg-body"],
          parentDisplayName: r.data.extra["reply-parent-display-name"] || r.data.extra["reply-parent-user-login"]
        });
        break;
    }
}, G = new WeakSet(), Y = function(r) {
  if (!e(this, u) || !e(this, I, S))
    return;
  const s = r.data.trim().split(`\r
`);
  for (const i of s) {
    const t = Oa(Ra(i));
    t && t.type !== l.None && (M(this, V, la).call(this, t), this.handlers[t.type] && this.handlers[t.type](t.data), this.handlers[l.All] && this.handlers[l.All]({
      event: t.type,
      ...t.data
    }));
  }
};
let o;
function f(a) {
  if (a) {
    const r = a.split("/"), s = {};
    for (const i of r) {
      const [t, n] = i.split(":");
      s[t] = n.split(",");
    }
    return s;
  }
  return null;
}
function h(a) {
  const r = {};
  for (const s in a.extra)
    a.extra[s] === "" ? r[s] = null : a.extra[s] === "1" ? r[s] = !0 : a.extra[s] === "0" ? r[s] = !1 : r[s] = a.extra[s];
  return r["badge-info-raw"] = r["badge-info"], r["badge-info"] = a.userBadgeInfo || null, r["badges-raw"] = r.badges, r.badges = a.userBadges || null, r["emotes-raw"] = r.emotes, r.emotes = f(a.messageEmotes), r.username = a.username, r["message-type"] = a.messageType, r;
}
const g = {
  version: () => "2.0.0",
  latency: () => o ? o.latency : -1,
  getInstance: () => o,
  onConnected: (a, r, s) => {
    o && o.debug && console.debug("onConnected default handler");
  },
  onReconnect: (a) => {
    o && o.debug && console.debug("onReconnect default handler");
  },
  onError: (a) => {
    console.error("Error:", a);
  },
  onCommand: (a, r, s, i, t) => {
    o && o.debug && console.debug("onCommand default handler");
  },
  onChat: (a, r, s, i, t) => {
    o && o.debug && console.debug("onChat default handler");
  },
  onCheer: (a, r, s, i, t) => {
    o && o.debug && console.debug("onCheer default handler");
  },
  onWhisper: (a, r, s, i, t) => {
    o && o.debug && console.debug("onWhisper default handler");
  },
  onSub: (a, r, s, i) => {
    o && o.debug && console.debug("onSub default handler");
  },
  onResub: (a, r, s, i, t, n) => {
    o && o.debug && console.debug("onResub default handler");
  },
  onSubGift: (a, r, s, i, t, n) => {
    o && o.debug && console.debug("onSubGift default handler");
  },
  onSubMysteryGift: (a, r, s, i, t) => {
    o && o.debug && console.debug("onSubMysteryGift default handler");
  },
  onGiftSubContinue: (a, r, s) => {
    o && o.debug && console.debug("onGiftSubContinue default handler");
  },
  onTimeout: (a, r, s) => {
    o && o.debug && console.debug("onTimeout default handler");
  },
  onBan: (a, r) => {
    o && o.debug && console.debug("onBan default handler");
  },
  onMessageDeleted: (a, r) => {
    o && o.debug && console.debug("onMessageDeleted default handler");
  },
  onRaid: (a, r, s) => {
    o && o.debug && console.debug("onRaid default handler");
  },
  onUnraid: (a, r) => {
    o && o.debug && console.debug("onUnraid default handler");
  },
  simulateIRCMessage: (a) => {
    o && o.simulateIRCMessage(a);
  },
  Init: (a, r, s, i) => {
    o = new Wa(a, r, s, i), o.on(l.Connect, (t) => {
      g.onConnected(t.address, t.port, t.isFirstConnect);
    }), o.on(l.Reconnect, (t) => {
      console.log("RECONNECT"), g.onReconnect(t.reconnectCount);
    }), o.on(l.Error, (t) => {
      g.onError(t);
    }), o.on(l.Command, (t) => {
      var n;
      g.onCommand(t.displayName || t.username, t.command, t.message, t.flags, { ...t, userState: h(t), extra: null, flags: (n = t.extra) == null ? void 0 : n.flags, roomId: t.channelId, messageEmotes: f(t.messageEmotes) });
    }), o.on(l.Chat, (t) => {
      var n;
      g.onChat(t.displayName || t.username, t.message, t.flags, t.self, { ...t, userState: h(t), extra: null, flags: (n = t.extra) == null ? void 0 : n.flags, roomId: t.channelId, messageEmotes: f(t.messageEmotes) });
    }), o.on(l.Whisper, (t) => {
      var n;
      g.onWhisper(t.displayName || t.username, t.message, t.flags, t.self, { ...t, userState: h(t), extra: null, flags: (n = t.extra) == null ? void 0 : n.flags, channel: t.username, roomId: t.channelId, messageEmotes: f(t.messageEmotes) });
    }), o.on(l.Cheer, (t) => {
      var n;
      g.onCheer(t.displayName || t.username, t.message, t.bits, t.flags, { ...t, userState: h(t), extra: null, flags: (n = t.extra) == null ? void 0 : n.flags, roomId: t.channelId, messageEmotes: f(t.messageEmotes) });
    }), o.on(l.Subscribe, (t) => {
      var n;
      g.onSub(t.displayName || t.username, t.message, { prime: t.subPlan === "Prime", plan: t.subPlan, planName: t.subPlanName || null }, { ...t, userState: h(t), extra: null, flags: (n = t.extra) == null ? void 0 : n.flags, roomId: t.channelId, messageEmotes: f(t.messageEmotes) });
    }), o.on(l.Resubscribe, (t) => {
      var n;
      g.onResub(t.displayName || t.username, t.message, t.streakMonths || 0, t.cumulativeMonths, { prime: t.subPlan === "Prime", plan: t.subPlan, planName: t.subPlanName || null }, { ...t, userState: h(t), extra: null, flags: (n = t.extra) == null ? void 0 : n.flags, roomId: t.channelId, messageEmotes: f(t.messageEmotes) });
    }), o.on(l.SubGift, (t) => {
      var n;
      g.onSubGift(t.displayName || t.username, t.streakMonths || 0, t.recipientDisplayName, t.senderCount, { prime: t.subPlan === "Prime", plan: t.subPlan, planName: t.subPlanName || null }, { ...t, userState: h(t), extra: null, flags: (n = t.extra) == null ? void 0 : n.flags, roomId: t.channelId, messageEmotes: f(t.messageEmotes) });
    }), o.on(l.MysterySubGift, (t) => {
      var n;
      g.onSubMysteryGift(t.displayName || t.username, t.giftCount, t.senderCount, { prime: t.subPlan === "Prime", plan: t.subPlan, planName: t.subPlanName || null }, { ...t, userState: h(t), extra: null, flags: (n = t.extra) == null ? void 0 : n.flags, roomId: t.channelId, messageEmotes: f(t.messageEmotes), userMassGiftCount: t.giftCount });
    }), o.on(l.SubGiftContinue, (t) => {
      var n;
      g.onGiftSubContinue(t.displayName || t.username, t.gifterDisplayName, { ...t, userState: h(t), extra: null, flags: (n = t.extra) == null ? void 0 : n.flags, roomId: t.channelId, messageEmotes: f(t.messageEmotes) });
    }), o.on(l.Timeout, (t) => {
      var n;
      g.onTimeout(t.displayName || t.username, t.duration, { ...t, userState: h(t), extra: null, flags: (n = t.extra) == null ? void 0 : n.flags, roomId: t.channelId, messageEmotes: f(t.messageEmotes), timedOutUserId: t.userId });
    }), o.on(l.Ban, (t) => {
      var n;
      g.onBan(t.displayName || t.username, { ...t, userState: h(t), extra: null, flags: (n = t.extra) == null ? void 0 : n.flags, roomId: t.channelId, messageEmotes: f(t.messageEmotes), bannedUserId: t.userId });
    }), o.on(l.MessageDeleted, (t) => {
      var n;
      g.onMessageDeleted(t.id, { ...t, userState: h(t), extra: null, flags: (n = t.extra) == null ? void 0 : n.flags, roomId: t.channelId, messageEmotes: f(t.messageEmotes) });
    }), o.on(l.Raid, (t) => {
      var n;
      g.onRaid(t.displayName || t.username, t.viewers, { ...t, userState: h(t), extra: null, flags: (n = t.extra) == null ? void 0 : n.flags, roomId: t.channelId, messageEmotes: f(t.messageEmotes) });
    }), o.on(l.Unraid, (t) => {
      var n;
      g.onUnraid(t.channel, { ...t, userState: h(t), extra: null, flags: (n = t.extra) == null ? void 0 : n.flags, roomId: t.channelId, messageEmotes: f(t.messageEmotes) });
    });
  }
};
typeof module < "u" && module.exports && (module.exports = g);
typeof window < "u" && (window.ComfyJSNew = g);
//# sourceMappingURL=comfy.min.mjs.map
