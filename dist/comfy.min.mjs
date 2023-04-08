var K = (a, r, s) => {
  if (!r.has(a))
    throw TypeError("Cannot " + s);
};
var n = (a, r, s) => (K(a, r, "read from private field"), s ? s.call(a) : r.get(a)), p = (a, r, s) => {
  if (r.has(a))
    throw TypeError("Cannot add the same private member more than once");
  r instanceof WeakSet ? r.add(a) : r.set(a, s);
}, N = (a, r, s, e) => (K(a, r, "write to private field"), e ? e.call(a, s) : r.set(a, s), s);
var M = (a, r, s) => (K(a, r, "access private method"), s);
function Sa(a) {
  return a.replace(/\\(.)/g, (r, s) => {
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
function z(a, r) {
  const s = a.indexOf(" ", r);
  return {
    component: a.slice(r + 1, s),
    nextIndex: s + 1
  };
}
function Na(a) {
  const r = {
    raw: a,
    tags: {},
    source: null,
    command: null,
    parameters: null
  };
  let s = 0;
  if (a[0] === "@") {
    const { component: e, nextIndex: t } = z(a, 0);
    for (const d of e.split(";")) {
      const C = d.indexOf("="), g = d.substring(0, C), u = d.substring(C + 1);
      r.tags[g] = Sa(u);
    }
    s = t;
  }
  if (a[s] === ":") {
    const { component: e, nextIndex: t } = z(a, s);
    r.source = e, s = t;
  }
  if (s < a.length) {
    const e = a.slice(s).trim(), t = e.indexOf(":");
    r.command = e.slice(0, t < 0 ? void 0 : t).trim();
    const d = a.indexOf(":", s);
    d >= 0 && (r.parameters = a.slice(d + 1));
  }
  return r;
}
const Ma = globalThis.WebSocket || require("ws");
function Pa(a, r) {
  return new Ma(a, r);
}
var l = /* @__PURE__ */ ((a) => (a.None = "none", a.Ping = "Ping", a.Pong = "Pong", a.Connect = "connect", a.Reconnected = "reconnect", a.Error = "error", a.Warning = "Warning", a.ChatMode = "chatmode", a.ClearChat = "ClearChat", a.RoomState = "roomstate", a.GlobalUserState = "globaluserstate", a.UserState = "userstate", a.Notice = "notice", a.Join = "join", a.Leave = "leave", a.Command = "command", a.Chat = "message", a.Reply = "reply", a.Whisper = "whisper", a.Announcement = "announcement", a.Cheer = "Cheer", a.Subscribe = "sub", a.Resubscribe = "resub", a.SubGift = "subgift", a.AnonymousSubGift = "anonsubgift", a.MysterySubGift = "submysterygift", a.SubGiftContinue = "subgiftcontinue", a.Raid = "raid", a.Timeout = "Timeout", a.Ban = "Ban", a.MessageDeleted = "MessageDeleted", a.All = "all", a))(l || {});
const w = {
  "": "Normal",
  admin: "Admin",
  global_mod: "Global Mod",
  staff: "Staff",
  mod: "Moderator"
};
function k(a) {
  const r = a.split("!");
  return r.length > 1 ? r[0] : void 0;
}
function m(a) {
  if (!a)
    return;
  const r = a.split(","), s = {};
  for (const e of r) {
    const [t, d] = e.split("/");
    s[t] = d;
  }
  return s;
}
function Ra(a, r) {
  var X, Y;
  const s = (X = a.parameters) == null ? void 0 : X.startsWith("ACTION"), e = s ? (Y = a.parameters) == null ? void 0 : Y.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1] : a.parameters, t = a.tags.id, d = a.tags["room-id"], C = a.tags["user-id"], g = k(a.source), u = a.tags["display-name"] || a.tags.login || g, S = w[a.tags["user-type"]], j = m(a.tags["badge-info"] || ""), b = m(a.tags.badges || ""), J = a.tags.color || void 0, H = a.tags.emotes, O = a.tags.flags, ia = g === r, ua = a.tags.mod === "1", la = b ? !!b.founder : !1, Q = a.tags.subscriber === "1", da = a.tags.turbo === "1", ga = b ? !!b.vip : !1, pa = b ? !!b.premium : !1, ma = b ? !!["partner"] : !1, fa = b ? !!b["game-developer"] : !1, _ = parseInt(a.tags["tmi-sent-ts"]), U = a.tags["emote-only"] === "1", ca = a.tags["msg-id"] === "highlighted-message", ba = a.tags["msg-id"] === "skip-subs-mode-message", A = a.tags["custom-reward-id"] || null, ha = a.tags["first-msg"] === "1", Ia = a.tags["returning-chatter"] === "1", q = {
    broadcaster: ia,
    mod: ua,
    founder: la,
    subscriber: Q,
    vip: ga,
    partner: ma,
    gameDeveloper: fa,
    turbo: da,
    prime: pa,
    highlighted: ca,
    skipSubsMode: ba,
    customReward: !!A,
    emoteOnly: U,
    firstMessage: ha,
    returningChatter: Ia
  };
  if (a.tags.bits)
    return {
      type: "Cheer",
      data: {
        channel: r,
        channelId: d,
        displayName: u,
        username: g,
        userId: C,
        userType: S,
        id: t,
        message: a.parameters,
        messageType: s ? "action" : "chat",
        // TODO: Can bits be an action?
        messageEmotes: H,
        messageFlags: O,
        isEmoteOnly: U,
        subscriber: Q,
        userColor: J,
        userBadgeInfo: j,
        userBadges: b,
        customRewardId: A,
        flags: q,
        bits: parseInt(a.tags.bits),
        timestamp: _,
        extra: {
          ...a.tags,
          flags: O || null
        }
      }
    };
  if (e != null && e.startsWith("!")) {
    const Z = e.split(/ (.*)/), ya = Z[0].substring(1).toLowerCase(), Ca = Z[1] || "";
    return {
      type: "command",
      data: {
        channel: r,
        channelId: d,
        displayName: u,
        username: g,
        userId: C,
        userType: S,
        command: ya,
        id: t,
        message: Ca,
        messageType: s ? "action" : "chat",
        messageEmotes: H,
        messageFlags: O,
        isEmoteOnly: U,
        userColor: J,
        userBadgeInfo: j,
        userBadges: b,
        customRewardId: A,
        flags: q,
        timestamp: _,
        extra: {
          ...a.tags,
          flags: O || null
        }
      }
    };
  } else
    return {
      type: "message",
      data: {
        channel: r,
        channelId: d,
        displayName: u,
        username: g,
        userId: C,
        userType: S,
        id: t,
        message: e,
        messageType: s ? "action" : "chat",
        messageEmotes: H,
        messageFlags: O,
        isEmoteOnly: U,
        userColor: J,
        userBadgeInfo: j,
        userBadges: b,
        customRewardId: A,
        flags: q,
        timestamp: _,
        extra: {
          ...a.tags,
          flags: O || null
        }
      }
    };
}
function Oa(a) {
  var r, s, e, t, d, C;
  try {
    if (a.command) {
      const g = a.command.split(" "), u = g.length > 1 ? g[1].substring(1) : void 0;
      switch (g[0]) {
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
            data: { channel: u, username: k(a.source) }
          };
        case "PART":
          return {
            type: "leave",
            data: { channel: u, username: k(a.source) }
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
              channel: u,
              channelId: a.tags["room-id"]
            }
          };
        case "GLOBALUSERSTATE":
          return {
            type: "globaluserstate",
            data: {
              displayName: a.tags["display-name"],
              userId: a.tags["user-id"],
              userType: w[a.tags["user-type"]],
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
              channel: u,
              displayName: a.tags["display-name"],
              userId: a.tags["user-id"],
              userType: w[a.tags["user-type"]],
              color: a.tags.color,
              badgeInfo: m(a.tags["badge-info"] || ""),
              badges: m(a.tags.badges || ""),
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
                  channel: u,
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
                  channel: u,
                  channelId: a.tags["room-id"],
                  username: a.tags.login,
                  userId: a.tags["user-id"],
                  userBadgeInfo: m(a.tags["badge-info"] || ""),
                  userBadges: m(a.tags.badges || ""),
                  userColor: a.tags.color || void 0,
                  message: a.parameters,
                  messageType: a.tags["msg-id"],
                  messageEmotes: a.tags.emotes,
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
                  channel: u,
                  channelId: a.tags["room-id"],
                  username: a.tags.login,
                  userId: a.tags["user-id"],
                  userBadgeInfo: m(a.tags["badge-info"] || ""),
                  userBadges: m(a.tags.badges || ""),
                  userColor: a.tags.color || void 0,
                  message: a.parameters,
                  messageType: a.tags["msg-id"],
                  messageEmotes: a.tags.emotes,
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
                  channel: u,
                  channelId: a.tags["room-id"],
                  username: a.tags.login,
                  userId: a.tags["user-id"],
                  userBadgeInfo: m(a.tags["badge-info"] || ""),
                  userBadges: m(a.tags.badges || ""),
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
                  channel: u,
                  channelId: a.tags["room-id"],
                  username: a.tags.login,
                  userId: a.tags["user-id"],
                  userBadgeInfo: m(a.tags["badge-info"] || ""),
                  userBadges: m(a.tags.badges || ""),
                  userColor: a.tags.color || void 0,
                  messageType: a.tags["msg-id"],
                  timestamp: parseInt(a.tags["tmi-sent-ts"]),
                  extra: a.tags
                }
              };
            case "giftsubcontinue":
              return {
                type: "subgiftcontinue",
                data: {
                  id: a.tags.id,
                  displayName: a.tags["display-name"] || a.tags.login,
                  gifterDisplayName: a.tags["msg-param-sender-name"] || a.tags["msg-param-sender-login"],
                  gifterUsername: a.tags["msg-param-sender-login"],
                  channel: u,
                  channelId: a.tags["room-id"],
                  username: a.tags.login,
                  userId: a.tags["user-id"],
                  userBadgeInfo: m(a.tags["badge-info"] || ""),
                  userBadges: m(a.tags.badges || ""),
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
                  channel: u,
                  channelId: a.tags["room-id"],
                  username: a.tags["msg-param-login"] || a.tags.login,
                  userId: a.tags["user-id"],
                  messageType: a.tags["msg-id"],
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
          return console.log(a), console.log("Channel:", u, a.parameters), {
            type: "whisper",
            data: {
              displayName: a.tags["display-name"] || a.tags.login || k(a.source),
              username: k(a.source),
              userId: a.tags["user-id"],
              userType: w[a.tags["user-type"]],
              color: a.tags.color,
              badges: a.tags.badges,
              emotes: a.tags.emotes,
              turbo: a.tags.turbo === "1",
              threadId: a.tags["thread-id"],
              messageId: a.tags["message-id"],
              message: a.parameters,
              messageType: "whisper",
              extra: a.tags
            }
          };
        case "NOTICE":
          return (r = a.parameters) != null && r.includes("Login unsuccessful") || (s = a.parameters) != null && s.includes("Login authentication failed") || (e = a.parameters) != null && e.includes("Error logging in") || (t = a.parameters) != null && t.includes("Improperly formatted auth") || (d = a.parameters) != null && d.includes("Invalid NICK") || (C = a.parameters) != null && C.includes("Invalid CAP REQ") ? {
            type: "error",
            data: {
              channel: u,
              message: a.parameters
            }
          } : {
            type: "notice",
            data: {
              channel: u,
              msgId: a.tags["msg-id"],
              message: a.parameters
            }
          };
        case "CLEARCHAT":
          return a.tags["target-user-id"] ? a.tags["ban-duration"] ? {
            type: "Timeout",
            data: {
              channel: u,
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
              channel: u,
              channelId: a.tags["room-id"],
              username: a.parameters,
              userId: a.tags["target-user-id"],
              timestamp: parseInt(a.tags["tmi-sent-ts"]),
              extra: a.tags
            }
          } : {
            type: "ClearChat",
            data: {
              channel: u,
              channelId: a.tags["room-id"],
              timestamp: parseInt(a.tags["tmi-sent-ts"]),
              extra: a.tags
            }
          };
        case "CLEARMSG":
          return {
            type: "MessageDeleted",
            data: {
              channel: u,
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
          return Ra(a, u);
        case "RECONNECT":
          console.log("The Twitch IRC server is about to terminate the connection for maintenance.");
          break;
        default:
          {
            const S = parseInt(g[0]);
            if (S >= 400)
              return console.debug(`Error IRC command: ${S}`, a), null;
            switch (S) {
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
                return { type: "connect", data: { username: g[1] } };
              default:
                return console.debug("Unsupported numeric command", S), null;
            }
          }
          break;
      }
    } else
      console.debug("Unprocessed IRC message:", a.raw);
  } catch (g) {
    return console.error(g), {
      type: "Warning",
      data: g
    };
  }
  return console.log(a), null;
}
function Ea(a) {
  a.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
}
function Ga(a, r, s) {
  const e = s ? r : `justinfan${Math.floor(Math.random() * 99998999 + 1e3)}`, t = s || "INSTAFLUFF";
  a.send(`PASS ${t}`), a.send(`NICK ${e}`);
}
function x(a, r) {
  a.send(`JOIN #${r}`);
}
function ka(a, r) {
  a.send(`PART #${r}`);
}
function Ba(a) {
  a.send("PING");
}
function Ua(a) {
  a.send("PONG");
}
function Aa(a, r, s) {
  a.send(`PRIVMSG #${r} :${s}`);
}
function wa(a, r, s, e) {
  a.send(`@reply-parent-msg-id=${s} PRIVMSG #${r} :${e}`);
}
var i, R, B, P, E, G, D, c, y, v, aa, L, ta, W, ra, $, sa, F, na, T, ea, V, oa;
class Da {
  constructor(r, s, e, t) {
    p(this, G);
    p(this, c);
    p(this, v);
    p(this, L);
    p(this, W);
    p(this, $);
    p(this, F);
    p(this, T);
    p(this, V);
    p(this, i, void 0);
    p(this, R, void 0);
    p(this, B, void 0);
    p(this, P, void 0);
    p(this, E, void 0);
    N(this, E, 0), this.chatModes = {}, this.handlers = {}, N(this, R, r), N(this, B, s), this.debug = !!t, (typeof e == "string" || e instanceof String) && (e = [e]), this.channels = e || [r], M(this, v, aa).call(this);
  }
  get version() {
    return "2.0.0";
  }
  on(r, s) {
    this.handlers[r] = s;
  }
  say(r, s) {
    n(this, i) && n(this, c, y) && Aa(n(this, i), s || n(this, G, D), r);
  }
  reply(r, s, e) {
    n(this, i) && n(this, c, y) && wa(n(this, i), e || n(this, G, D), r, s);
  }
  join(r) {
    n(this, i) && n(this, c, y) && x(n(this, i), r);
  }
  leave(r) {
    n(this, i) && n(this, c, y) && ka(n(this, i), r);
  }
  deleteMessage(r, s) {
    n(this, i) && n(this, c, y);
  }
  destroy() {
    n(this, i) && n(this, i).readyState !== n(this, i).CLOSED && n(this, i).close();
  }
}
i = new WeakMap(), R = new WeakMap(), B = new WeakMap(), P = new WeakMap(), E = new WeakMap(), G = new WeakSet(), D = function() {
  return this.channels[0];
}, c = new WeakSet(), y = function() {
  return n(this, i) && n(this, i).readyState === n(this, i).OPEN;
}, v = new WeakSet(), aa = function() {
  if (n(this, c, y))
    return;
  N(this, i, Pa("wss://irc-ws.chat.twitch.tv:443", "irc")), n(this, i).onopen = () => {
    M(this, L, ta).call(this);
  }, n(this, i).onmessage = (s) => {
    M(this, V, oa).call(this, s);
  }, n(this, i).onerror = (s) => {
    M(this, W, ra).call(this, s);
  }, n(this, i).onclose = (s) => {
    M(this, $, sa).call(this, s);
  };
}, L = new WeakSet(), ta = function() {
  n(this, i) && n(this, c, y) && (Ea(n(this, i)), Ga(n(this, i), n(this, R), n(this, B)), x(n(this, i), n(this, G, D)));
}, W = new WeakSet(), ra = function(r) {
  console.error("ERROR", r);
}, $ = new WeakSet(), sa = function(r) {
  console.info("CLOSE", r), n(this, P) && clearInterval(n(this, P));
}, F = new WeakSet(), na = function() {
  n(this, i) && n(this, c, y) && (N(this, E, Date.now()), Ba(n(this, i)));
}, T = new WeakSet(), ea = function(r) {
  if (n(this, i) && n(this, c, y))
    switch (r.type) {
      case l.Connect:
        N(this, R, r.data.username), n(this, P) && clearInterval(n(this, P)), N(this, P, setInterval(() => {
          M(this, F, na).call(this);
        }, 6e4));
        break;
      case l.Ping:
        Ua(n(this, i));
        break;
      case l.Pong:
        r.data = r.data || {}, r.data.latency = Date.now() - n(this, E);
        break;
      case l.RoomState:
        this.chatModes[r.data.channel] = {
          ...this.chatModes[r.data.channel],
          ...r.data
        }, this.handlers[l.ChatMode] && this.handlers[l.ChatMode](this.chatModes[r.data.channel]);
        break;
      case l.Error:
        n(this, i).close();
        break;
      case l.Chat:
        r.data.self = r.data.username === n(this, R), this.handlers[l.Reply] && r.data.extra["reply-parent-msg-id"] && this.handlers[l.Reply]({
          ...r.data,
          parentId: r.data.extra["reply-parent-msg-id"],
          parentUserId: r.data.extra["reply-parent-user-id"],
          parentUser: r.data.extra["reply-parent-user-login"],
          parentMessage: r.data.extra["reply-parent-msg-body"],
          parentDisplayName: r.data.extra["reply-parent-display-name"] || r.data.extra["reply-parent-user-login"]
        });
        break;
    }
}, V = new WeakSet(), oa = function(r) {
  if (!n(this, i) || !n(this, c, y))
    return;
  const s = r.data.trim().split(`\r
`);
  for (const e of s) {
    const t = Oa(Na(e));
    t && t.type !== l.None && (M(this, T, ea).call(this, t), this.handlers[t.type] && this.handlers[t.type](t.data), this.handlers[l.All] && this.handlers[l.All]({
      event: t.type,
      ...t.data
    }));
  }
};
let o;
function h(a) {
  if (a) {
    const r = a.split("/"), s = {};
    for (const e of r) {
      const [t, d] = e.split(":");
      s[t] = d.split(",");
    }
    return s;
  }
  return null;
}
function I(a) {
  const r = {};
  for (const s in a.extra)
    a.extra[s] === "" ? r[s] = null : a.extra[s] === "1" ? r[s] = !0 : a.extra[s] === "0" ? r[s] = !1 : r[s] = a.extra[s];
  return r["badge-info-raw"] = r["badge-info"], r["badge-info"] = a.userBadgeInfo || null, r["badges-raw"] = r.badges, r.badges = a.userBadges || null, r["emotes-raw"] = r.emotes, r.emotes = h(a.messageEmotes), r.username = a.username, r["message-type"] = a.messageType, r;
}
const f = {
  version: () => "2.0.0",
  onError: (a) => {
    console.error("Error:", a);
  },
  onCommand: (a, r, s, e, t) => {
    o && o.debug && console.debug("onCommand default handler");
  },
  onChat: (a, r, s, e, t) => {
    o && o.debug && console.debug("onChat default handler");
  },
  onCheer: (a, r, s, e, t) => {
    o && o.debug && console.debug("onCheer default handler");
  },
  onWhisper: (a, r, s, e, t) => {
    o && o.debug && console.debug("onWhisper default handler");
  },
  onSub: (a, r, s, e) => {
    o && o.debug && console.debug("onSub default handler");
  },
  onResub: (a, r, s, e, t, d) => {
    o && o.debug && console.debug("onResub default handler");
  },
  onSubGift: (a, r, s, e, t, d) => {
    o && o.debug && console.debug("onSubGift default handler");
  },
  onSubMysteryGift: (a, r, s, e, t) => {
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
  onRaid: (a, r, s) => {
    o && o.debug && console.debug("onRaid default handler");
  },
  Init: (a, r, s, e) => {
    o = new Da(a, r, s, e), o.on(l.Command, (t) => {
      f.onCommand(t.displayName || t.username, t.command, t.message, t.flags, { ...t, userState: I(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: h(t.messageEmotes) });
    }), o.on(l.Chat, (t) => {
      f.onChat(t.displayName || t.username, t.message, t.flags, t.self, { ...t, userState: I(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: h(t.messageEmotes) });
    }), o.on(l.Cheer, (t) => {
      f.onCheer(t.displayName || t.username, t.message, t.bits, t.flags, { ...t, userState: I(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: h(t.messageEmotes) });
    }), o.on(l.Subscribe, (t) => {
      console.log("SUB", t), f.onSub(t.displayName || t.username, t.message, { prime: t.subPlan === "Prime", plan: t.subPlan, planName: t.subPlanName || null }, { ...t, userState: I(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: h(t.messageEmotes) });
    }), o.on(l.Resubscribe, (t) => {
      console.log("RESUB", t), f.onResub(t.displayName || t.username, t.message, t.streakMonths || 0, t.cumulativeMonths, { prime: t.subPlan === "Prime", plan: t.subPlan, planName: t.subPlanName || null }, { ...t, userState: I(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: h(t.messageEmotes) });
    }), o.on(l.SubGift, (t) => {
      console.log("SUBGIFT"), f.onSubGift(t.displayName || t.username, t.streakMonths || 0, t.recipientDisplayName, t.senderCount, { prime: t.subPlan === "Prime", plan: t.subPlan, planName: t.subPlanName || null }, { ...t, userState: I(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: h(t.messageEmotes) });
    }), o.on(l.MysterySubGift, (t) => {
      f.onSubMysteryGift(t.displayName || t.username, t.giftCount, t.senderCount, { prime: t.subPlan === "Prime", plan: t.subPlan, planName: t.subPlanName || null }, { ...t, userState: I(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: h(t.messageEmotes), userMassGiftCount: t.giftCount });
    }), o.on(l.SubGiftContinue, (t) => {
      console.log("SUBGIFTCONTINUE"), f.onGiftSubContinue(t.displayName || t.username, t.gifterDisplayName, { ...t, userState: I(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: h(t.messageEmotes) });
    }), o.on(l.Timeout, (t) => {
      f.onTimeout(t.displayName || t.username, t.duration, { ...t, userState: I(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: h(t.messageEmotes), timedOutUserId: t.userId });
    }), o.on(l.Ban, (t) => {
      f.onBan(t.displayName || t.username, { ...t, userState: I(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: h(t.messageEmotes), bannedUserId: t.userId });
    }), o.on(l.Raid, (t) => {
      f.onRaid(t.displayName || t.username, t.viewers, { ...t, userState: I(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: h(t.messageEmotes) });
    });
  }
};
typeof module < "u" && module.exports && (module.exports = f);
typeof window < "u" && (window.ComfyJSNew = f);
//# sourceMappingURL=comfy.min.mjs.map
