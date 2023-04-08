var K = (a, r, s) => {
  if (!r.has(a))
    throw TypeError("Cannot " + s);
};
var n = (a, r, s) => (K(a, r, "read from private field"), s ? s.call(a) : r.get(a)), f = (a, r, s) => {
  if (r.has(a))
    throw TypeError("Cannot add the same private member more than once");
  r instanceof WeakSet ? r.add(a) : r.set(a, s);
}, M = (a, r, s, e) => (K(a, r, "write to private field"), e ? e.call(a, s) : r.set(a, s), s);
var P = (a, r, s) => (K(a, r, "access private method"), s);
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
      const S = d.indexOf("="), p = d.substring(0, S), l = d.substring(S + 1);
      r.tags[p] = Sa(l);
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
var u = /* @__PURE__ */ ((a) => (a.None = "none", a.Ping = "Ping", a.Pong = "Pong", a.Connect = "connect", a.Reconnect = "reconnect", a.Error = "error", a.Warning = "Warning", a.ChatMode = "chatmode", a.ClearChat = "ClearChat", a.RoomState = "roomstate", a.GlobalUserState = "globaluserstate", a.UserState = "userstate", a.Notice = "notice", a.Join = "join", a.Leave = "leave", a.Command = "command", a.Chat = "message", a.Reply = "reply", a.Whisper = "whisper", a.Announcement = "announcement", a.Cheer = "Cheer", a.Subscribe = "sub", a.Resubscribe = "resub", a.SubGift = "subgift", a.AnonymousSubGift = "anonsubgift", a.MysterySubGift = "submysterygift", a.SubGiftContinue = "subgiftcontinue", a.Raid = "raid", a.Timeout = "Timeout", a.Ban = "Ban", a.MessageDeleted = "MessageDeleted", a.All = "all", a))(u || {});
const C = {
  "": "Normal",
  admin: "Admin",
  global_mod: "Global Mod",
  staff: "Staff",
  mod: "Moderator"
};
function B(a) {
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
  const s = (X = a.parameters) == null ? void 0 : X.startsWith("ACTION"), e = s ? (Y = a.parameters) == null ? void 0 : Y.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1] : a.parameters, t = a.tags.id, d = a.tags["room-id"], S = a.tags["user-id"], p = B(a.source), l = a.tags["display-name"] || a.tags.login || p, N = C[a.tags["user-type"]], j = m(a.tags["badge-info"] || ""), I = m(a.tags.badges || ""), J = a.tags.color || void 0, H = a.tags.emotes, O = a.tags.flags, ia = p === r, ua = a.tags.mod === "1", la = I ? !!I.founder : !1, Q = a.tags.subscriber === "1", da = a.tags.turbo === "1", ga = I ? !!I.vip : !1, pa = I ? !!I.premium : !1, ma = I ? !!["partner"] : !1, fa = I ? !!I["game-developer"] : !1, _ = parseInt(a.tags["tmi-sent-ts"]), A = a.tags["emote-only"] === "1", ca = a.tags["msg-id"] === "highlighted-message", ba = a.tags["msg-id"] === "skip-subs-mode-message", D = a.tags["custom-reward-id"] || null, ha = a.tags["first-msg"] === "1", Ia = a.tags["returning-chatter"] === "1", q = {
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
    customReward: !!D,
    emoteOnly: A,
    firstMessage: ha,
    returningChatter: Ia
  };
  if (a.tags.bits)
    return {
      type: "Cheer",
      data: {
        channel: r,
        channelId: d,
        displayName: l,
        username: p,
        userId: S,
        userType: N,
        id: t,
        message: a.parameters,
        messageType: s ? "action" : "chat",
        // TODO: Can bits be an action?
        messageEmotes: H,
        messageFlags: O,
        isEmoteOnly: A,
        subscriber: Q,
        userColor: J,
        userBadgeInfo: j,
        userBadges: I,
        customRewardId: D,
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
        displayName: l,
        username: p,
        userId: S,
        userType: N,
        command: ya,
        id: t,
        message: Ca,
        messageType: s ? "action" : "chat",
        messageEmotes: H,
        messageFlags: O,
        isEmoteOnly: A,
        userColor: J,
        userBadgeInfo: j,
        userBadges: I,
        customRewardId: D,
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
        displayName: l,
        username: p,
        userId: S,
        userType: N,
        id: t,
        message: e,
        messageType: s ? "action" : "chat",
        messageEmotes: H,
        messageFlags: O,
        isEmoteOnly: A,
        userColor: J,
        userBadgeInfo: j,
        userBadges: I,
        customRewardId: D,
        flags: q,
        timestamp: _,
        extra: {
          ...a.tags,
          flags: O || null
        }
      }
    };
}
function Ea(a) {
  var r, s, e, t, d, S;
  try {
    if (a.command) {
      const p = a.command.split(" "), l = p.length > 1 ? p[1].substring(1) : void 0;
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
            data: { channel: l, username: B(a.source) }
          };
        case "PART":
          return {
            type: "leave",
            data: { channel: l, username: B(a.source) }
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
              channel: l,
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
              channel: l,
              displayName: a.tags["display-name"],
              userId: a.tags["user-id"],
              userType: C[a.tags["user-type"]],
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
                  channel: l,
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
                  channel: l,
                  channelId: a.tags["room-id"],
                  username: a.tags.login,
                  userId: a.tags["user-id"],
                  userType: C[a.tags["user-type"]],
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
                  channel: l,
                  channelId: a.tags["room-id"],
                  username: a.tags.login,
                  userId: a.tags["user-id"],
                  userType: C[a.tags["user-type"]],
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
                  channel: l,
                  channelId: a.tags["room-id"],
                  username: a.tags.login,
                  userId: a.tags["user-id"],
                  userType: C[a.tags["user-type"]],
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
                  channel: l,
                  channelId: a.tags["room-id"],
                  username: a.tags.login,
                  userId: a.tags["user-id"],
                  userType: C[a.tags["user-type"]],
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
                  channel: l,
                  channelId: a.tags["room-id"],
                  username: a.tags.login,
                  userId: a.tags["user-id"],
                  userType: C[a.tags["user-type"]],
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
                  channel: l,
                  channelId: a.tags["room-id"],
                  username: a.tags["msg-param-login"] || a.tags.login,
                  userId: a.tags["user-id"],
                  userType: C[a.tags["user-type"]],
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
          return {
            type: "whisper",
            data: {
              displayName: a.tags["display-name"] || a.tags.login || B(a.source),
              username: B(a.source),
              userId: a.tags["user-id"],
              userType: C[a.tags["user-type"]],
              userColor: a.tags.color || void 0,
              userBadgeInfo: m(a.tags["badge-info"] || ""),
              userBadges: m(a.tags.badges || ""),
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
          return (r = a.parameters) != null && r.includes("Login unsuccessful") || (s = a.parameters) != null && s.includes("Login authentication failed") || (e = a.parameters) != null && e.includes("Error logging in") || (t = a.parameters) != null && t.includes("Improperly formatted auth") || (d = a.parameters) != null && d.includes("Invalid NICK") || (S = a.parameters) != null && S.includes("Invalid CAP REQ") ? {
            type: "error",
            data: {
              channel: l,
              message: a.parameters
            }
          } : {
            type: "notice",
            data: {
              channel: l,
              msgId: a.tags["msg-id"],
              message: a.parameters
            }
          };
        case "CLEARCHAT":
          return a.tags["target-user-id"] ? a.tags["ban-duration"] ? {
            type: "Timeout",
            data: {
              channel: l,
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
              channel: l,
              channelId: a.tags["room-id"],
              username: a.parameters,
              userId: a.tags["target-user-id"],
              timestamp: parseInt(a.tags["tmi-sent-ts"]),
              extra: a.tags
            }
          } : {
            type: "ClearChat",
            data: {
              channel: l,
              channelId: a.tags["room-id"],
              timestamp: parseInt(a.tags["tmi-sent-ts"]),
              extra: a.tags
            }
          };
        case "CLEARMSG":
          return {
            type: "MessageDeleted",
            data: {
              channel: l,
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
          return Ra(a, l);
        case "RECONNECT":
          console.log("The Twitch IRC server is about to terminate the connection for maintenance.");
          break;
        default:
          {
            const N = parseInt(p[0]);
            if (N >= 400)
              return console.debug(`Error IRC command: ${N}`, a), null;
            switch (N) {
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
                return console.debug("Unsupported numeric command", N), null;
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
function Oa(a) {
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
function Da(a, r, s, e) {
  a.send(`@reply-parent-msg-id=${s} PRIVMSG #${r} :${e}`);
}
var i, R, U, E, G, k, w, h, y, v, aa, L, ta, W, ra, T, sa, $, na, F, ea, V, oa;
class wa {
  constructor(r, s, e, t) {
    f(this, k);
    f(this, h);
    f(this, v);
    f(this, L);
    f(this, W);
    f(this, T);
    f(this, $);
    f(this, F);
    f(this, V);
    f(this, i, void 0);
    f(this, R, void 0);
    f(this, U, void 0);
    f(this, E, void 0);
    f(this, G, void 0);
    M(this, G, 0), this.reconnects = 0, this.chatModes = {}, this.handlers = {}, M(this, R, r), M(this, U, s), this.debug = !!t, (typeof e == "string" || e instanceof String) && (e = [e]), this.channels = e || [r], P(this, v, aa).call(this);
  }
  get version() {
    return "2.0.0";
  }
  on(r, s) {
    this.handlers[r] = s;
  }
  say(r, s) {
    n(this, i) && n(this, h, y) && Aa(n(this, i), s || n(this, k, w), r);
  }
  reply(r, s, e) {
    n(this, i) && n(this, h, y) && Da(n(this, i), e || n(this, k, w), r, s);
  }
  join(r) {
    n(this, i) && n(this, h, y) && x(n(this, i), r);
  }
  leave(r) {
    n(this, i) && n(this, h, y) && ka(n(this, i), r);
  }
  deleteMessage(r, s) {
    n(this, i) && n(this, h, y);
  }
  destroy() {
    n(this, i) && n(this, i).readyState !== n(this, i).CLOSED && n(this, i).close();
  }
}
i = new WeakMap(), R = new WeakMap(), U = new WeakMap(), E = new WeakMap(), G = new WeakMap(), k = new WeakSet(), w = function() {
  return this.channels[0];
}, h = new WeakSet(), y = function() {
  return n(this, i) && n(this, i).readyState === n(this, i).OPEN;
}, v = new WeakSet(), aa = function() {
  if (n(this, h, y))
    return;
  M(this, i, Pa("wss://irc-ws.chat.twitch.tv:443", "irc")), n(this, i).onopen = () => {
    P(this, L, ta).call(this);
  }, n(this, i).onmessage = (s) => {
    P(this, V, oa).call(this, s);
  }, n(this, i).onerror = (s) => {
    P(this, W, ra).call(this, s);
  }, n(this, i).onclose = (s) => {
    P(this, T, sa).call(this, s);
  };
}, L = new WeakSet(), ta = function() {
  n(this, i) && n(this, h, y) && (Oa(n(this, i)), Ga(n(this, i), n(this, R), n(this, U)), x(n(this, i), n(this, k, w)));
}, W = new WeakSet(), ra = function(r) {
  console.error("ERROR", r);
}, T = new WeakSet(), sa = function(r) {
  console.info("CLOSE", r), n(this, E) && clearInterval(n(this, E));
}, $ = new WeakSet(), na = function() {
  n(this, i) && n(this, h, y) && (M(this, G, Date.now()), Ba(n(this, i)));
}, F = new WeakSet(), ea = function(r) {
  if (n(this, i) && n(this, h, y))
    switch (r.type) {
      case u.Connect:
        M(this, R, r.data.username), n(this, E) && clearInterval(n(this, E)), M(this, E, setInterval(() => {
          P(this, $, na).call(this);
        }, 6e4));
        const s = new URL(n(this, i).url);
        r.data.address = s.host, r.data.port = s.protocol === "wss:" ? 443 : 80, r.data.isFirstConnect = this.reconnects === 0;
        break;
      case u.Ping:
        Ua(n(this, i));
        break;
      case u.Pong:
        r.data = r.data || {}, r.data.latency = Date.now() - n(this, G);
        break;
      case u.RoomState:
        this.chatModes[r.data.channel] = {
          ...this.chatModes[r.data.channel],
          ...r.data
        }, this.handlers[u.ChatMode] && this.handlers[u.ChatMode](this.chatModes[r.data.channel]);
        break;
      case u.Error:
        n(this, i).close();
        break;
      case u.Whisper:
        r.data.self = r.data.username === n(this, R);
        break;
      case u.Chat:
        r.data.self = r.data.username === n(this, R), this.handlers[u.Reply] && r.data.extra["reply-parent-msg-id"] && this.handlers[u.Reply]({
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
  if (!n(this, i) || !n(this, h, y))
    return;
  const s = r.data.trim().split(`\r
`);
  for (const e of s) {
    const t = Ea(Na(e));
    t && t.type !== u.None && (P(this, F, ea).call(this, t), this.handlers[t.type] && this.handlers[t.type](t.data), this.handlers[u.All] && this.handlers[u.All]({
      event: t.type,
      ...t.data
    }));
  }
};
let o;
function c(a) {
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
function b(a) {
  const r = {};
  for (const s in a.extra)
    a.extra[s] === "" ? r[s] = null : a.extra[s] === "1" ? r[s] = !0 : a.extra[s] === "0" ? r[s] = !1 : r[s] = a.extra[s];
  return r["badge-info-raw"] = r["badge-info"], r["badge-info"] = a.userBadgeInfo || null, r["badges-raw"] = r.badges, r.badges = a.userBadges || null, r["emotes-raw"] = r.emotes, r.emotes = c(a.messageEmotes), r.username = a.username, r["message-type"] = a.messageType, r;
}
const g = {
  version: () => "2.0.0",
  onConnected: (a, r, s) => {
    o && o.debug && console.debug("onConnected default handler");
  },
  onReconnect: (a) => {
    o && o.debug && console.debug("onReconnect default handler");
  },
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
  onMessageDeleted: (a, r) => {
    o && o.debug && console.debug("onMessageDeleted default handler");
  },
  onRaid: (a, r, s) => {
    o && o.debug && console.debug("onRaid default handler");
  },
  Init: (a, r, s, e) => {
    o = new wa(a, r, s, e), o.on(u.Connect, (t) => {
      g.onConnected(t.address, t.port, t.isFirstConnect);
    }), o.on(u.Reconnect, (t) => {
      g.onReconnect(t.reconnectCount);
    }), o.on(u.Error, (t) => {
      g.onError(t);
    }), o.on(u.Command, (t) => {
      g.onCommand(t.displayName || t.username, t.command, t.message, t.flags, { ...t, userState: b(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: c(t.messageEmotes) });
    }), o.on(u.Chat, (t) => {
      g.onChat(t.displayName || t.username, t.message, t.flags, t.self, { ...t, userState: b(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: c(t.messageEmotes) });
    }), o.on(u.Whisper, (t) => {
      g.onWhisper(t.displayName || t.username, t.message, t.flags, t.self, { ...t, userState: b(t), extra: null, flags: t.extra.flags, channel: t.username, roomId: t.channelId, messageEmotes: c(t.messageEmotes) });
    }), o.on(u.Cheer, (t) => {
      g.onCheer(t.displayName || t.username, t.message, t.bits, t.flags, { ...t, userState: b(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: c(t.messageEmotes) });
    }), o.on(u.Subscribe, (t) => {
      g.onSub(t.displayName || t.username, t.message, { prime: t.subPlan === "Prime", plan: t.subPlan, planName: t.subPlanName || null }, { ...t, userState: b(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: c(t.messageEmotes) });
    }), o.on(u.Resubscribe, (t) => {
      g.onResub(t.displayName || t.username, t.message, t.streakMonths || 0, t.cumulativeMonths, { prime: t.subPlan === "Prime", plan: t.subPlan, planName: t.subPlanName || null }, { ...t, userState: b(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: c(t.messageEmotes) });
    }), o.on(u.SubGift, (t) => {
      console.log("SUBGIFT", t), g.onSubGift(t.displayName || t.username, t.streakMonths || 0, t.recipientDisplayName, t.senderCount, { prime: t.subPlan === "Prime", plan: t.subPlan, planName: t.subPlanName || null }, { ...t, userState: b(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: c(t.messageEmotes) });
    }), o.on(u.MysterySubGift, (t) => {
      g.onSubMysteryGift(t.displayName || t.username, t.giftCount, t.senderCount, { prime: t.subPlan === "Prime", plan: t.subPlan, planName: t.subPlanName || null }, { ...t, userState: b(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: c(t.messageEmotes), userMassGiftCount: t.giftCount });
    }), o.on(u.SubGiftContinue, (t) => {
      console.log("SUBGIFTCONTINUE", t), g.onGiftSubContinue(t.displayName || t.username, t.gifterDisplayName, { ...t, userState: b(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: c(t.messageEmotes) });
    }), o.on(u.Timeout, (t) => {
      g.onTimeout(t.displayName || t.username, t.duration, { ...t, userState: b(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: c(t.messageEmotes), timedOutUserId: t.userId });
    }), o.on(u.Ban, (t) => {
      g.onBan(t.displayName || t.username, { ...t, userState: b(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: c(t.messageEmotes), bannedUserId: t.userId });
    }), o.on(u.MessageDeleted, (t) => {
      g.onMessageDeleted(t.id, { ...t, userState: b(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: c(t.messageEmotes) });
    }), o.on(u.Raid, (t) => {
      console.log("RAID"), g.onRaid(t.displayName || t.username, t.viewers, { ...t, userState: b(t), extra: null, flags: t.extra.flags, roomId: t.channelId, messageEmotes: c(t.messageEmotes) });
    });
  }
};
typeof module < "u" && module.exports && (module.exports = g);
typeof window < "u" && (window.ComfyJSNew = g);
//# sourceMappingURL=comfy.min.mjs.map
