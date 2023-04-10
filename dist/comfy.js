"use strict";
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
var _ws, _username, _password, _pingTimer, _pingTime, _latency, _mainChannel, mainChannel_get, _isConnected, isConnected_get, _connect, connect_fn, _onOpen, onOpen_fn, _onError, onError_fn, _onClose, onClose_fn, _ping, ping_fn, _handleSpecialEvents, handleSpecialEvents_fn, _onMessage, onMessage_fn;
function unescapeIRC(text) {
  if (!text || typeof text !== "string" || !text.includes("\\")) {
    return text;
  }
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
      const tagSplitIndex = tag.indexOf("=");
      const key = tag.substring(0, tagSplitIndex);
      const value = tag.substring(tagSplitIndex + 1);
      switch (key) {
        case "emote-sets":
        case "ban-duration":
        case "bits":
        case "id":
        case "room-id":
        case "color":
        case "login":
          parsedMessage.tags[key] = value;
          break;
        default:
          parsedMessage.tags[key] = unescapeIRC(value);
          break;
      }
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
  TwitchEventType2["Reconnect"] = "reconnect";
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
  TwitchEventType2["MysterySubGift"] = "submysterygift";
  TwitchEventType2["SubGiftContinue"] = "subgiftcontinue";
  TwitchEventType2["Raid"] = "raid";
  TwitchEventType2["Unraid"] = "unraid";
  TwitchEventType2["Timeout"] = "Timeout";
  TwitchEventType2["Ban"] = "Ban";
  TwitchEventType2["MessageDeleted"] = "MessageDeleted";
  TwitchEventType2["ViewerMilestone"] = "ViewerMilestone";
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
  if (!source) {
    return void 0;
  }
  const userIndex = source.indexOf("!");
  return userIndex !== -1 ? source.slice(0, userIndex) : void 0;
}
function parseBadges(badgesTag) {
  if (!badgesTag) {
    return void 0;
  }
  const badgeList = badgesTag.split(",");
  const badges = {};
  for (const badge of badgeList) {
    const splitIndex = badge.indexOf("/");
    badges[badge.slice(0, splitIndex)] = badge.slice(splitIndex + 1);
  }
  return badges;
}
function parseMessageFlags(flagsTag) {
  if (!flagsTag) {
    return void 0;
  }
  const flagsList = flagsTag.split(",");
  const flags = {};
  for (const flag of flagsList) {
    const colonIndex = flag.indexOf(":");
    const dotIndex = flag.indexOf(".");
    const category = flag.slice(colonIndex + 1, dotIndex);
    const level = parseInt(flag.slice(dotIndex + 1));
    switch (category) {
      case "A":
        flags[
          "aggressive"
          /* AggressiveContent */
        ] = Math.max(
          flags[
            "aggressive"
            /* AggressiveContent */
          ] || 0,
          level
        );
        break;
      case "I":
        flags[
          "identity-hate"
          /* IdentityBasedHate */
        ] = Math.max(
          flags[
            "identity-hate"
            /* IdentityBasedHate */
          ] || 0,
          level
        );
        break;
      case "P":
        flags[
          "profane"
          /* ProfaneContent */
        ] = Math.max(
          flags[
            "profane"
            /* ProfaneContent */
          ] || 0,
          level
        );
        break;
      case "S":
        flags[
          "sexual"
          /* SexualContent */
        ] = Math.max(
          flags[
            "sexual"
            /* SexualContent */
          ] || 0,
          level
        );
        break;
    }
  }
  return flags;
}
function handleChatMessage(message, channel) {
  var _a, _b, _c;
  const isAction = (_a = message.parameters) == null ? void 0 : _a.startsWith("ACTION");
  const sanitizedMessage = isAction ? (_c = (_b = message.parameters) == null ? void 0 : _b.match(/^\u0001ACTION ([^\u0001]+)\u0001$/)) == null ? void 0 : _c[1] : message.parameters;
  const tags = message.tags;
  const id = tags["id"];
  const channelId = tags["room-id"];
  const userId = tags["user-id"];
  const username = parseUsername(message.source);
  const displayName = tags["display-name"] || tags["login"] || username;
  const userType = TwitchUserTypes[tags["user-type"]];
  const badgeInfo = tags["badge-info"] ? parseBadges(tags["badge-info"]) : void 0;
  const badges = tags["badges"] ? parseBadges(tags["badges"]) : void 0;
  const userColor = tags["color"] || void 0;
  const emotes = tags["emotes"];
  const messageFlags = tags["flags"];
  const contentFlags = void 0;
  const isBroadcaster = username === channel;
  const isMod = tags["mod"] === "1";
  const isSubscriber = tags["subscriber"] === "1";
  const isTurbo = tags["turbo"] === "1";
  const isVIP = badges ? !!badges["vip"] : false;
  const isPrime = badges ? !!badges["premium"] : false;
  const isPartner = badges ? !!badges["partner"] : false;
  const isGameDeveloper = badges ? !!badges["game-developer"] : false;
  const isFounder = badges ? !!badges["founder"] : false;
  const timestamp = parseInt(tags["tmi-sent-ts"]);
  const isEmoteOnly = tags["emote-only"] === "1";
  const isHighlightedMessage = tags["msg-id"] === "highlighted-message";
  const isSkipSubsModeMessage = tags["msg-id"] === "skip-subs-mode-message";
  const customRewardId = tags["custom-reward-id"] || null;
  const isFirstMessage = tags["first-msg"] === "1";
  const isReturningChatter = tags["returning-chatter"] === "1";
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
  const commonData = {
    channel,
    channelId,
    displayName,
    username,
    userId,
    userType,
    id,
    messageType: isAction ? "action" : "chat",
    messageEmotes: emotes,
    messageFlags,
    contentFlags,
    isEmoteOnly,
    userColor,
    userBadgeInfo: badgeInfo,
    userBadges: badges,
    customRewardId,
    flags,
    timestamp,
    extra: {
      ...tags,
      flags: messageFlags || null
    }
  };
  if (tags["bits"]) {
    return {
      type: "Cheer",
      data: {
        ...commonData,
        message: message.parameters,
        bits: parseInt(tags["bits"])
      }
    };
  } else {
    const isCommand = sanitizedMessage == null ? void 0 : sanitizedMessage.startsWith("!");
    const msgParts = isCommand ? sanitizedMessage.split(/ (.*)/) : null;
    const command = isCommand ? msgParts[0].substring(1).toLowerCase() : null;
    const msg = isCommand ? msgParts[1] || "" : null;
    return {
      type: isCommand ? "command" : "message",
      data: {
        ...commonData,
        message: isCommand ? msg : sanitizedMessage,
        command
      }
    };
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
              badgeInfo: message.tags["badge-info"] ? parseBadges(message.tags["badge-info"]) : void 0,
              badges: message.tags["badges"] ? parseBadges(message.tags["badges"]) : void 0,
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
                  messageType: message.tags["msg-id"],
                  messageEmotes: message.tags["emotes"],
                  timestamp: parseInt(message.tags["tmi-sent-ts"]),
                  extra: message.tags
                }
              };
            case "sub":
              return {
                type: "sub",
                data: {
                  id: message.tags["id"],
                  displayName: message.tags["display-name"] || message.tags["login"],
                  months: parseInt(message.tags["msg-param-months"]),
                  multiMonthDuration: parseInt(message.tags["msg-param-multimonth-duration"]),
                  multiMonthTenure: parseInt(message.tags["msg-param-multimonth-tenure"]),
                  shouldShareStreak: message.tags["msg-param-should-share-streak"] === "1",
                  subPlan: message.tags["msg-param-sub-plan"],
                  subPlanName: message.tags["msg-param-sub-plan-name"],
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
                  userType: TwitchUserTypes[message.tags["user-type"]],
                  userBadgeInfo: message.tags["badge-info"] ? parseBadges(message.tags["badge-info"]) : void 0,
                  userBadges: message.tags["badges"] ? parseBadges(message.tags["badges"]) : void 0,
                  userColor: message.tags["color"] || void 0,
                  message: message.parameters,
                  messageType: message.tags["msg-id"],
                  messageEmotes: message.tags["emotes"],
                  messageFlags: message.tags["flags"],
                  contentFlags: parseMessageFlags(message.tags["flags"]),
                  timestamp: parseInt(message.tags["tmi-sent-ts"]),
                  extra: message.tags
                }
              };
            case "resub":
              return {
                type: "resub",
                data: {
                  id: message.tags["id"],
                  displayName: message.tags["display-name"] || message.tags["login"],
                  cumulativeMonths: parseInt(message.tags["msg-param-cumulative-months"]),
                  months: parseInt(message.tags["msg-param-months"]),
                  multiMonthDuration: parseInt(message.tags["msg-param-multimonth-duration"]),
                  multiMonthTenure: parseInt(message.tags["msg-param-multimonth-tenure"]),
                  ...message.tags["msg-param-streak-months"] && { streakMonths: parseInt(message.tags["msg-param-streak-months"]) },
                  shouldShareStreak: message.tags["msg-param-should-share-streak"] === "1",
                  subPlan: message.tags["msg-param-sub-plan"],
                  subPlanName: message.tags["msg-param-sub-plan-name"],
                  wasGifted: message.tags["msg-param-was-gifted"] === "true",
                  channel,
                  channelId: message.tags["room-id"],
                  username: message.tags["login"],
                  userId: message.tags["user-id"],
                  userType: TwitchUserTypes[message.tags["user-type"]],
                  userBadgeInfo: message.tags["badge-info"] ? parseBadges(message.tags["badge-info"]) : void 0,
                  userBadges: message.tags["badges"] ? parseBadges(message.tags["badges"]) : void 0,
                  userColor: message.tags["color"] || void 0,
                  message: message.parameters,
                  messageType: message.tags["msg-id"],
                  messageEmotes: message.tags["emotes"],
                  messageFlags: message.tags["flags"],
                  contentFlags: parseMessageFlags(message.tags["flags"]),
                  timestamp: parseInt(message.tags["tmi-sent-ts"]),
                  extra: message.tags
                }
              };
            case "submysterygift":
              return {
                type: "submysterygift",
                data: {
                  id: message.tags["id"],
                  displayName: message.tags["display-name"] || message.tags["login"],
                  giftCount: parseInt(message.tags["msg-param-mass-gift-count"]),
                  senderCount: parseInt(message.tags["msg-param-sender-count"] || "0"),
                  subPlan: message.tags["msg-param-sub-plan"],
                  subPlanName: message.tags["msg-param-sub-plan-name"],
                  ...message.tags["msg-param-goal-contribution-type"] && { goalContributionType: message.tags["msg-param-goal-contribution-type"] },
                  ...message.tags["msg-param-goal-current-contributions"] && { goalCurrentContributions: parseInt(message.tags["msg-param-goal-current-contributions"]) },
                  ...message.tags["msg-param-goal-description"] && { goalDescription: message.tags["msg-param-goal-description"] },
                  ...message.tags["msg-param-goal-target-contributions"] && { goalTargetContributions: parseInt(message.tags["msg-param-goal-target-contributions"]) },
                  ...message.tags["msg-param-goal-user-contributions"] && { goalUserContributions: parseInt(message.tags["msg-param-goal-user-contributions"]) },
                  channel,
                  channelId: message.tags["room-id"],
                  username: message.tags["login"],
                  userId: message.tags["user-id"],
                  userType: TwitchUserTypes[message.tags["user-type"]],
                  userBadgeInfo: message.tags["badge-info"] ? parseBadges(message.tags["badge-info"]) : void 0,
                  userBadges: message.tags["badges"] ? parseBadges(message.tags["badges"]) : void 0,
                  userColor: message.tags["color"] || void 0,
                  messageType: message.tags["msg-id"],
                  timestamp: parseInt(message.tags["tmi-sent-ts"]),
                  extra: message.tags
                }
              };
            case "subgift":
              return {
                type: "subgift",
                data: {
                  id: message.tags["id"],
                  displayName: message.tags["display-name"] || message.tags["login"],
                  recipientDisplayName: message.tags["msg-param-recipient-display-name"],
                  recipientId: message.tags["msg-param-recipient-id"],
                  recipientUsername: message.tags["msg-param-recipient-user-name"],
                  months: parseInt(message.tags["msg-param-months"]),
                  giftMonths: parseInt(message.tags["msg-param-gift-months"]),
                  senderCount: parseInt(message.tags["msg-param-sender-count"] || "0"),
                  // How many all-time total gift subs sender has sent the channel
                  subPlan: message.tags["msg-param-sub-plan"],
                  subPlanName: message.tags["msg-param-sub-plan-name"],
                  ...message.tags["msg-param-goal-contribution-type"] && { goalContributionType: message.tags["msg-param-goal-contribution-type"] },
                  ...message.tags["msg-param-goal-current-contributions"] && { goalCurrentContributions: parseInt(message.tags["msg-param-goal-current-contributions"]) },
                  ...message.tags["msg-param-goal-description"] && { goalDescription: message.tags["msg-param-goal-description"] },
                  ...message.tags["msg-param-goal-target-contributions"] && { goalTargetContributions: parseInt(message.tags["msg-param-goal-target-contributions"]) },
                  ...message.tags["msg-param-goal-user-contributions"] && { goalUserContributions: parseInt(message.tags["msg-param-goal-user-contributions"]) },
                  channel,
                  channelId: message.tags["room-id"],
                  username: message.tags["login"],
                  userId: message.tags["user-id"],
                  userType: TwitchUserTypes[message.tags["user-type"]],
                  userBadgeInfo: message.tags["badge-info"] ? parseBadges(message.tags["badge-info"]) : void 0,
                  userBadges: message.tags["badges"] ? parseBadges(message.tags["badges"]) : void 0,
                  userColor: message.tags["color"] || void 0,
                  messageType: message.tags["msg-id"],
                  timestamp: parseInt(message.tags["tmi-sent-ts"]),
                  extra: message.tags
                }
              };
            case "giftpaidupgrade":
              return {
                type: "subgiftcontinue",
                data: {
                  id: message.tags["id"],
                  displayName: message.tags["display-name"] || message.tags["login"],
                  gifterDisplayName: message.tags["msg-param-sender-name"] || message.tags["msg-param-sender-login"],
                  gifterUsername: message.tags["msg-param-sender-login"],
                  channel,
                  channelId: message.tags["room-id"],
                  username: message.tags["login"],
                  userId: message.tags["user-id"],
                  userType: TwitchUserTypes[message.tags["user-type"]],
                  userBadgeInfo: message.tags["badge-info"] ? parseBadges(message.tags["badge-info"]) : void 0,
                  userBadges: message.tags["badges"] ? parseBadges(message.tags["badges"]) : void 0,
                  userColor: message.tags["color"] || void 0,
                  messageType: message.tags["msg-id"],
                  timestamp: parseInt(message.tags["tmi-sent-ts"]),
                  extra: message.tags
                }
              };
            case "raid":
              return {
                type: "raid",
                data: {
                  id: message.tags["id"],
                  profileImageURL: message.tags["msg-param-profileImageURL"],
                  displayName: message.tags["msg-param-displayName"] || message.tags["display-name"] || message.tags["msg-param-login"] || message.tags["login"],
                  viewers: parseInt(message.tags["msg-param-viewerCount"]),
                  channel,
                  channelId: message.tags["room-id"],
                  username: message.tags["msg-param-login"] || message.tags["login"],
                  userId: message.tags["user-id"],
                  userType: TwitchUserTypes[message.tags["user-type"]],
                  messageType: message.tags["msg-id"],
                  // TODO: Add flags and badges
                  timestamp: parseInt(message.tags["tmi-sent-ts"]),
                  extra: message.tags
                }
              };
            case "unraid":
              console.log(message);
              return {
                type: "unraid",
                data: {
                  id: message.tags["id"],
                  displayName: message.tags["display-name"] || message.tags["login"],
                  channel: message.tags["login"],
                  channelId: message.tags["room-id"],
                  username: message.tags["login"],
                  userId: message.tags["user-id"],
                  userType: TwitchUserTypes[message.tags["user-type"]],
                  userBadgeInfo: message.tags["badge-info"] ? parseBadges(message.tags["badge-info"]) : void 0,
                  userBadges: message.tags["badges"] ? parseBadges(message.tags["badges"]) : void 0,
                  userColor: message.tags["color"] || void 0,
                  messageType: message.tags["msg-id"],
                  timestamp: parseInt(message.tags["tmi-sent-ts"]),
                  extra: message.tags
                }
              };
            case "viewermilestone":
              console.log(message);
              return {
                type: "ViewerMilestone",
                data: {
                  id: message.tags["id"],
                  displayName: message.tags["display-name"] || message.tags["login"],
                  channel,
                  channelId: message.tags["room-id"],
                  username: message.tags["login"],
                  userId: message.tags["user-id"],
                  userType: TwitchUserTypes[message.tags["user-type"]],
                  messageType: message.tags["msg-id"],
                  category: message.tags["msg-param-category"],
                  milestoneId: message.tags["msg-param-id"],
                  milestoneValue: parseInt(message.tags["msg-param-value"]),
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
          return {
            type: "whisper",
            data: {
              displayName: message.tags["display-name"] || message.tags["login"] || parseUsername(message.source),
              username: parseUsername(message.source),
              userId: message.tags["user-id"],
              userType: TwitchUserTypes[message.tags["user-type"]],
              userColor: message.tags["color"] || void 0,
              userBadgeInfo: message.tags["badge-info"] ? parseBadges(message.tags["badge-info"]) : void 0,
              userBadges: message.tags["badges"] ? parseBadges(message.tags["badges"]) : void 0,
              messageEmotes: message.tags["emotes"],
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
  if (Array.isArray(channel)) {
    const channels = channel.map((c) => `#${c}`).join(",");
    ws.send(`JOIN ${channels}`);
  } else {
    ws.send(`JOIN #${channel}`);
  }
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
class TwitchEvents {
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
    __privateAdd(this, _latency, void 0);
    __privateSet(this, _pingTime, 0);
    __privateSet(this, _latency, -1);
    this.reconnects = 0;
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
  get latency() {
    return __privateGet(this, _latency);
  }
  get ws() {
    return __privateGet(this, _ws);
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
  simulateIRCMessage(message) {
    if (!__privateGet(this, _ws)) {
      return;
    }
    if (!__privateGet(this, _isConnected, isConnected_get)) {
      return;
    }
    __privateMethod(this, _onMessage, onMessage_fn).call(this, { "data": message });
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
_latency = new WeakMap();
_mainChannel = new WeakSet();
mainChannel_get = function() {
  return this.channels[0];
};
_isConnected = new WeakSet();
isConnected_get = function() {
  return !!(__privateGet(this, _ws) && __privateGet(this, _ws).readyState === __privateGet(this, _ws).OPEN);
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
      const hostUrl = new URL(__privateGet(this, _ws).url);
      message.data["address"] = hostUrl.host;
      message.data["port"] = hostUrl.protocol === "wss:" ? 443 : 80;
      message.data["isFirstConnect"] = this.reconnects === 0;
      joinChannel(__privateGet(this, _ws), this.channels);
      break;
    case TwitchEventType.Ping:
      pong(__privateGet(this, _ws));
      break;
    case TwitchEventType.Pong:
      message.data = message.data || {};
      __privateSet(this, _latency, message.data["latency"] = Date.now() - __privateGet(this, _pingTime));
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
    case TwitchEventType.Whisper:
      message.data.self = message.data.username === __privateGet(this, _username);
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
let twitchEvents;
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
  latency: () => {
    return twitchEvents ? twitchEvents.latency : -1;
  },
  getInstance: () => {
    return twitchEvents;
  },
  onConnected: (address, port, isFirstConnect) => {
    if (twitchEvents && twitchEvents.debug) {
      console.debug("onConnected default handler");
    }
  },
  onReconnect: (reconnectCount) => {
    if (twitchEvents && twitchEvents.debug) {
      console.debug("onReconnect default handler");
    }
  },
  onError: (error) => {
    console.error("Error:", error);
  },
  onCommand: (user, command, message, flags, extra) => {
    if (twitchEvents && twitchEvents.debug) {
      console.debug("onCommand default handler");
    }
  },
  onChat: (user, message, flags, self, extra) => {
    if (twitchEvents && twitchEvents.debug) {
      console.debug("onChat default handler");
    }
  },
  onCheer: (user, message, bits, flags, extra) => {
    if (twitchEvents && twitchEvents.debug) {
      console.debug("onCheer default handler");
    }
  },
  onWhisper: (user, message, flags, self, extra) => {
    if (twitchEvents && twitchEvents.debug) {
      console.debug("onWhisper default handler");
    }
  },
  onSub: (user, message, subTierInfo, extra) => {
    if (twitchEvents && twitchEvents.debug) {
      console.debug("onSub default handler");
    }
  },
  onResub: (user, message, streamMonths, cumulativeMonths, subTierInfo, extra) => {
    if (twitchEvents && twitchEvents.debug) {
      console.debug("onResub default handler");
    }
  },
  onSubGift: (gifterUser, streakMonths, recipientUser, senderCount, subTierInfo, extra) => {
    if (twitchEvents && twitchEvents.debug) {
      console.debug("onSubGift default handler");
    }
  },
  onSubMysteryGift: (gifterUser, numbOfSubs, senderCount, subTierInfo, extra) => {
    if (twitchEvents && twitchEvents.debug) {
      console.debug("onSubMysteryGift default handler");
    }
  },
  onGiftSubContinue: (user, sender, extra) => {
    if (twitchEvents && twitchEvents.debug) {
      console.debug("onGiftSubContinue default handler");
    }
  },
  onTimeout: (user, duration, extra) => {
    if (twitchEvents && twitchEvents.debug) {
      console.debug("onTimeout default handler");
    }
  },
  onBan: (user, extra) => {
    if (twitchEvents && twitchEvents.debug) {
      console.debug("onBan default handler");
    }
  },
  onMessageDeleted: (messageID, extra) => {
    if (twitchEvents && twitchEvents.debug) {
      console.debug("onMessageDeleted default handler");
    }
  },
  onRaid: (user, viewers, extra) => {
    if (twitchEvents && twitchEvents.debug) {
      console.debug("onRaid default handler");
    }
  },
  onUnraid: (channel, extra) => {
    if (twitchEvents && twitchEvents.debug) {
      console.debug("onUnraid default handler");
    }
  },
  simulateIRCMessage: (message) => {
    if (twitchEvents) {
      twitchEvents.simulateIRCMessage(message);
    }
  },
  Init: (username, password, channels, isDebug) => {
    twitchEvents = new TwitchEvents(username, password, channels, isDebug);
    twitchEvents.on(TwitchEventType.Connect, (context) => {
      comfyJS.onConnected(context.address, context.port, context.isFirstConnect);
    });
    twitchEvents.on(TwitchEventType.Reconnect, (context) => {
      console.log("RECONNECT");
      comfyJS.onReconnect(context.reconnectCount);
    });
    twitchEvents.on(TwitchEventType.Error, (error) => {
      comfyJS.onError(error);
    });
    twitchEvents.on(TwitchEventType.Command, (context) => {
      var _a;
      comfyJS.onCommand(context.displayName || context.username, context.command, context.message, context.flags, { ...context, userState: convertContextToUserState(context), extra: null, flags: (_a = context.extra) == null ? void 0 : _a.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes) });
    });
    twitchEvents.on(TwitchEventType.Chat, (context) => {
      var _a;
      comfyJS.onChat(context.displayName || context.username, context.message, context.flags, context.self, { ...context, userState: convertContextToUserState(context), extra: null, flags: (_a = context.extra) == null ? void 0 : _a.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes) });
    });
    twitchEvents.on(TwitchEventType.Whisper, (context) => {
      var _a;
      comfyJS.onWhisper(context.displayName || context.username, context.message, context.flags, context.self, { ...context, userState: convertContextToUserState(context), extra: null, flags: (_a = context.extra) == null ? void 0 : _a.flags, channel: context.username, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes) });
    });
    twitchEvents.on(TwitchEventType.Cheer, (context) => {
      var _a;
      comfyJS.onCheer(context.displayName || context.username, context.message, context.bits, context.flags, { ...context, userState: convertContextToUserState(context), extra: null, flags: (_a = context.extra) == null ? void 0 : _a.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes) });
    });
    twitchEvents.on(TwitchEventType.Subscribe, (context) => {
      var _a;
      comfyJS.onSub(context.displayName || context.username, context.message, { prime: context.subPlan === "Prime", plan: context.subPlan, planName: context.subPlanName || null }, { ...context, userState: convertContextToUserState(context), extra: null, flags: (_a = context.extra) == null ? void 0 : _a.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes) });
    });
    twitchEvents.on(TwitchEventType.Resubscribe, (context) => {
      var _a;
      comfyJS.onResub(context.displayName || context.username, context.message, context.streakMonths || 0, context.cumulativeMonths, { prime: context.subPlan === "Prime", plan: context.subPlan, planName: context.subPlanName || null }, { ...context, userState: convertContextToUserState(context), extra: null, flags: (_a = context.extra) == null ? void 0 : _a.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes) });
    });
    twitchEvents.on(TwitchEventType.SubGift, (context) => {
      var _a;
      comfyJS.onSubGift(context.displayName || context.username, context.streakMonths || 0, context.recipientDisplayName, context.senderCount, { prime: context.subPlan === "Prime", plan: context.subPlan, planName: context.subPlanName || null }, { ...context, userState: convertContextToUserState(context), extra: null, flags: (_a = context.extra) == null ? void 0 : _a.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes) });
    });
    twitchEvents.on(TwitchEventType.MysterySubGift, (context) => {
      var _a;
      comfyJS.onSubMysteryGift(context.displayName || context.username, context.giftCount, context.senderCount, { prime: context.subPlan === "Prime", plan: context.subPlan, planName: context.subPlanName || null }, { ...context, userState: convertContextToUserState(context), extra: null, flags: (_a = context.extra) == null ? void 0 : _a.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes), userMassGiftCount: context.giftCount });
    });
    twitchEvents.on(TwitchEventType.SubGiftContinue, (context) => {
      var _a;
      comfyJS.onGiftSubContinue(context.displayName || context.username, context.gifterDisplayName, { ...context, userState: convertContextToUserState(context), extra: null, flags: (_a = context.extra) == null ? void 0 : _a.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes) });
    });
    twitchEvents.on(TwitchEventType.Timeout, (context) => {
      var _a;
      comfyJS.onTimeout(context.displayName || context.username, context.duration, { ...context, userState: convertContextToUserState(context), extra: null, flags: (_a = context.extra) == null ? void 0 : _a.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes), timedOutUserId: context.userId });
    });
    twitchEvents.on(TwitchEventType.Ban, (context) => {
      var _a;
      comfyJS.onBan(context.displayName || context.username, { ...context, userState: convertContextToUserState(context), extra: null, flags: (_a = context.extra) == null ? void 0 : _a.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes), bannedUserId: context.userId });
    });
    twitchEvents.on(TwitchEventType.MessageDeleted, (context) => {
      var _a;
      comfyJS.onMessageDeleted(context.id, { ...context, userState: convertContextToUserState(context), extra: null, flags: (_a = context.extra) == null ? void 0 : _a.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes) });
    });
    twitchEvents.on(TwitchEventType.Raid, (context) => {
      var _a;
      comfyJS.onRaid(context.displayName || context.username, context.viewers, { ...context, userState: convertContextToUserState(context), extra: null, flags: (_a = context.extra) == null ? void 0 : _a.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes) });
    });
    twitchEvents.on(TwitchEventType.Unraid, (context) => {
      var _a;
      comfyJS.onUnraid(context.channel, { ...context, userState: convertContextToUserState(context), extra: null, flags: (_a = context.extra) == null ? void 0 : _a.flags, roomId: context.channelId, messageEmotes: parseMessageEmotes(context.messageEmotes) });
    });
  }
};
if (typeof module !== "undefined" && module.exports) {
  module.exports = comfyJS;
}
if (typeof window !== "undefined") {
  window.ComfyJSNew = comfyJS;
}
