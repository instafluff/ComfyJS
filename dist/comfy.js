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
var _ws, _mainChannel, mainChannel_get;
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
const TwitchServerWSS = "wss://irc-ws.chat.twitch.tv:443";
class TwitchChat {
  constructor(username, password2, channels, isDebug) {
    __privateAdd(this, _mainChannel);
    __privateAdd(this, _ws, void 0);
    this.debug = !!isDebug;
    if (typeof channels === "string" || channels instanceof String) {
      channels = [channels];
    }
    this.channels = channels || [username];
    __privateSet(this, _ws, new _WebSocket(TwitchServerWSS, ["irc"]));
    __privateGet(this, _ws).onopen = (event) => {
      __privateGet(this, _ws).send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      if (password2) {
        __privateGet(this, _ws).send(`PASS ${password2}`);
        __privateGet(this, _ws).send(`NICK ${__privateGet(this, _mainChannel, mainChannel_get)}`);
      } else {
        const randomUsername = `justinfan${Math.floor(Math.random() * 99998999 + 1e3)}`;
        const randomPassword = `INSTAFLUFF`;
        __privateGet(this, _ws).send(`PASS ${randomPassword}`);
        __privateGet(this, _ws).send(`NICK ${randomUsername}`);
        __privateGet(this, _ws).send(`JOIN #${__privateGet(this, _mainChannel, mainChannel_get)}`);
      }
    };
    __privateGet(this, _ws).onmessage = (event) => {
      var _a;
      console.log("PROCESSING:", event.data);
      const parts = event.data.trim().split(`\r
`);
      for (const str of parts) {
        const message = parseMessage(str);
        if (message.command) {
          const commandParts = (_a = message.command) == null ? void 0 : _a.split(" ");
          switch (commandParts[0]) {
            case "JOIN":
            case "PART":
            case "NOTICE":
            case "CLEARCHAT":
            case "HOSTTARGET":
            case "PRIVMSG":
              console.log("Channel:", commandParts[1], message.parameters);
              break;
            case "PING":
              break;
            case "CAP":
              console.log("capabilities", commandParts[1]);
              break;
            case "GLOBALUSERSTATE":
              console.log("Global User State");
              break;
            case "USERSTATE":
            case "ROOMSTATE":
              console.log("Channel:", commandParts[1], message.parameters);
              break;
            case "RECONNECT":
              console.log("The Twitch IRC server is about to terminate the connection for maintenance.");
              break;
            case "421":
              console.log(`Unsupported IRC command: ${commandParts[2]}`);
              return null;
            case "001":
              console.log("Channel:", commandParts[1], message.parameters);
              break;
            case "002":
            case "003":
            case "004":
            case "353":
            case "366":
            case "372":
            case "375":
            case "376":
              console.log(`numeric message: ${commandParts[0]}`);
              break;
            default:
              console.debug("Unsupported command", commandParts[0]);
              break;
          }
        }
      }
    };
    __privateGet(this, _ws).onerror = (event) => {
      console.log("ERROR", event);
    };
    __privateGet(this, _ws).onclose = (event) => {
      console.log("CLOSE", event);
    };
  }
  get version() {
    return "2.0.0";
  }
}
_ws = new WeakMap();
_mainChannel = new WeakSet();
mainChannel_get = function() {
  return this.channels[0];
};
const channel = "instafluff";
const password = void 0;
new TwitchChat(channel, password);
