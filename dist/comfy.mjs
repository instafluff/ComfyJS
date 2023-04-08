var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};
var _ws, _username, _password, _pingTimer, _pingTime, _mainChannel, mainChannel_get, _isConnected, isConnected_get, _connect, connect_fn, _onOpen, onOpen_fn, _onError, onError_fn, _onClose, onClose_fn, _ping, ping_fn, _handleSpecialEvents, handleSpecialEvents_fn, _onMessage, onMessage_fn;
function unescapeIRC(text) {
  return text.replace(/\\(.)/g, (_, char) => {
    switch (char) {
      case "\\":
        return "\\";
      case ":":
        return ";";
      case "s":
        return " ";
      case "r":
        return "\r";
      case "n":
        return "\n";
      default:
        return char;
    }
  });
}
function extractComponent(message, index) {
  const nextSpace = message.indexOf(" ", index);
  const rawComponent = message.slice(index + 1, nextSpace);
  return {
    component: rawComponent,
    nextIndex: nextSpace + 1
  };
}
function parseMessage(message) {
  const parsedMessage = {
    raw: message,
    tags: {},
    source: null,
    command: null,
    parameters: null
  };
  let index = 0;
  if (message[0] === "@") {
    const { component, nextIndex } = extractComponent(message, 0);
    for (const tag of component.split(";")) {
      const parts = tag.split("=");
      parsedMessage.tags[parts[0]] = unescapeIRC(parts[1]);
    }
    index = nextIndex;
  }
  if (message[index] === ":") {
    const { component, nextIndex } = extractComponent(message, index);
    parsedMessage.source = component;
    index = nextIndex;
  }
  if (index < message.length) {
    const rawCommand = message.slice(index).trim();
    const commandEnd = rawCommand.indexOf(":");
    parsedMessage.command = rawCommand.slice(0, commandEnd < 0 ? void 0 : commandEnd).trim();
    const parameterIndex = message.indexOf(":", index);
    if (parameterIndex >= 0) {
      parsedMessage.parameters = message.slice(parameterIndex + 1);
    }
  }
  return parsedMessage;
}
const _WebSocket = globalThis.WebSocket || require("ws");
function createWebSocket(server, protocols) {
  return new _WebSocket(server, protocols);
}
var TwitchEventType = /* @__PURE__ */ ((TwitchEventType2) => {
  TwitchEventType2["None"] = "none";
  TwitchEventType2["Ping"] = "Ping";
  TwitchEventType2["Pong"] = "Pong";
  TwitchEventType2["Connect"] = "connect";
  TwitchEventType2["Reconnected"] = "reconnect";
  TwitchEventType2["Error"] = "error";
  TwitchEventType2["Warning"] = "Warning";
  TwitchEventType2["ChatMode"] = "chatmode";
  TwitchEventType2["ClearChat"] = "ClearChat";
  TwitchEventType2["RoomState"] = "roomstate";
  TwitchEventType2["GlobalUserState"] = "globaluserstate";
  TwitchEventType2["UserState"] = "userstate";
  TwitchEventType2["Notice"] = "notice";
  TwitchEventType2["Join"] = "join";
  TwitchEventType2["Leave"] = "leave";
  TwitchEventType2["Command"] = "command";
  TwitchEventType2["Chat"] = "message";
  TwitchEventType2["Reply"] = "reply";
  TwitchEventType2["Whisper"] = "whisper";
  TwitchEventType2["Announcement"] = "announcement";
  TwitchEventType2["Cheer"] = "Cheer";
  TwitchEventType2["Subscribe"] = "sub";
  TwitchEventType2["Resubscribe"] = "resub";
  TwitchEventType2["SubGift"] = "subgift";
  TwitchEventType2["AnonymousSubGift"] = "anonsubgift";
  TwitchEventType2["MysterySubGift"] = "submysterygift";
  TwitchEventType2["AnonymousMysterySubGift"] = "anonsubmysterygift";
  TwitchEventType2["SubGiftContinue"] = "subgiftcontinue";
  TwitchEventType2["Raid"] = "raid";
  TwitchEventType2["Timeout"] = "Timeout";
  TwitchEventType2["Ban"] = "Ban";
  TwitchEventType2["MessageDeleted"] = "MessageDeleted";
  TwitchEventType2["All"] = "all";
  return TwitchEventType2;
})(TwitchEventType || {});
const TwitchUserTypes = {
  "": "Normal",
  "admin": "Admin",
  "global_mod": "Global Mod",
  "staff": "Staff",
  "mod": "Moderator"
};
function parseUsername(source) {
  const parts = source.split("!");
  return parts.length > 1 ? parts[0] : void 0;
}
function parseBadges(badgesTag) {
  if (!badgesTag) {
    return void 0;
  }
  const badgeList = badgesTag.split(",");
  const badges = {};
  for (const badge of badgeList) {
    const [name, version] = badge.split("/");
    badges[name] = version;
  }
  return badges;
}
function handleChatMessage(message, channel) {
  var _a, _b;
  const isAction = (_a = message.parameters) == null ? void 0 : _a.startsWith("ACTION");
  const sanitizedMessage = isAction ? (_b = message.parameters) == null ? void 0 : _b.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)[1] : message.parameters;
  const id = message.tags["id"];
  const channelId = message.tags["room-id"];
  const userId = message.tags["user-id"];
  const username = parseUsername(message.source);
  const displayName = message.tags["display-name"] || message.tags["login"] || username;
  const userType = TwitchUserTypes[message.tags["user-type"]];
  const badgeInfo = parseBadges(message.tags["badge-info"] || "");
  const badges = parseBadges(message.tags["badges"] || "");
  const userColor = message.tags["color"];
  const emotes = message.tags["emotes"];
  const messageFlags = parseBadges(message.tags["flags"]);
  const isBroadcaster = username === channel;
  const isMod = message.tags["mod"] === "1";
  const isFounder = badges["founder"] === "1";
  const isSubscriber = message.tags["subscriber"] === "1";
  const isTurbo = message.tags["turbo"] === "1";
  const isVIP = badges["vip"] === "1";
  const isPrime = badges["premium"] === "1";
  const isPartner = badges["partner"] === "1";
  const isGameDeveloper = badges["game-developer"] === "1";
  const timestamp = parseInt(message.tags["tmi-sent-ts"]);
  const isEmoteOnly = message.tags["emote-only"] === "1";
  const isHighlightedMessage = message.tags["msg-id"] === "highlighted-message";
  const isSkipSubsModeMessage = message.tags["msg-id"] === "skip-subs-mode-message";
  const customRewardId = message.tags["custom-reward-id"] || null;
  const isFirstMessage = message.tags["first-msg"] === "1";
  const isReturningChatter = message.tags["returning-chatter"] === "1";
  const flags = {
    broadcaster: isBroadcaster,
    mod: isMod,
    founder: isFounder,
    subscriber: isSubscriber,
    vip: isVIP,
    partner: isPartner,
    gameDeveloper: isGameDeveloper,
    turbo: isTurbo,
    prime: isPrime,
    highlighted: isHighlightedMessage,
    skipSubsMode: isSkipSubsModeMessage,
    customReward: !!customRewardId,
    emoteOnly: isEmoteOnly,
    firstMessage: isFirstMessage,
    returningChatter: isReturningChatter
  };
  if (message.tags["bits"]) {
    return {
      type: "Cheer",
      data: {
        channel,
        channelId,
        displayName,
        username,
        userId,
        userType,
        id,
        message: message.parameters,
        messageType: isAction ? "action" : "chat",
        // TODO: Can bits be an action?
        messageEmotes: emotes,
        messageFlags,
        isEmoteOnly,
        userColor,
        userBadgeInfo: badgeInfo,
        userBadges: badges,
        customRewardId,
        flags,
        bits: parseInt(message.tags["bits"]),
        timestamp,
        extra: {
          ...message.tags,
          flags: messageFlags || null
        }
      }
    };
  } else {
    if (sanitizedMessage == null ? void 0 : sanitizedMessage.startsWith("!")) {
      const msgParts = sanitizedMessage.split(/ (.*)/);
      const command = msgParts[0].substring(1).toLowerCase();
      const msg = msgParts[1] || "";
      return {
        type: "command",
        data: {
          channel,
          channelId,
          displayName,
          username,
          userId,
          userType,
          command,
          id,
          message: msg,
          messageType: isAction ? "action" : "chat",
          messageEmotes: emotes,
          messageFlags,
          isEmoteOnly,
          userColor,
          userBadgeInfo: badgeInfo,
          userBadges: badges,
          customRewardId,
          flags,
          timestamp,
          extra: {
            ...message.tags,
            flags: messageFlags || null
          }
        }
      };
    } else {
      return {
        type: "message",
        data: {
          channel,
          channelId,
          displayName,
          username,
          userId,
          userType,
          id,
          message: sanitizedMessage,
          messageType: isAction ? "action" : "chat",
          messageEmotes: emotes,
          messageFlags,
          isEmoteOnly,
          userColor,
          userBadgeInfo: badgeInfo,
          userBadges: badges,
          customRewardId,
          flags,
          timestamp,
          extra: {
            ...message.tags,
            flags: messageFlags || null
          }
        }
      };
    }
  }
}
function processMessage(message) {
  var _a, _b, _c, _d, _e, _f;
  try {
    if (message.command) {
      const commandParts = message.command.split(" ");
      const channel = commandParts.length > 1 ? commandParts[1].substring(1) : void 0;
      switch (commandParts[0]) {
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
            data: { channel, username: parseUsername(message.source) }
          };
        case "PART":
          return {
            type: "leave",
            data: { channel, username: parseUsername(message.source) }
          };
        case "ROOMSTATE":
          return {
            type: "roomstate",
            data: {
              // Only add the properties if they exist
              ...message.tags["broadcaster-lang"] && { broadcasterLanguage: message.tags["broadcaster-lang"] },
              ...message.tags["emote-only"] && { emoteOnly: message.tags["emote-only"] !== "0" },
              ...message.tags["followers-only"] && { followersOnly: message.tags["followers-only"] !== "-1" },
              ...message.tags["subs-only"] && { subscribersOnly: message.tags["subs-only"] !== "0" },
              ...message.tags["r9k"] && { r9k: message.tags["r9k"] !== "0" },
              ...message.tags["rituals"] && { rituals: message.tags["rituals"] !== "0" },
              ...message.tags["slow"] && { slow: message.tags["slow"] !== "0" },
              channel,
              channelId: message.tags["room-id"]
            }
          };
        case "GLOBALUSERSTATE":
          return {
            type: "globaluserstate",
            data: {
              displayName: message.tags["display-name"],
              userId: message.tags["user-id"],
              userType: TwitchUserTypes[message.tags["user-type"]],
              color: message.tags["color"],
              badges: message.tags["badges"],
              badgeInfo: message.tags["badge-info"],
              emoteSets: message.tags["emote-sets"],
              extra: message.tags
            }
          };
        case "USERSTATE":
          return {
            type: "userstate",
            data: {
              channel,
              displayName: message.tags["display-name"],
              userId: message.tags["user-id"],
              userType: TwitchUserTypes[message.tags["user-type"]],
              color: message.tags["color"],
              badgeInfo: parseBadges(message.tags["badge-info"] || ""),
              badges: parseBadges(message.tags["badges"] || ""),
              emoteSets: message.tags["emote-sets"],
              ...message.tags["id"] && { id: message.tags["id"] },
              mod: message.tags["mod"] === "1",
              subscriber: message.tags["subscriber"] === "1",
              turbo: message.tags["turbo"] === "1",
              extra: message.tags
            }
          };
        case "HOSTTARGET":
          break;
        case "USERNOTICE":
          switch (message.tags["msg-id"]) {
            case "announcement":
              return {
                type: "announcement",
                data: {
                  displayName: message.tags["display-name"] || message.tags["login"],
                  channel,
                  channelId: message.tags["room-id"],
                  username: message.tags["login"],
                  userId: message.tags["user-id"],
                  message: message.parameters,
                  timestamp: parseInt(message.tags["tmi-sent-ts"]),
                  extra: message.tags
                }
              };
            case "sub":
              return {
                type: "sub",
                data: {
                  displayName: message.tags["display-name"] || message.tags["login"],
                  months: parseInt(message.tags["msg-param-months"]),
                  multiMonthDuration: parseInt(message.tags["msg-param-multimonth-duration"]),
                  multiMonthTenure: parseInt(message.tags["msg-param-multimonth-tenure"]),
                  shouldShareStreak: message.tags["msg-param-should-share-streak"] === "1",
                  subPlan: message.tags["msg-param-sub-plan"],
                  wasGifted: message.tags["msg-param-was-gifted"] === "true",
                  ...message.tags["msg-param-goal-contribution-type"] && { goalContributionType: message.tags["msg-param-goal-contribution-type"] },
                  ...message.tags["msg-param-goal-current-contributions"] && { goalCurrentContributions: parseInt(message.tags["msg-param-goal-current-contributions"]) },
                  ...message.tags["msg-param-goal-description"] && { goalDescription: message.tags["msg-param-goal-description"] },
                  ...message.tags["msg-param-goal-target-contributions"] && { goalTargetContributions: parseInt(message.tags["msg-param-goal-target-contributions"]) },
                  ...message.tags["msg-param-goal-user-contributions"] && { goalUserContributions: parseInt(message.tags["msg-param-goal-user-contributions"]) },
                  channel,
                  channelId: message.tags["room-id"],
                  username: message.tags["login"],
                  userId: message.tags["user-id"],
                  message: message.parameters,
                  timestamp: parseInt(message.tags["tmi-sent-ts"]),
                  extra: message.tags
                }
              };
            case "resub":
              return {
                type: "resub",
                data: {
                  displayName: message.tags["display-name"] || message.tags["login"],
                  cumulativeMonths: parseInt(message.tags["msg-param-cumulative-months"]),
                  months: parseInt(message.tags["msg-param-months"]),
                  multiMonthDuration: parseInt(message.tags["msg-param-multimonth-duration"]),
                  multiMonthTenure: parseInt(message.tags["msg-param-multimonth-tenure"]),
                  ...message.tags["msg-param-streak-months"] && { streakMonths: parseInt(message.tags["msg-param-streak-months"]) },
                  shouldShareStreak: message.tags["msg-param-should-share-streak"] === "1",
                  subPlan: message.tags["msg-param-sub-plan"],
                  wasGifted: message.tags["msg-param-was-gifted"] === "true",
                  channel,
                  channelId: message.tags["room-id"],
                  username: message.tags["login"],
                  userId: message.tags["user-id"],
                  message: message.parameters,
                  timestamp: parseInt(message.tags["tmi-sent-ts"]),
                  extra: message.tags
                }
              };
            case "submysterygift":
              return {
                type: "submysterygift",
                data: {
                  displayName: message.tags["display-name"] || message.tags["login"],
                  giftCount: parseInt(message.tags["msg-param-mass-gift-count"]),
                  senderCount: parseInt(message.tags["msg-param-sender-count"]),
                  subPlan: message.tags["msg-param-sub-plan"],
                  ...message.tags["msg-param-goal-contribution-type"] && { goalContributionType: message.tags["msg-param-goal-contribution-type"] },
                  ...message.tags["msg-param-goal-current-contributions"] && { goalCurrentContributions: parseInt(message.tags["msg-param-goal-current-contributions"]) },
                  ...message.tags["msg-param-goal-description"] && { goalDescription: message.tags["msg-param-goal-description"] },
                  ...message.tags["msg-param-goal-target-contributions"] && { goalTargetContributions: parseInt(message.tags["msg-param-goal-target-contributions"]) },
                  ...message.tags["msg-param-goal-user-contributions"] && { goalUserContributions: parseInt(message.tags["msg-param-goal-user-contributions"]) },
                  channel,
                  channelId: message.tags["room-id"],
                  username: message.tags["login"],
                  userId: message.tags["user-id"],
                  timestamp: parseInt(message.tags["tmi-sent-ts"]),
                  extra: message.tags
                }
              };
            case "subgift":
              return {
                type: "subgift",
                data: {
                  displayName: message.tags["display-name"] || message.tags["login"],
                  recipientDisplayName: message.tags["msg-param-recipient-display-name"],
                  recipientId: message.tags["msg-param-recipient-id"],
                  recipientUsername: message.tags["msg-param-recipient-user-name"],
                  months: parseInt(message.tags["msg-param-months"]),
                  giftMonths: parseInt(message.tags["msg-param-gift-months"]),
                  subPlan: message.tags["msg-param-sub-plan"],
                  ...message.tags["msg-param-goal-contribution-type"] && { goalContributionType: message.tags["msg-param-goal-contribution-type"] },
                  ...message.tags["msg-param-goal-current-contributions"] && { goalCurrentContributions: parseInt(message.tags["msg-param-goal-current-contributions"]) },
                  ...message.tags["msg-param-goal-description"] && { goalDescription: message.tags["msg-param-goal-description"] },
                  ...message.tags["msg-param-goal-target-contributions"] && { goalTargetContributions: parseInt(message.tags["msg-param-goal-target-contributions"]) },
                  ...message.tags["msg-param-goal-user-contributions"] && { goalUserContributions: parseInt(message.tags["msg-param-goal-user-contributions"]) },
                  channel,
                  channelId: message.tags["room-id"],
                  username: message.tags["login"],
                  userId: message.tags["user-id"],
                  timestamp: parseInt(message.tags["tmi-sent-ts"]),
                  extra: message.tags
                }
              };
            case "giftsubcontinue":
              return {
                type: "subgiftcontinue",
                data: {
                  displayName: message.tags["display-name"] || message.tags["login"],
                  gifterDisplayName: message.tags["msg-param-sender-name"] || message.tags["msg-param-sender-login"],
                  gifterUsername: message.tags["msg-param-sender-login"],
                  channel,
                  channelId: message.tags["room-id"],
                  username: message.tags["login"],
                  userId: message.tags["user-id"],
                  timestamp: parseInt(message.tags["tmi-sent-ts"]),
                  extra: message.tags
                }
              };
            case "raid":
              return {
                type: "raid",
                data: {
                  profileImageURL: message.tags["msg-param-profileImageURL"],
                  displayName: message.tags["msg-param-displayName"] || message.tags["display-name"] || message.tags["msg-param-login"] || message.tags["login"],
                  viewers: parseInt(message.tags["msg-param-viewerCount"]),
                  channel,
                  channelId: message.tags["room-id"],
                  username: message.tags["msg-param-login"] || message.tags["login"],
                  userId: message.tags["user-id"],
                  timestamp: parseInt(message.tags["tmi-sent-ts"]),
                  extra: message.tags
                }
              };
            default:
              console.log("TODO IMPLEMENT COMMAND", message);
              break;
          }
          break;
        case "WHISPER":
          console.log(message);
          console.log("Channel:", channel, message.parameters);
          return {
            type: "whisper",
            data: {
              displayName: message.tags["display-name"] || message.tags["login"] || parseUsername(message.source),
              username: parseUsername(message.source),
              userId: message.tags["user-id"],
              userType: TwitchUserTypes[message.tags["user-type"]],
              color: message.tags["color"],
              badges: message.tags["badges"],
              emotes: message.tags["emotes"],
              turbo: message.tags["turbo"] === "1",
              threadId: message.tags["thread-id"],
              messageId: message.tags["message-id"],
              message: message.parameters,
              messageType: "whisper",
              extra: message.tags
            }
          };
        case "NOTICE":
          if (((_a = message.parameters) == null ? void 0 : _a.includes("Login unsuccessful")) || ((_b = message.parameters) == null ? void 0 : _b.includes("Login authentication failed")) || ((_c = message.parameters) == null ? void 0 : _c.includes("Error logging in")) || ((_d = message.parameters) == null ? void 0 : _d.includes("Improperly formatted auth")) || ((_e = message.parameters) == null ? void 0 : _e.includes("Invalid NICK")) || ((_f = message.parameters) == null ? void 0 : _f.includes("Invalid CAP REQ"))) {
            return {
              type: "error",
              data: {
                channel,
                message: message.parameters
              }
            };
          }
          return {
            type: "notice",
            data: {
              channel,
              msgId: message.tags["msg-id"],
              message: message.parameters
            }
          };
        case "CLEARCHAT":
          if (message.tags["target-user-id"]) {
            if (message.tags["ban-duration"]) {
              return {
                type: "Timeout",
                data: {
                  channel,
                  channelId: message.tags["room-id"],
                  duration: parseInt(message.tags["ban-duration"]),
                  username: message.parameters,
                  userId: message.tags["target-user-id"],
                  timestamp: parseInt(message.tags["tmi-sent-ts"]),
                  extra: message.tags
                }
              };
            } else {
              return {
                type: "Ban",
                data: {
                  channel,
                  channelId: message.tags["room-id"],
                  username: message.parameters,
                  userId: message.tags["target-user-id"],
                  timestamp: parseInt(message.tags["tmi-sent-ts"]),
                  extra: message.tags
                }
              };
            }
          } else {
            return {
              type: "ClearChat",
              data: {
                channel,
                channelId: message.tags["room-id"],
                timestamp: parseInt(message.tags["tmi-sent-ts"]),
                extra: message.tags
              }
            };
          }
          break;
        case "CLEARMSG":
          return {
            type: "MessageDeleted",
            data: {
              channel,
              channelId: message.tags["room-id"],
              // Room ID seems to be empty for this event
              displayName: message.tags["display-name"] || message.tags["login"],
              username: message.tags["login"],
              id: message.tags["target-msg-id"],
              message: message.parameters,
              timestamp: parseInt(message.tags["tmi-sent-ts"]),
              extra: message.tags
            }
          };
        case "PRIVMSG":
          return handleChatMessage(message, channel);
        case "RECONNECT":
          console.log("The Twitch IRC server is about to terminate the connection for maintenance.");
          break;
        default:
          {
            const commandNumber = parseInt(commandParts[0]);
            if (commandNumber >= 400) {
              console.debug(`Error IRC command: ${commandNumber}`, message);
              return null;
            } else {
              switch (commandNumber) {
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
                  return { type: "connect", data: { username: commandParts[1] } };
                default:
                  console.debug("Unsupported numeric command", commandNumber);
                  return null;
              }
            }
          }
          break;
      }
    } else {
      console.debug("Unprocessed IRC message:", message.raw);
    }
  } catch (error) {
    console.error(error);
    return {
      type: "Warning",
      data: error
    };
  }
  console.log(message);
  return null;
}
function requestCapabilities(ws) {
  ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
}
function authenticate(ws, username, password) {
  const ircUsername = password ? username : `justinfan${Math.floor(Math.random() * 99998999 + 1e3)}`;
  const ircPassword = password || `INSTAFLUFF`;
  ws.send(`PASS ${ircPassword}`);
  ws.send(`NICK ${ircUsername}`);
}
function joinChannel(ws, channel) {
  ws.send(`JOIN #${channel}`);
}
function leaveChannel(ws, channel) {
  ws.send(`PART #${channel}`);
}
function ping(ws) {
  ws.send(`PING`);
}
function pong(ws) {
  ws.send(`PONG`);
}
function sendChat(ws, channel, message) {
  ws.send(`PRIVMSG #${channel} :${message}`);
}
function replyChat(ws, channel, messageId, message) {
  ws.send(`@reply-parent-msg-id=${messageId} PRIVMSG #${channel} :${message}`);
}
class TwitchChat {
  constructor(username, password, channels, isDebug) {
    __privateAdd(this, _mainChannel);
    __privateAdd(this, _isConnected);
    __privateAdd(this, _connect);
    __privateAdd(this, _onOpen);
    __privateAdd(this, _onError);
    __privateAdd(this, _onClose);
    __privateAdd(this, _ping);
    __privateAdd(this, _handleSpecialEvents);
    __privateAdd(this, _onMessage);
    __privateAdd(this, _ws, void 0);
    __privateAdd(this, _username, void 0);
    __privateAdd(this, _password, void 0);
    __privateAdd(this, _pingTimer, void 0);
    __privateAdd(this, _pingTime, void 0);
    __privateSet(this, _pingTime, 0);
    this.chatModes = {};
    this.handlers = {};
    __privateSet(this, _username, username);
    __privateSet(this, _password, password);
    this.debug = !!isDebug;
    if (typeof channels === "string" || channels instanceof String) {
      channels = [channels];
    }
    this.channels = channels || [username];
    __privateMethod(this, _connect, connect_fn).call(this);
  }
  get version() {
    return "2.0.0";
  }
  on(eventType, handler) {
    this.handlers[eventType] = handler;
  }
  say(message, channel) {
    if (!__privateGet(this, _ws)) {
      return;
    }
    if (!__privateGet(this, _isConnected, isConnected_get)) {
      return;
    }
    sendChat(__privateGet(this, _ws), channel || __privateGet(this, _mainChannel, mainChannel_get), message);
  }
  reply(messageId, message, channel) {
    if (!__privateGet(this, _ws)) {
      return;
    }
    if (!__privateGet(this, _isConnected, isConnected_get)) {
      return;
    }
    replyChat(__privateGet(this, _ws), channel || __privateGet(this, _mainChannel, mainChannel_get), messageId, message);
  }
  join(channel) {
    if (!__privateGet(this, _ws)) {
      return;
    }
    if (!__privateGet(this, _isConnected, isConnected_get)) {
      return;
    }
    joinChannel(__privateGet(this, _ws), channel);
  }
  leave(channel) {
    if (!__privateGet(this, _ws)) {
      return;
    }
    if (!__privateGet(this, _isConnected, isConnected_get)) {
      return;
    }
    leaveChannel(__privateGet(this, _ws), channel);
  }
  deleteMessage(messageId, channel) {
    if (!__privateGet(this, _ws)) {
      return;
    }
    if (!__privateGet(this, _isConnected, isConnected_get)) {
      return;
    }
  }
  destroy() {
    if (__privateGet(this, _ws) && __privateGet(this, _ws).readyState !== __privateGet(this, _ws).CLOSED) {
      __privateGet(this, _ws).close();
    }
  }
}
_ws = new WeakMap();
_username = new WeakMap();
_password = new WeakMap();
_pingTimer = new WeakMap();
_pingTime = new WeakMap();
_mainChannel = new WeakSet();
mainChannel_get = function() {
  return this.channels[0];
};
_isConnected = new WeakSet();
isConnected_get = function() {
  return __privateGet(this, _ws) && __privateGet(this, _ws).readyState === __privateGet(this, _ws).OPEN;
};
_connect = new WeakSet();
connect_fn = function() {
  if (__privateGet(this, _isConnected, isConnected_get)) {
    return;
  }
  const TwitchServerWSS = "wss://irc-ws.chat.twitch.tv:443";
  __privateSet(this, _ws, createWebSocket(TwitchServerWSS, "irc"));
  __privateGet(this, _ws).onopen = () => {
    __privateMethod(this, _onOpen, onOpen_fn).call(this);
  };
  __privateGet(this, _ws).onmessage = (event) => {
    __privateMethod(this, _onMessage, onMessage_fn).call(this, event);
  };
  __privateGet(this, _ws).onerror = (event) => {
    __privateMethod(this, _onError, onError_fn).call(this, event);
  };
  __privateGet(this, _ws).onclose = (event) => {
    __privateMethod(this, _onClose, onClose_fn).call(this, event);
  };
};
_onOpen = new WeakSet();
onOpen_fn = function() {
  if (!__privateGet(this, _ws)) {
    return;
  }
  if (!__privateGet(this, _isConnected, isConnected_get)) {
    return;
  }
  requestCapabilities(__privateGet(this, _ws));
  authenticate(__privateGet(this, _ws), __privateGet(this, _username), __privateGet(this, _password));
  joinChannel(__privateGet(this, _ws), __privateGet(this, _mainChannel, mainChannel_get));
};
_onError = new WeakSet();
onError_fn = function(event) {
  console.error("ERROR", event);
};
_onClose = new WeakSet();
onClose_fn = function(event) {
  console.info("CLOSE", event);
  if (__privateGet(this, _pingTimer)) {
    clearInterval(__privateGet(this, _pingTimer));
  }
};
_ping = new WeakSet();
ping_fn = function() {
  if (!__privateGet(this, _ws)) {
    return;
  }
  if (!__privateGet(this, _isConnected, isConnected_get)) {
    return;
  }
  __privateSet(this, _pingTime, Date.now());
  ping(__privateGet(this, _ws));
};
_handleSpecialEvents = new WeakSet();
handleSpecialEvents_fn = function(message) {
  if (!__privateGet(this, _ws)) {
    return;
  }
  if (!__privateGet(this, _isConnected, isConnected_get)) {
    return;
  }
  switch (message.type) {
    case TwitchEventType.Connect:
      __privateSet(this, _username, message.data.username);
      if (__privateGet(this, _pingTimer)) {
        clearInterval(__privateGet(this, _pingTimer));
      }
      __privateSet(this, _pingTimer, setInterval(() => {
        __privateMethod(this, _ping, ping_fn).call(this);
      }, 6e4));
      break;
    case TwitchEventType.Ping:
      pong(__privateGet(this, _ws));
      break;
    case TwitchEventType.Pong:
      message.data = message.data || {};
      message.data["latency"] = Date.now() - __privateGet(this, _pingTime);
      break;
    case TwitchEventType.RoomState:
      this.chatModes[message.data.channel] = {
        ...this.chatModes[message.data.channel],
        ...message.data
      };
      if (this.handlers[TwitchEventType.ChatMode]) {
        this.handlers[TwitchEventType.ChatMode](this.chatModes[message.data.channel]);
      }
      break;
    case TwitchEventType.Error:
      __privateGet(this, _ws).close();
      break;
    case TwitchEventType.Chat:
      message.data.self = message.data.username === __privateGet(this, _username);
      if (this.handlers[TwitchEventType.Reply] && message.data.extra["reply-parent-msg-id"]) {
        this.handlers[TwitchEventType.Reply]({
          ...message.data,
          parentId: message.data.extra["reply-parent-msg-id"],
          parentUserId: message.data.extra["reply-parent-user-id"],
          parentUser: message.data.extra["reply-parent-user-login"],
          parentMessage: message.data.extra["reply-parent-msg-body"],
          parentDisplayName: message.data.extra["reply-parent-display-name"] || message.data.extra["reply-parent-user-login"]
        });
      }
      break;
  }
};
_onMessage = new WeakSet();
onMessage_fn = function(event) {
  if (!__privateGet(this, _ws)) {
    return;
  }
  if (!__privateGet(this, _isConnected, isConnected_get)) {
    return;
  }
  const parts = event.data.trim().split(`\r
`);
  for (const str of parts) {
    const message = processMessage(parseMessage(str));
    if (message && message.type !== TwitchEventType.None) {
      __privateMethod(this, _handleSpecialEvents, handleSpecialEvents_fn).call(this, message);
      if (this.handlers[message.type]) {
        this.handlers[message.type](message.data);
      }
      if (this.handlers[TwitchEventType.All]) {
        this.handlers[TwitchEventType.All]({
          event: message.type,
          ...message.data
        });
      }
    }
  }
};
let comfyInstance;
function parseMessageEmotes(messageEmotes) {
  if (messageEmotes) {
    const emotes = messageEmotes.split("/");
    const emoteMap = {};
    for (const emote of emotes) {
      const [id, positions] = emote.split(":");
      emoteMap[id] = positions.split(",");
    }
    return emoteMap;
  }
  return null;
}
function convertContextToUserState(context) {
  const userState = {};
  for (const key in context.extra) {
    if (context.extra[key] === "") {
      userState[key] = null;
    } else if (context.extra[key] === "1") {
      userState[key] = true;
    } else if (context.extra[key] === "0") {
      userState[key] = false;
    } else {
      userState[key] = context.extra[key];
    }
  }
  userState["badge-info-raw"] = userState["badge-info"];
  userState["badge-info"] = context.userBadgeInfo || null;
  userState["badges-raw"] = userState.badges;
  userState.badges = context.userBadges || null;
  userState["emotes-raw"] = userState.emotes;
  userState.emotes = parseMessageEmotes(context.messageEmotes);
  userState.username = context.username;
  userState["message-type"] = context.messageType;
  return userState;
}
const comfyJS = {
  version: () => {
    return "2.0.0";
  },
  onError: (error) => {
    console.error("Error:", error);
  },
  onCommand: (user, command, message, flags, extra) => {
    if (comfyInstance && comfyInstance.debug) {
      console.debug("onCommand default handler");
    }
  },
  onChat: (user, message, flags, self, extra) => {
    if (comfyInstance && comfyInstance.debug) {
      console.debug("onChat default handler");
    }
  },
  onWhisper: (user, message, flags, self, extra) => {
    if (comfyInstance && comfyInstance.debug) {
      console.debug("onWhisper default handler");
    }
  },
  onSub: (user, message, subTierInfo, extra) => {
    if (comfyInstance && comfyInstance.debug) {
      console.debug("onSub default handler");
    }
  },
  onResub: (user, message, streamMonths, cumulativeMonths, subTierInfo, extra) => {
    if (comfyInstance && comfyInstance.debug) {
      console.debug("onResub default handler");
    }
  },
  onSubGift: (gifterUser, streakMonths, recipientUser, senderCount, subTierInfo, extra) => {
    if (comfyInstance && comfyInstance.debug) {
      console.debug("onSubGift default handler");
    }
  },
  onSubMysteryGift: (gifterUser, numbOfSubs, senderCount, subTierInfo, extra) => {
    if (comfyInstance && comfyInstance.debug) {
      console.debug("onSubMysteryGift default handler");
    }
  },
  onTimeout: (user, duration, extra) => {
    if (comfyInstance && comfyInstance.debug) {
      console.debug("onTimeout default handler");
    }
  },
  onBan: (user, extra) => {
    if (comfyInstance && comfyInstance.debug) {
      console.debug("onBan default handler");
    }
  },
  Init: (username, password, channels, isDebug) => {
    comfyInstance = new TwitchChat(username, password, channels, isDebug);
    comfyInstance.on(TwitchEventType.Command, (context) => {
      comfyJS.onCommand(context.displayName || context.username, context.command, context.message, context.flags, { ...context, userState: convertContextToUserState(context), extra: null, flags: null, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes) });
    });
    comfyInstance.on(TwitchEventType.Chat, (context) => {
      comfyJS.onChat(context.displayName || context.username, context.message, context.flags, context.self, { ...context, userState: convertContextToUserState(context), extra: null, flags: null, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes) });
    });
    comfyInstance.on(TwitchEventType.Subscribe, (context) => {
      comfyJS.onSub(context.displayName || context.username, context.message, context.subTierInfo, { ...context, userState: convertContextToUserState(context), extra: null, flags: null, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes) });
    });
    comfyInstance.on(TwitchEventType.Resubscribe, (context) => {
      comfyJS.onResub(context.displayName || context.username, context.message, context.months, context.cumulativeMonths, context.subTierInfo, { ...context, userState: convertContextToUserState(context), extra: null, flags: null, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes) });
    });
    comfyInstance.on(TwitchEventType.SubGift, (context) => {
      comfyJS.onSubGift(context.displayName || context.username, context.streakMonths, context.recipientUser, context.senderCount, context.subTierInfo, { ...context, userState: convertContextToUserState(context), extra: null, flags: null, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes) });
    });
    comfyInstance.on(TwitchEventType.MysterySubGift, (context) => {
      comfyJS.onSubMysteryGift(context.displayName || context.username, context.numbOfSubs, context.senderCount, context.subTierInfo, { ...context, userState: convertContextToUserState(context), extra: null, flags: null, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes) });
    });
    comfyInstance.on(TwitchEventType.Timeout, (context) => {
      comfyJS.onTimeout(context.displayName || context.username, context.duration, { ...context, userState: convertContextToUserState(context), extra: null, flags: null, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes), timedOutUserId: context.userId });
    });
    comfyInstance.on(TwitchEventType.Ban, (context) => {
      comfyJS.onBan(context.displayName || context.username, { ...context, userState: convertContextToUserState(context), extra: null, flags: null, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes), bannedUserId: context.userId });
    });
  }
};
if (typeof module !== "undefined" && module.exports) {
  module.exports = comfyJS;
}
if (typeof window !== "undefined") {
  window.ComfyJSNew = comfyJS;
}
