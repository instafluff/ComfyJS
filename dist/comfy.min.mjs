var Q = (t, a, n) => {
  if (!a.has(t))
    throw TypeError("Cannot " + n);
};
var s = (t, a, n) => (Q(t, a, "read from private field"), n ? n.call(t) : a.get(t)), g = (t, a, n) => {
  if (a.has(t))
    throw TypeError("Cannot add the same private member more than once");
  a instanceof WeakSet ? a.add(t) : a.set(t, n);
}, I = (t, a, n, e) => (Q(t, a, "write to private field"), e ? e.call(t, n) : a.set(t, n), n);
var y = (t, a, n) => (Q(t, a, "access private method"), n);
function St(t) {
  return t.replace(/\\(.)/g, (a, n) => {
    switch (n) {
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
        return n;
    }
  });
}
function x(t, a) {
  const n = t.indexOf(" ", a);
  return {
    component: t.slice(a + 1, n),
    nextIndex: n + 1
  };
}
function Mt(t) {
  const a = {
    raw: t,
    tags: {},
    source: null,
    command: null,
    parameters: null
  };
  let n = 0;
  if (t[0] === "@") {
    const { component: e, nextIndex: r } = x(t, 0);
    for (const d of e.split(";")) {
      const f = d.split("=");
      a.tags[f[0]] = St(f[1]);
    }
    n = r;
  }
  if (t[n] === ":") {
    const { component: e, nextIndex: r } = x(t, n);
    a.source = e, n = r;
  }
  if (n < t.length) {
    const e = t.slice(n).trim(), r = e.indexOf(":");
    a.command = e.slice(0, r < 0 ? void 0 : r).trim();
    const d = t.indexOf(":", n);
    d >= 0 && (a.parameters = t.slice(d + 1));
  }
  return a;
}
const Nt = globalThis.WebSocket || require("ws");
function Rt(t, a) {
  return new Nt(t, a);
}
var l = /* @__PURE__ */ ((t) => (t.None = "none", t.Ping = "Ping", t.Pong = "Pong", t.Connect = "connect", t.Reconnected = "reconnect", t.Error = "error", t.Warning = "Warning", t.ChatMode = "chatmode", t.ClearChat = "ClearChat", t.RoomState = "roomstate", t.GlobalUserState = "globaluserstate", t.UserState = "userstate", t.Notice = "notice", t.Join = "join", t.Leave = "leave", t.Command = "command", t.Chat = "message", t.Reply = "reply", t.Whisper = "whisper", t.Announcement = "announcement", t.Cheer = "Cheer", t.Subscribe = "sub", t.Resubscribe = "resub", t.SubGift = "subgift", t.AnonymousSubGift = "anonsubgift", t.MysterySubGift = "submysterygift", t.AnonymousMysterySubGift = "anonsubmysterygift", t.SubGiftContinue = "subgiftcontinue", t.Raid = "raid", t.Timeout = "Timeout", t.Ban = "Ban", t.MessageDeleted = "MessageDeleted", t.All = "all", t))(l || {});
const E = {
  "": "Normal",
  admin: "Admin",
  global_mod: "Global Mod",
  staff: "Staff",
  mod: "Moderator"
};
function G(t) {
  const a = t.split("!");
  return a.length > 1 ? a[0] : void 0;
}
function A(t) {
  if (!t)
    return "";
  const a = t.split(","), n = {};
  for (const e of a) {
    const [r, d] = e.split("/");
    n[r] = d;
  }
  return n;
}
function Pt(t, a) {
  var X, Y;
  const n = (X = t.parameters) == null ? void 0 : X.startsWith("ACTION"), e = n ? (Y = t.parameters) == null ? void 0 : Y.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1] : t.parameters, r = t.tags.id, d = t.tags["room-id"], f = t.tags["user-id"], p = G(t.source), i = t.tags["display-name"] || t.tags.login || p, h = E[t.tags["user-type"]], J = A(t.tags["badge-info"] || ""), b = A(t.tags.badges || ""), H = t.tags.color, _ = t.tags.emotes, R = A(t.tags.flags), ot = p === a, it = t.tags.mod === "1", ut = !!b.founder, lt = t.tags.subscriber === "1", dt = t.tags.turbo === "1", gt = !!b.vip, pt = !!b.premium, ct = !!b.partner, mt = !!b["game-developer"], q = parseInt(t.tags["tmi-sent-ts"]), w = t.tags["emote-only"] === "1", ft = t.tags["msg-id"] === "highlighted-message", ht = t.tags["msg-id"] === "skip-subs-mode-message", D = t.tags["custom-reward-id"] || null, bt = t.tags["first-msg"] === "1", It = t.tags["returning-chatter"] === "1", K = {
    broadcaster: ot,
    mod: it,
    founder: ut,
    subscriber: lt,
    vip: gt,
    partner: ct,
    gameDeveloper: mt,
    turbo: dt,
    prime: pt,
    highlighted: ft,
    skipSubsMode: ht,
    customReward: !!D,
    emoteOnly: w,
    firstMessage: bt,
    returningChatter: It
  };
  if (t.tags.bits)
    return {
      type: "Cheer",
      data: {
        channel: a,
        channelId: d,
        displayName: i,
        username: p,
        userId: f,
        userType: h,
        id: r,
        message: t.parameters,
        messageType: n ? "action" : "chat",
        // TODO: Can bits be an action?
        messageEmotes: _,
        messageFlags: R,
        isEmoteOnly: w,
        userColor: H,
        userBadgeInfo: J,
        userBadges: b,
        customRewardId: D,
        flags: K,
        bits: parseInt(t.tags.bits),
        timestamp: q,
        extra: {
          ...t.tags,
          flags: R
        }
      }
    };
  if (e != null && e.startsWith("!")) {
    const Z = e.split(/ (.*)/), yt = Z[0].substring(1).toLowerCase(), Ct = Z[1] || "";
    return {
      type: "command",
      data: {
        channel: a,
        channelId: d,
        displayName: i,
        username: p,
        userId: f,
        userType: h,
        command: yt,
        id: r,
        message: Ct,
        messageType: n ? "action" : "chat",
        messageEmotes: _,
        messageFlags: R,
        isEmoteOnly: w,
        userColor: H,
        userBadgeInfo: J,
        userBadges: b,
        customRewardId: D,
        flags: K,
        timestamp: q,
        extra: {
          ...t.tags,
          flags: R
        }
      }
    };
  } else
    return {
      type: "message",
      data: {
        channel: a,
        channelId: d,
        displayName: i,
        username: p,
        userId: f,
        userType: h,
        id: r,
        message: e,
        messageType: n ? "action" : "chat",
        messageEmotes: _,
        messageFlags: R,
        isEmoteOnly: w,
        userColor: H,
        userBadgeInfo: J,
        userBadges: b,
        customRewardId: D,
        flags: K,
        timestamp: q,
        extra: {
          ...t.tags,
          flags: R
        }
      }
    };
}
function Ot(t) {
  var a, n, e, r, d, f;
  try {
    if (t.command) {
      const p = t.command.split(" "), i = p.length > 1 ? p[1].substring(1) : void 0;
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
            data: { channel: i, username: G(t.source) }
          };
        case "PART":
          return {
            type: "leave",
            data: { channel: i, username: G(t.source) }
          };
        case "ROOMSTATE":
          return {
            type: "roomstate",
            data: {
              // Only add the properties if they exist
              ...t.tags["broadcaster-lang"] && { broadcasterLanguage: t.tags["broadcaster-lang"] },
              ...t.tags["emote-only"] && { emoteOnly: t.tags["emote-only"] !== "0" },
              ...t.tags["followers-only"] && { followersOnly: t.tags["followers-only"] !== "-1" },
              ...t.tags["subs-only"] && { subscribersOnly: t.tags["subs-only"] !== "0" },
              ...t.tags.r9k && { r9k: t.tags.r9k !== "0" },
              ...t.tags.rituals && { rituals: t.tags.rituals !== "0" },
              ...t.tags.slow && { slow: t.tags.slow !== "0" },
              channel: i,
              channelId: t.tags["room-id"]
            }
          };
        case "GLOBALUSERSTATE":
          return {
            type: "globaluserstate",
            data: {
              displayName: t.tags["display-name"],
              userId: t.tags["user-id"],
              userType: E[t.tags["user-type"]],
              color: t.tags.color,
              badges: t.tags.badges,
              badgeInfo: t.tags["badge-info"],
              emoteSets: t.tags["emote-sets"],
              extra: t.tags
            }
          };
        case "USERSTATE":
          return {
            type: "userstate",
            data: {
              channel: i,
              displayName: t.tags["display-name"],
              userId: t.tags["user-id"],
              userType: E[t.tags["user-type"]],
              color: t.tags.color,
              badgeInfo: A(t.tags["badge-info"] || ""),
              badges: A(t.tags.badges || ""),
              emoteSets: t.tags["emote-sets"],
              ...t.tags.id && { id: t.tags.id },
              mod: t.tags.mod === "1",
              subscriber: t.tags.subscriber === "1",
              turbo: t.tags.turbo === "1",
              extra: t.tags
            }
          };
        case "HOSTTARGET":
          break;
        case "USERNOTICE":
          switch (t.tags["msg-id"]) {
            case "announcement":
              return {
                type: "announcement",
                data: {
                  displayName: t.tags["display-name"] || t.tags.login,
                  channel: i,
                  channelId: t.tags["room-id"],
                  username: t.tags.login,
                  userId: t.tags["user-id"],
                  message: t.parameters,
                  timestamp: parseInt(t.tags["tmi-sent-ts"]),
                  extra: t.tags
                }
              };
            case "sub":
              return {
                type: "sub",
                data: {
                  displayName: t.tags["display-name"] || t.tags.login,
                  months: parseInt(t.tags["msg-param-months"]),
                  multiMonthDuration: parseInt(t.tags["msg-param-multimonth-duration"]),
                  multiMonthTenure: parseInt(t.tags["msg-param-multimonth-tenure"]),
                  shouldShareStreak: t.tags["msg-param-should-share-streak"] === "1",
                  subPlan: t.tags["msg-param-sub-plan"],
                  wasGifted: t.tags["msg-param-was-gifted"] === "true",
                  ...t.tags["msg-param-goal-contribution-type"] && { goalContributionType: t.tags["msg-param-goal-contribution-type"] },
                  ...t.tags["msg-param-goal-current-contributions"] && { goalCurrentContributions: parseInt(t.tags["msg-param-goal-current-contributions"]) },
                  ...t.tags["msg-param-goal-description"] && { goalDescription: t.tags["msg-param-goal-description"] },
                  ...t.tags["msg-param-goal-target-contributions"] && { goalTargetContributions: parseInt(t.tags["msg-param-goal-target-contributions"]) },
                  ...t.tags["msg-param-goal-user-contributions"] && { goalUserContributions: parseInt(t.tags["msg-param-goal-user-contributions"]) },
                  channel: i,
                  channelId: t.tags["room-id"],
                  username: t.tags.login,
                  userId: t.tags["user-id"],
                  message: t.parameters,
                  timestamp: parseInt(t.tags["tmi-sent-ts"]),
                  extra: t.tags
                }
              };
            case "resub":
              return {
                type: "resub",
                data: {
                  displayName: t.tags["display-name"] || t.tags.login,
                  cumulativeMonths: parseInt(t.tags["msg-param-cumulative-months"]),
                  months: parseInt(t.tags["msg-param-months"]),
                  multiMonthDuration: parseInt(t.tags["msg-param-multimonth-duration"]),
                  multiMonthTenure: parseInt(t.tags["msg-param-multimonth-tenure"]),
                  ...t.tags["msg-param-streak-months"] && { streakMonths: parseInt(t.tags["msg-param-streak-months"]) },
                  shouldShareStreak: t.tags["msg-param-should-share-streak"] === "1",
                  subPlan: t.tags["msg-param-sub-plan"],
                  wasGifted: t.tags["msg-param-was-gifted"] === "true",
                  channel: i,
                  channelId: t.tags["room-id"],
                  username: t.tags.login,
                  userId: t.tags["user-id"],
                  message: t.parameters,
                  timestamp: parseInt(t.tags["tmi-sent-ts"]),
                  extra: t.tags
                }
              };
            case "submysterygift":
              return {
                type: "submysterygift",
                data: {
                  displayName: t.tags["display-name"] || t.tags.login,
                  giftCount: parseInt(t.tags["msg-param-mass-gift-count"]),
                  senderCount: parseInt(t.tags["msg-param-sender-count"]),
                  subPlan: t.tags["msg-param-sub-plan"],
                  ...t.tags["msg-param-goal-contribution-type"] && { goalContributionType: t.tags["msg-param-goal-contribution-type"] },
                  ...t.tags["msg-param-goal-current-contributions"] && { goalCurrentContributions: parseInt(t.tags["msg-param-goal-current-contributions"]) },
                  ...t.tags["msg-param-goal-description"] && { goalDescription: t.tags["msg-param-goal-description"] },
                  ...t.tags["msg-param-goal-target-contributions"] && { goalTargetContributions: parseInt(t.tags["msg-param-goal-target-contributions"]) },
                  ...t.tags["msg-param-goal-user-contributions"] && { goalUserContributions: parseInt(t.tags["msg-param-goal-user-contributions"]) },
                  channel: i,
                  channelId: t.tags["room-id"],
                  username: t.tags.login,
                  userId: t.tags["user-id"],
                  timestamp: parseInt(t.tags["tmi-sent-ts"]),
                  extra: t.tags
                }
              };
            case "subgift":
              return {
                type: "subgift",
                data: {
                  displayName: t.tags["display-name"] || t.tags.login,
                  recipientDisplayName: t.tags["msg-param-recipient-display-name"],
                  recipientId: t.tags["msg-param-recipient-id"],
                  recipientUsername: t.tags["msg-param-recipient-user-name"],
                  months: parseInt(t.tags["msg-param-months"]),
                  giftMonths: parseInt(t.tags["msg-param-gift-months"]),
                  subPlan: t.tags["msg-param-sub-plan"],
                  ...t.tags["msg-param-goal-contribution-type"] && { goalContributionType: t.tags["msg-param-goal-contribution-type"] },
                  ...t.tags["msg-param-goal-current-contributions"] && { goalCurrentContributions: parseInt(t.tags["msg-param-goal-current-contributions"]) },
                  ...t.tags["msg-param-goal-description"] && { goalDescription: t.tags["msg-param-goal-description"] },
                  ...t.tags["msg-param-goal-target-contributions"] && { goalTargetContributions: parseInt(t.tags["msg-param-goal-target-contributions"]) },
                  ...t.tags["msg-param-goal-user-contributions"] && { goalUserContributions: parseInt(t.tags["msg-param-goal-user-contributions"]) },
                  channel: i,
                  channelId: t.tags["room-id"],
                  username: t.tags.login,
                  userId: t.tags["user-id"],
                  timestamp: parseInt(t.tags["tmi-sent-ts"]),
                  extra: t.tags
                }
              };
            case "giftsubcontinue":
              return {
                type: "subgiftcontinue",
                data: {
                  displayName: t.tags["display-name"] || t.tags.login,
                  gifterDisplayName: t.tags["msg-param-sender-name"] || t.tags["msg-param-sender-login"],
                  gifterUsername: t.tags["msg-param-sender-login"],
                  channel: i,
                  channelId: t.tags["room-id"],
                  username: t.tags.login,
                  userId: t.tags["user-id"],
                  timestamp: parseInt(t.tags["tmi-sent-ts"]),
                  extra: t.tags
                }
              };
            case "raid":
              return {
                type: "raid",
                data: {
                  profileImageURL: t.tags["msg-param-profileImageURL"],
                  displayName: t.tags["msg-param-displayName"] || t.tags["display-name"] || t.tags["msg-param-login"] || t.tags.login,
                  viewers: parseInt(t.tags["msg-param-viewerCount"]),
                  channel: i,
                  channelId: t.tags["room-id"],
                  username: t.tags["msg-param-login"] || t.tags.login,
                  userId: t.tags["user-id"],
                  timestamp: parseInt(t.tags["tmi-sent-ts"]),
                  extra: t.tags
                }
              };
            default:
              console.log("TODO IMPLEMENT COMMAND", t);
              break;
          }
          break;
        case "WHISPER":
          return console.log(t), console.log("Channel:", i, t.parameters), {
            type: "whisper",
            data: {
              displayName: t.tags["display-name"] || t.tags.login || G(t.source),
              username: G(t.source),
              userId: t.tags["user-id"],
              userType: E[t.tags["user-type"]],
              color: t.tags.color,
              badges: t.tags.badges,
              emotes: t.tags.emotes,
              turbo: t.tags.turbo === "1",
              threadId: t.tags["thread-id"],
              messageId: t.tags["message-id"],
              message: t.parameters,
              messageType: "whisper",
              extra: t.tags
            }
          };
        case "NOTICE":
          return (a = t.parameters) != null && a.includes("Login unsuccessful") || (n = t.parameters) != null && n.includes("Login authentication failed") || (e = t.parameters) != null && e.includes("Error logging in") || (r = t.parameters) != null && r.includes("Improperly formatted auth") || (d = t.parameters) != null && d.includes("Invalid NICK") || (f = t.parameters) != null && f.includes("Invalid CAP REQ") ? {
            type: "error",
            data: {
              channel: i,
              message: t.parameters
            }
          } : {
            type: "notice",
            data: {
              channel: i,
              msgId: t.tags["msg-id"],
              message: t.parameters
            }
          };
        case "CLEARCHAT":
          return t.tags["target-user-id"] ? t.tags["ban-duration"] ? {
            type: "Timeout",
            data: {
              channel: i,
              channelId: t.tags["room-id"],
              duration: parseInt(t.tags["ban-duration"]),
              username: t.parameters,
              userId: t.tags["target-user-id"],
              timestamp: parseInt(t.tags["tmi-sent-ts"]),
              extra: t.tags
            }
          } : {
            type: "Ban",
            data: {
              channel: i,
              channelId: t.tags["room-id"],
              username: t.parameters,
              userId: t.tags["target-user-id"],
              timestamp: parseInt(t.tags["tmi-sent-ts"]),
              extra: t.tags
            }
          } : {
            type: "ClearChat",
            data: {
              channel: i,
              channelId: t.tags["room-id"],
              timestamp: parseInt(t.tags["tmi-sent-ts"]),
              extra: t.tags
            }
          };
        case "CLEARMSG":
          return {
            type: "MessageDeleted",
            data: {
              channel: i,
              channelId: t.tags["room-id"],
              // Room ID seems to be empty for this event
              displayName: t.tags["display-name"] || t.tags.login,
              username: t.tags.login,
              id: t.tags["target-msg-id"],
              message: t.parameters,
              timestamp: parseInt(t.tags["tmi-sent-ts"]),
              extra: t.tags
            }
          };
        case "PRIVMSG":
          return Pt(t, i);
        case "RECONNECT":
          console.log("The Twitch IRC server is about to terminate the connection for maintenance.");
          break;
        default:
          {
            const h = parseInt(p[0]);
            if (h >= 400)
              return console.debug(`Error IRC command: ${h}`, t), null;
            switch (h) {
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
                return console.debug("Unsupported numeric command", h), null;
            }
          }
          break;
      }
    } else
      console.debug("Unprocessed IRC message:", t.raw);
  } catch (p) {
    return console.error(p), {
      type: "Warning",
      data: p
    };
  }
  return console.log(t), null;
}
function kt(t) {
  t.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
}
function Gt(t, a, n) {
  const e = n ? a : `justinfan${Math.floor(Math.random() * 99998999 + 1e3)}`, r = n || "INSTAFLUFF";
  t.send(`PASS ${r}`), t.send(`NICK ${e}`);
}
function z(t, a) {
  t.send(`JOIN #${a}`);
}
function At(t, a) {
  t.send(`PART #${a}`);
}
function Ut(t) {
  t.send("PING");
}
function wt(t) {
  t.send("PONG");
}
function Dt(t, a, n) {
  t.send(`PRIVMSG #${a} :${n}`);
}
function Et(t, a, n, e) {
  t.send(`@reply-parent-msg-id=${n} PRIVMSG #${a} :${e}`);
}
var o, N, U, S, O, k, L, c, m, B, T, W, tt, $, at, F, rt, V, nt, j, st, v, et;
class Lt {
  constructor(a, n, e, r) {
    g(this, k);
    g(this, c);
    g(this, B);
    g(this, W);
    g(this, $);
    g(this, F);
    g(this, V);
    g(this, j);
    g(this, v);
    g(this, o, void 0);
    g(this, N, void 0);
    g(this, U, void 0);
    g(this, S, void 0);
    g(this, O, void 0);
    I(this, O, 0), this.chatModes = {}, this.handlers = {}, I(this, N, a), I(this, U, n), this.debug = !!r, (typeof e == "string" || e instanceof String) && (e = [e]), this.channels = e || [a], y(this, B, T).call(this);
  }
  get version() {
    return "2.0.0";
  }
  on(a, n) {
    this.handlers[a] = n;
  }
  say(a, n) {
    s(this, o) && s(this, c, m) && Dt(s(this, o), n || s(this, k, L), a);
  }
  reply(a, n, e) {
    s(this, o) && s(this, c, m) && Et(s(this, o), e || s(this, k, L), a, n);
  }
  join(a) {
    s(this, o) && s(this, c, m) && z(s(this, o), a);
  }
  leave(a) {
    s(this, o) && s(this, c, m) && At(s(this, o), a);
  }
  deleteMessage(a, n) {
    s(this, o) && s(this, c, m);
  }
  destroy() {
    s(this, o) && s(this, o).readyState !== s(this, o).CLOSED && s(this, o).close();
  }
}
o = new WeakMap(), N = new WeakMap(), U = new WeakMap(), S = new WeakMap(), O = new WeakMap(), k = new WeakSet(), L = function() {
  return this.channels[0];
}, c = new WeakSet(), m = function() {
  return s(this, o) && s(this, o).readyState === s(this, o).OPEN;
}, B = new WeakSet(), T = function() {
  if (s(this, c, m))
    return;
  I(this, o, Rt("wss://irc-ws.chat.twitch.tv:443", "irc")), s(this, o).onopen = () => {
    y(this, W, tt).call(this);
  }, s(this, o).onmessage = (n) => {
    y(this, v, et).call(this, n);
  }, s(this, o).onerror = (n) => {
    y(this, $, at).call(this, n);
  }, s(this, o).onclose = (n) => {
    y(this, F, rt).call(this, n);
  };
}, W = new WeakSet(), tt = function() {
  s(this, o) && s(this, c, m) && (kt(s(this, o)), Gt(s(this, o), s(this, N), s(this, U)), z(s(this, o), s(this, k, L)));
}, $ = new WeakSet(), at = function(a) {
  console.error("ERROR", a);
}, F = new WeakSet(), rt = function(a) {
  console.info("CLOSE", a), s(this, S) && clearInterval(s(this, S));
}, V = new WeakSet(), nt = function() {
  s(this, o) && s(this, c, m) && (I(this, O, Date.now()), Ut(s(this, o)));
}, j = new WeakSet(), st = function(a) {
  if (s(this, o) && s(this, c, m))
    switch (a.type) {
      case l.Connect:
        I(this, N, a.data.username), s(this, S) && clearInterval(s(this, S)), I(this, S, setInterval(() => {
          y(this, V, nt).call(this);
        }, 6e4));
        break;
      case l.Ping:
        wt(s(this, o));
        break;
      case l.Pong:
        a.data = a.data || {}, a.data.latency = Date.now() - s(this, O);
        break;
      case l.RoomState:
        this.chatModes[a.data.channel] = {
          ...this.chatModes[a.data.channel],
          ...a.data
        }, this.handlers[l.ChatMode] && this.handlers[l.ChatMode](this.chatModes[a.data.channel]);
        break;
      case l.Error:
        s(this, o).close();
        break;
      case l.Chat:
        a.data.self = a.data.username === s(this, N), this.handlers[l.Reply] && a.data.extra["reply-parent-msg-id"] && this.handlers[l.Reply]({
          ...a.data,
          parentId: a.data.extra["reply-parent-msg-id"],
          parentUserId: a.data.extra["reply-parent-user-id"],
          parentUser: a.data.extra["reply-parent-user-login"],
          parentMessage: a.data.extra["reply-parent-msg-body"],
          parentDisplayName: a.data.extra["reply-parent-display-name"] || a.data.extra["reply-parent-user-login"]
        });
        break;
    }
}, v = new WeakSet(), et = function(a) {
  if (!s(this, o) || !s(this, c, m))
    return;
  const n = a.data.trim().split(`\r
`);
  for (const e of n) {
    const r = Ot(Mt(e));
    r && r.type !== l.None && (y(this, j, st).call(this, r), this.handlers[r.type] && this.handlers[r.type](r.data), this.handlers[l.All] && this.handlers[l.All]({
      event: r.type,
      ...r.data
    }));
  }
};
let u;
function M(t) {
  if (t) {
    const a = t.split("/"), n = {};
    for (const e of a) {
      const [r, d] = e.split(":");
      n[r] = d.split(",");
    }
    return n;
  }
  return null;
}
function P(t) {
  const a = {};
  for (const n in t.extra)
    t.extra[n] === "" ? a[n] = null : t.extra[n] === "1" ? a[n] = !0 : t.extra[n] === "0" ? a[n] = !1 : a[n] = t.extra[n];
  return a["badge-info-raw"] = a["badge-info"], a["badge-info"] = t.userBadgeInfo || null, a["badges-raw"] = a.badges, a.badges = t.userBadges || null, a["emotes-raw"] = a.emotes, a.emotes = M(t.messageEmotes), a.username = t.username, a["message-type"] = t.messageType, a;
}
const C = {
  version: () => "2.0.0",
  onError: (t) => {
    console.error("Error:", t);
  },
  onCommand: (t, a, n, e, r) => {
    u && u.debug && console.debug("onCommand default handler");
  },
  onChat: (t, a, n, e, r) => {
    u && u.debug && console.debug("onChat default handler");
  },
  onWhisper: (t, a, n, e, r) => {
    u && u.debug && console.debug("onWhisper default handler");
  },
  onSub: (t, a, n, e) => {
    u && u.debug && console.debug("onSub default handler");
  },
  onResub: (t, a, n, e, r, d) => {
    u && u.debug && console.debug("onResub default handler");
  },
  onSubGift: (t, a, n, e, r, d) => {
    u && u.debug && console.debug("onSubGift default handler");
  },
  onSubMysteryGift: (t, a, n, e, r) => {
    u && u.debug && console.debug("onSubMysteryGift default handler");
  },
  Init: (t, a, n, e) => {
    u = new Lt(t, a, n, e), u.on(l.Command, (r) => {
      C.onCommand(r.displayName || r.username, r.command, r.message, r.flags, { ...r, userState: P(r), extra: null, flags: null, roomId: r.channelId, messageEmotes: M(r.messageEmotes) });
    }), u.on(l.Chat, (r) => {
      C.onChat(r.displayName || r.username, r.message, r.flags, r.self, { ...r, userState: P(r), extra: null, flags: null, roomId: r.channelId, messageEmotes: M(r.messageEmotes) });
    }), u.on(l.Subscribe, (r) => {
      C.onSub(r.displayName || r.username, r.message, r.subTierInfo, { ...r, userState: P(r), extra: null, flags: null, roomId: r.channelId, messageEmotes: M(r.messageEmotes) });
    }), u.on(l.Resubscribe, (r) => {
      C.onResub(r.displayName || r.username, r.message, r.streamMonths, r.cumulativeMonths, r.subTierInfo, { ...r, userState: P(r), extra: null, flags: null, roomId: r.channelId, messageEmotes: M(r.messageEmotes) });
    }), u.on(l.SubGift, (r) => {
      C.onSubGift(r.displayName || r.username, r.streakMonths, r.recipientUser, r.senderCount, r.subTierInfo, { ...r, userState: P(r), extra: null, flags: null, roomId: r.channelId, messageEmotes: M(r.messageEmotes) });
    }), u.on(l.MysterySubGift, (r) => {
      C.onSubMysteryGift(r.displayName || r.username, r.numbOfSubs, r.senderCount, r.subTierInfo, { ...r, userState: P(r), extra: null, flags: null, roomId: r.channelId, messageEmotes: M(r.messageEmotes) });
    });
  }
};
typeof module < "u" && module.exports && (module.exports = C);
typeof window < "u" && (window.ComfyJSNew = C);
//# sourceMappingURL=comfy.min.mjs.map
