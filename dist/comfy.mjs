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
var _ws, _username, _password, _pingTimer, _pingTime, _mainChannel, mainChannel_get, _isConnected, isConnected_get, _connect, connect_fn, _onOpen, onOpen_fn, _onError, onError_fn, _onClose, onClose_fn, _ping, ping_fn, _onMessage, onMessage_fn;
function extractComponent(message, index) {
  const nextSpace = message.indexOf(" ", index);
  const rawComponent = message.slice(index + 1, nextSpace);
  return {
    component: rawComponent,
    nextIndex: nextSpace + 1
  };
}
function parseMessage(message) {
  let parsedMessage = {
    raw: message,
    tags: {},
    source: null,
    command: null,
    parameters: null
  };
  let index = 0;
  if (message.charAt(0) === "@") {
    const { component, nextIndex } = extractComponent(message, 0);
    for (const tag of component.split(";")) {
      const parts = tag.split("=");
      parsedMessage.tags[parts[0]] = parts[1];
    }
    index = nextIndex;
  }
  if (message.charAt(index) === ":") {
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
const _WebSocket = global.WebSocket || require("ws");
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
  TwitchEventType2["ChatMode"] = "roomstate";
  TwitchEventType2["Userstate"] = "userstate";
  TwitchEventType2["Join"] = "join";
  TwitchEventType2["Part"] = "part";
  TwitchEventType2["Command"] = "command";
  TwitchEventType2["Chat"] = "message";
  TwitchEventType2["Reply"] = "reply";
  TwitchEventType2["Whisper"] = "whisper";
  TwitchEventType2["Raid"] = "raid";
  TwitchEventType2["Timeout"] = "Timeout";
  TwitchEventType2["Ban"] = "Ban";
  TwitchEventType2["MessageDeleted"] = "MessageDeleted";
  TwitchEventType2["All"] = "all";
  return TwitchEventType2;
})(TwitchEventType || {});
function parseUsername(source) {
  const parts = source.split("!");
  return parts.length > 1 ? parts[0] : void 0;
}
function processMessage(message) {
  var _a;
  try {
    if (message.command) {
      const commandParts = message.command.split(" ");
      switch (commandParts[0]) {
        case "PING":
          return {
            type: "Ping",
            data: {
              timestamp: Date.now()
            }
          };
        case "PONG":
          return {
            type: "Pong",
            data: {
              timestamp: Date.now()
            }
          };
        case "CAP":
          return null;
        case "JOIN":
          return {
            type: "join",
            data: {
              channel: commandParts[1],
              username: parseUsername(message.source)
            }
          };
        case "PART":
        case "HOSTTARGET":
        case "USERNOTICE":
          console.log("TODO IMPLEMENT COMMAND", message);
          break;
        case "WHISPER":
          console.log(message);
          console.log("Channel:", commandParts[1], message.parameters);
          return {
            type: "whisper",
            data: {
              ...message.tags,
              channel: commandParts[1],
              username: parseUsername(message.source),
              message: message.parameters
            }
          };
        case "NOTICE":
          console.log("NOTICE!!!", message);
          break;
        case "CLEARCHAT":
          if (message.tags["target-user-id"]) {
            if (message.tags["ban-duration"]) {
              return {
                type: "Timeout",
                data: {
                  ...message.tags,
                  channel: commandParts[1],
                  username: message.parameters,
                  extra: message.tags
                }
              };
            } else {
              return {
                type: "Ban",
                data: {
                  ...message.tags,
                  channel: commandParts[1],
                  username: message.parameters,
                  extra: message.tags
                }
              };
            }
          } else {
          }
          break;
        case "CLEARMSG":
          return {
            type: "MessageDeleted",
            data: {
              ...message.tags,
              channel: commandParts[1],
              username: parseUsername(message.source),
              message: message.parameters,
              extra: message.tags
            }
          };
        case "PRIVMSG":
          if ((_a = message.parameters) == null ? void 0 : _a.startsWith("!")) {
            const msgParts = message.parameters.split(/ (.*)/);
            const command = msgParts[0].substring(1).toLowerCase();
            const msg = msgParts[1] || "";
            return {
              type: "command",
              data: {
                channel: commandParts[1],
                username: parseUsername(message.source),
                command,
                message: msg,
                timestamp: parseInt(message.tags["tmientTs"]),
                extra: message.tags
              }
            };
          } else {
            return {
              type: "message",
              data: {
                channel: commandParts[1],
                username: parseUsername(message.source),
                message: message.parameters,
                timestamp: parseInt(message.tags["tmi-sent-ts"]),
                extra: message.tags
              }
            };
          }
        case "GLOBALUSERSTATE":
          console.log("Global User State");
          break;
        case "USERSTATE":
          switch (message.tags["msg-id"]) {
            case "raid":
              return {
                type: "raid",
                data: {
                  profileImageURL: message.tags["msg-param-profileImageURL"],
                  displayName: message.tags["msg-param-displayName"],
                  viewers: parseInt(message.tags["msg-param-viewerCount"]),
                  channel: commandParts[1],
                  username: parseUsername(message.source),
                  timestamp: parseInt(message.tags["tmi-sent-ts"]),
                  extra: message.tags
                }
              };
            default:
              return {
                type: "userstate",
                data: {
                  ...message.tags,
                  channel: commandParts[1],
                  username: parseUsername(message.source),
                  extra: message.tags
                }
              };
          }
        case "ROOMSTATE":
          return {
            type: "roomstate",
            data: {
              emoteOnly: message.tags["emote-only"] ? message.tags["emote-only"] !== "0" : false,
              followersOnly: message.tags["followers-only"] ? message.tags["followers-only"] !== "-1" : false,
              ...message.tags,
              channel: commandParts[1]
            }
          };
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
                  return {
                    type: "connect"
                    /* Connect */
                  };
                default:
                  console.debug("Unsupported numeric command", commandNumber);
                  return null;
              }
            }
          }
          break;
      }
    } else {
      console.debug("Commandless IRC message:", message.raw);
    }
  } catch (error) {
    console.error("ERROR:", error);
    return {
      type: "error",
      data: error
    };
  }
  console.log(message);
  return null;
}
function requestCapabilities(ws) {
  ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
}
function authenticate(ws, username, password2) {
  const ircUsername = password2 ? username : `justinfan${Math.floor(Math.random() * 99998999 + 1e3)}`;
  const ircPassword = password2 || `INSTAFLUFF`;
  ws.send(`PASS ${ircPassword}`);
  ws.send(`NICK ${ircUsername}`);
}
function joinChannel(ws, channel2) {
  ws.send(`JOIN #${channel2}`);
}
function ping(ws) {
  ws.send(`PING`);
}
function pong(ws) {
  ws.send(`PONG`);
}
function sendChat(ws, channel2, message) {
  ws.send(`PRIVMSG #${channel2} :${message}`);
}
function replyChat(ws, channel2, messageId, message) {
  ws.send(`@reply-parent-msg-id=${messageId} PRIVMSG #${channel2} :${message}`);
}
class TwitchChat {
  constructor(username, password2, channels, isDebug) {
    __privateAdd(this, _mainChannel);
    __privateAdd(this, _isConnected);
    __privateAdd(this, _connect);
    __privateAdd(this, _onOpen);
    __privateAdd(this, _onError);
    __privateAdd(this, _onClose);
    __privateAdd(this, _ping);
    __privateAdd(this, _onMessage);
    __privateAdd(this, _ws, void 0);
    __privateAdd(this, _username, void 0);
    __privateAdd(this, _password, void 0);
    __privateAdd(this, _pingTimer, void 0);
    __privateAdd(this, _pingTime, void 0);
    __privateSet(this, _pingTime, 0);
    this.handlers = {
      [TwitchEventType.None]: void 0,
      [TwitchEventType.Ping]: void 0,
      [TwitchEventType.Connect]: void 0,
      [TwitchEventType.Reconnected]: void 0,
      [TwitchEventType.Error]: void 0,
      [TwitchEventType.ChatMode]: void 0,
      [TwitchEventType.Userstate]: void 0,
      [TwitchEventType.Join]: void 0,
      [TwitchEventType.Part]: void 0,
      [TwitchEventType.Command]: void 0,
      [TwitchEventType.Chat]: void 0,
      [TwitchEventType.Whisper]: void 0,
      [TwitchEventType.Raid]: void 0,
      [TwitchEventType.All]: void 0
    };
    __privateSet(this, _username, username);
    __privateSet(this, _password, password2);
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
  say(message, channel2) {
    if (!__privateGet(this, _ws)) {
      return;
    }
    if (!__privateGet(this, _isConnected, isConnected_get)) {
      return;
    }
    sendChat(__privateGet(this, _ws), channel2 || __privateGet(this, _mainChannel, mainChannel_get), message);
  }
  reply(messageId, message, channel2) {
    if (!__privateGet(this, _ws)) {
      return;
    }
    if (!__privateGet(this, _isConnected, isConnected_get)) {
      return;
    }
    replyChat(__privateGet(this, _ws), channel2 || __privateGet(this, _mainChannel, mainChannel_get), messageId, message);
  }
  deleteMessage(messageId, channel2) {
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
  console.log("ERROR", event);
};
_onClose = new WeakSet();
onClose_fn = function(event) {
  console.log("CLOSE", event);
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
      if (message.type === TwitchEventType.Connect) {
        if (__privateGet(this, _pingTimer)) {
          clearInterval(__privateGet(this, _pingTimer));
        }
        __privateSet(this, _pingTimer, setInterval(() => {
          __privateMethod(this, _ping, ping_fn).call(this);
        }, 6e4));
      }
      if (message.type === TwitchEventType.Ping) {
        pong(__privateGet(this, _ws));
      }
      if (message.type === TwitchEventType.Pong) {
        message.data["latency"] = message.data.timestamp - __privateGet(this, _pingTime);
      }
      if (this.handlers[message.type]) {
        this.handlers[message.type](message.data);
      }
      if (message.type === TwitchEventType.Chat) {
        if (this.handlers[TwitchEventType.Reply] && message.data.extra["reply-parent-msg-id"]) {
          this.handlers[TwitchEventType.Reply]({
            ...message.data,
            parentId: message.data.extra["reply-parent-msg-id"],
            parentUserId: message.data.extra["reply-parent-user-id"],
            parentUser: message.data.extra["reply-parent-user-login"],
            parentMessage: message.data.extra["reply-parent-msg-body"],
            parentDisplayName: message.data.extra["reply-parent-display-name"]
          });
        }
      }
      if (this.handlers[TwitchEventType.All]) {
        this.handlers[TwitchEventType.All](message.data);
      }
    }
  }
};
const secretPassword = "oauth:bmifibqgh2tcmvx7i5a41bgbks3pt5";
const channel = "instafluff";
const password = secretPassword;
const comfyJs = new TwitchChat(channel, password);
comfyJs.on(TwitchEventType.Connect, () => {
  console.log("Connected to Twitch Chat!");
});
comfyJs.on(TwitchEventType.Error, (context) => {
  console.error("ERROR:", context);
});
comfyJs.on(TwitchEventType.ChatMode, (context) => {
  console.error("ChatMode:", context);
});
comfyJs.on(TwitchEventType.Command, (context) => {
  console.log(`${context.channel} - ${context.username} used command !${context.command} ${context.message}`, context);
  if (context.command === "reply") {
    console.log(context);
    comfyJs.reply(context.extra.id, "Hello!");
  }
  if (context.command === "delete") {
    console.log(context);
    comfyJs.deleteMessage(context.extra.id);
  }
});
comfyJs.on(TwitchEventType.Chat, (context) => {
  console.log(`${context.channel} - ${context.username} : ${context.message}`, context);
});
comfyJs.on(TwitchEventType.Chat, (context) => {
  console.log(`${context.channel} - ${context.username} : ${context.message}`, context);
});
comfyJs.on(TwitchEventType.Whisper, (context) => {
  console.log(`${context.channel} - ${context.username} : ${context.message}`);
});
comfyJs.on(TwitchEventType.Raid, (context) => {
  console.log(`${context.channel} - ${context.username} has raided!`, context);
});
comfyJs.on(TwitchEventType.Reply, (context) => {
  console.log(`${context.channel} - ${context.username} replied to ${context.parentDisplayName} : ${context.message}`, context);
  setTimeout(() => {
    comfyJs.reply(context.extra.id, "Yes, I am replying to your message");
  }, 3e3);
});
comfyJs.on(TwitchEventType.Pong, (context) => {
  console.log(`PONG: ${context.latency} ms`);
});
comfyJs.on(TwitchEventType.MessageDeleted, (context) => {
  console.log(`Message Deleted in ${context.channel}`, context);
});
comfyJs.on(TwitchEventType.Ban, (context) => {
  console.log(`User Banned in ${context.channel}`, context);
});
comfyJs.on(TwitchEventType.Timeout, (context) => {
  console.log(`User Timed Out in ${context.channel}`, context);
});
