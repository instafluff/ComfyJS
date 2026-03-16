"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  ComfyJS: () => ComfyJS,
  EventSubClient: () => EventSubClient,
  EventSubTypes: () => EventSubTypes,
  IRCClient: () => IRCClient,
  P2PCoordinator: () => P2PCoordinator,
  TwitchAPI: () => TwitchAPI,
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);

// src/parsers.ts
function parseIRCTags(tagString) {
  const tags = {};
  if (!tagString || tagString === "")
    return tags;
  const parts = tagString.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) {
      tags[part] = "";
    } else {
      const key = part.slice(0, idx);
      const value = part.slice(idx + 1).replace(/\\s/g, " ").replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\:/g, ";").replace(/\\\\/g, "\\");
      tags[key] = value;
    }
  }
  return tags;
}
function parseIRCMessage(raw) {
  const result = {
    raw,
    tags: {},
    prefix: null,
    nick: null,
    user: null,
    host: null,
    command: "",
    params: [],
    channel: null,
    message: null
  };
  let pos = 0;
  const len = raw.length;
  if (raw[pos] === "@") {
    const spaceIdx = raw.indexOf(" ", pos);
    if (spaceIdx === -1)
      return result;
    result.tags = parseIRCTags(raw.slice(1, spaceIdx));
    pos = spaceIdx + 1;
  }
  while (pos < len && raw[pos] === " ")
    pos++;
  if (raw[pos] === ":") {
    const spaceIdx = raw.indexOf(" ", pos);
    if (spaceIdx === -1)
      return result;
    result.prefix = raw.slice(pos + 1, spaceIdx);
    pos = spaceIdx + 1;
    const prefix = result.prefix;
    const bangIdx = prefix.indexOf("!");
    const atIdx = prefix.indexOf("@");
    if (bangIdx !== -1 && atIdx !== -1) {
      result.nick = prefix.slice(0, bangIdx);
      result.user = prefix.slice(bangIdx + 1, atIdx);
      result.host = prefix.slice(atIdx + 1);
    } else if (atIdx !== -1) {
      result.nick = prefix.slice(0, atIdx);
      result.host = prefix.slice(atIdx + 1);
    } else {
      result.nick = prefix;
    }
  }
  while (pos < len && raw[pos] === " ")
    pos++;
  const cmdSpaceIdx = raw.indexOf(" ", pos);
  if (cmdSpaceIdx === -1) {
    result.command = raw.slice(pos).toUpperCase();
    return result;
  }
  result.command = raw.slice(pos, cmdSpaceIdx).toUpperCase();
  pos = cmdSpaceIdx + 1;
  while (pos < len) {
    while (pos < len && raw[pos] === " ")
      pos++;
    if (pos >= len)
      break;
    if (raw[pos] === ":") {
      result.params.push(raw.slice(pos + 1));
      break;
    }
    const nextSpace = raw.indexOf(" ", pos);
    if (nextSpace === -1) {
      result.params.push(raw.slice(pos));
      break;
    }
    result.params.push(raw.slice(pos, nextSpace));
    pos = nextSpace + 1;
  }
  if (result.params.length > 0) {
    const firstParam = result.params[0];
    if (firstParam.startsWith("#")) {
      result.channel = firstParam.slice(1).toLowerCase();
    }
  }
  if (result.params.length > 1) {
    result.message = result.params[result.params.length - 1];
  }
  return result;
}
function parseUserFlags(tags, channel) {
  const badges = tags.badges || "";
  const nick = tags["display-name"]?.toLowerCase() || "";
  return {
    broadcaster: badges.includes("broadcaster/") || nick === channel.toLowerCase(),
    mod: tags.mod === "1" || badges.includes("moderator/"),
    vip: badges.includes("vip/"),
    subscriber: tags.subscriber === "1" || badges.includes("subscriber/") || badges.includes("founder/"),
    founder: badges.includes("founder/"),
    highlighted: tags["msg-id"] === "highlighted-message",
    customReward: !!tags["custom-reward-id"]
  };
}
function parseEmotes(emoteTag) {
  if (!emoteTag || emoteTag === "")
    return void 0;
  const emotes = {};
  const emoteParts = emoteTag.split("/");
  for (const part of emoteParts) {
    const [emoteId, positions] = part.split(":");
    if (emoteId && positions) {
      emotes[emoteId] = positions.split(",");
    }
  }
  return Object.keys(emotes).length > 0 ? emotes : void 0;
}
function parseBadges(badgeTag) {
  const badges = {};
  if (!badgeTag || badgeTag === "")
    return badges;
  const parts = badgeTag.split(",");
  for (const part of parts) {
    const [name, version] = part.split("/");
    if (name) {
      badges[name] = version || "";
    }
  }
  return badges;
}
function buildUserExtra(msg) {
  const tags = msg.tags;
  const channel = msg.channel || "";
  return {
    // v1 compatibility: `id` is the message ID (not user ID)
    id: tags.id || "",
    channel,
    roomId: tags["room-id"] || "",
    messageType: tags["msg-id"] || "chat",
    messageEmotes: parseEmotes(tags.emotes),
    isEmoteOnly: tags["emote-only"] === "1",
    userId: tags["user-id"] || "",
    username: msg.nick || tags.login || "",
    displayName: tags["display-name"] || msg.nick || "",
    userColor: tags.color || "",
    userBadges: parseBadges(tags.badges),
    userState: tags,
    // Full tags for backward compatibility
    customRewardId: tags["custom-reward-id"],
    flags: tags.flags || "",
    timestamp: tags["tmi-sent-ts"] || String(Date.now())
  };
}
function parseP2PSignal(tags) {
  const signalType = tags["comfyjs-signal"];
  if (!signalType)
    return null;
  return {
    type: signalType,
    instanceId: tags["instance-id"] || "",
    replyTo: tags["reply-to"],
    sdp: tags.sdp,
    candidate: tags.candidate
  };
}
function parseSubTier(plan) {
  const isPrime = plan === "Prime";
  let tier = "1000";
  let planName = "Tier 1";
  if (plan === "2000") {
    tier = "2000";
    planName = "Tier 2";
  } else if (plan === "3000") {
    tier = "3000";
    planName = "Tier 3";
  } else if (isPrime) {
    tier = "Prime";
    planName = "Prime";
  }
  return { prime: isPrime, plan: tier, planName };
}
function parseCommand(message, prefix = "!") {
  if (message.startsWith(prefix)) {
    const spaceIdx = message.indexOf(" ");
    if (spaceIdx === -1) {
      return { command: message.slice(prefix.length).toLowerCase(), args: "" };
    }
    return {
      command: message.slice(prefix.length, spaceIdx).toLowerCase(),
      args: message.slice(spaceIdx + 1)
    };
  }
  const parts = message.split(" ");
  if (parts.length >= 2 && parts[0].startsWith("@") && parts[1].startsWith(prefix)) {
    const command = parts[1].slice(prefix.length).toLowerCase();
    const args = parts.slice(2).join(" ");
    return { command, args };
  }
  return null;
}

// src/irc.ts
var IRC_URL = "wss://irc-ws.chat.twitch.tv:443";
var RECONNECT_DELAY_MS = 1e3;
var MAX_RECONNECT_DELAY_MS = 3e4;
var MSG_RATE_LIMIT = 20;
var MSG_RATE_LIMIT_MOD = 100;
var MSG_RATE_WINDOW_MS = 3e4;
var JOIN_RATE_LIMIT = 20;
var JOIN_RATE_WINDOW_MS = 1e4;
var IRCClient = class {
  constructor(options = {}) {
    this.ws = null;
    this.oauth = "";
    this.nick = "";
    this.channels = /* @__PURE__ */ new Set();
    // Connection state
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectCount = 0;
    this.reconnectTimer = null;
    // Rate limiting
    this.msgTimestamps = [];
    this.joinTimestamps = [];
    this.isMod = /* @__PURE__ */ new Map();
    // Event handlers
    this.onMessage = null;
    this.onSignal = null;
    this.onConnected = null;
    this.onDisconnected = null;
    this.onReconnecting = null;
    this.options = {
      debug: options.debug ?? false,
      reconnect: options.reconnect ?? true,
      maxReconnectAttempts: options.maxReconnectAttempts ?? Infinity
    };
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Connection
  // ─────────────────────────────────────────────────────────────────────────
  async connect(oauth, nick) {
    if (this.isConnected || this.isConnecting) {
      return;
    }
    this.oauth = oauth.startsWith("oauth:") ? oauth : `oauth:${oauth}`;
    this.nick = nick.toLowerCase();
    this.isConnecting = true;
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(IRC_URL);
        this.ws.onopen = () => {
          this.log("WebSocket connected, authenticating...");
          this.authenticate();
        };
        this.ws.onmessage = (event) => {
          this.handleRawMessage(event.data, resolve);
        };
        this.ws.onclose = (event) => {
          this.handleClose(event.reason || "Connection closed");
        };
        this.ws.onerror = () => {
          if (this.isConnecting) {
            reject(new Error("IRC connection failed"));
          }
        };
      } catch (err) {
        this.isConnecting = false;
        reject(err);
      }
    });
  }
  disconnect() {
    this.options.reconnect = false;
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close(1e3, "Client disconnect");
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.channels.clear();
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Authentication
  // ─────────────────────────────────────────────────────────────────────────
  authenticate() {
    this.sendRaw("CAP REQ :twitch.tv/membership twitch.tv/tags twitch.tv/commands");
    this.sendRaw(`PASS ${this.oauth}`);
    this.sendRaw(`NICK ${this.nick}`);
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Message Handling
  // ─────────────────────────────────────────────────────────────────────────
  handleRawMessage(data, onAuth) {
    const lines = data.split("\r\n").filter((line) => line.length > 0);
    for (const line of lines) {
      this.log("\u2190 " + line);
      const msg = parseIRCMessage(line);
      switch (msg.command) {
        case "PING":
          this.sendRaw(`PONG :${msg.params[0] || "tmi.twitch.tv"}`);
          continue;
        case "001":
          this.isConnected = true;
          this.isConnecting = false;
          const isFirst = this.reconnectCount === 0;
          this.reconnectCount = 0;
          this.log("Authenticated successfully");
          this.onConnected?.(isFirst);
          onAuth?.();
          this.rejoinChannels();
          continue;
        case "NOTICE":
          if (msg.message?.includes("Login authentication failed")) {
            this.disconnect();
            return;
          }
          break;
        case "RECONNECT":
          this.log("Server requested reconnect");
          this.ws?.close(1e3, "Server reconnect");
          return;
      }
      const signal = parseP2PSignal(msg.tags);
      if (signal) {
        this.onSignal?.(signal);
        continue;
      }
      this.onMessage?.(msg);
    }
  }
  handleClose(reason) {
    const wasConnected = this.isConnected;
    this.isConnected = false;
    this.isConnecting = false;
    this.ws = null;
    if (wasConnected) {
      this.onDisconnected?.(reason);
    }
    if (this.options.reconnect && this.reconnectCount < this.options.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }
  scheduleReconnect() {
    this.clearReconnectTimer();
    const delay = Math.min(
      RECONNECT_DELAY_MS * Math.pow(2, this.reconnectCount),
      MAX_RECONNECT_DELAY_MS
    );
    this.reconnectCount++;
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectCount})`);
    this.onReconnecting?.(this.reconnectCount);
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect(this.oauth, this.nick);
      } catch {
      }
    }, delay);
  }
  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Channel Management
  // ─────────────────────────────────────────────────────────────────────────
  async join(channel) {
    channel = channel.toLowerCase().replace("#", "");
    if (this.channels.has(channel))
      return;
    if (!this.canJoin()) {
      await this.waitForJoinSlot();
    }
    this.channels.add(channel);
    this.joinTimestamps.push(Date.now());
    this.sendRaw(`JOIN #${channel}`);
    this.log(`Joined #${channel}`);
  }
  part(channel) {
    channel = channel.toLowerCase().replace("#", "");
    if (!this.channels.has(channel))
      return;
    this.channels.delete(channel);
    this.isMod.delete(channel);
    this.sendRaw(`PART #${channel}`);
    this.log(`Left #${channel}`);
  }
  rejoinChannels() {
    for (const channel of this.channels) {
      this.sendRaw(`JOIN #${channel}`);
    }
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Sending Messages
  // ─────────────────────────────────────────────────────────────────────────
  async say(channel, message) {
    channel = channel.toLowerCase().replace("#", "");
    if (!this.canSendMessage(channel)) {
      await this.waitForMessageSlot(channel);
    }
    this.msgTimestamps.push(Date.now());
    this.sendRaw(`PRIVMSG #${channel} :${message}`);
  }
  async reply(channel, parentId, message) {
    channel = channel.toLowerCase().replace("#", "");
    if (!this.canSendMessage(channel)) {
      await this.waitForMessageSlot(channel);
    }
    this.msgTimestamps.push(Date.now());
    this.sendRaw(`@reply-parent-msg-id=${parentId} PRIVMSG #${channel} :${message}`);
  }
  /**
   * Send a P2P signal message (invisible to users)
   */
  sendSignal(channel, signal) {
    channel = channel.toLowerCase().replace("#", "");
    let tags = `@comfyjs-signal=${signal.type};instance-id=${signal.instanceId}`;
    if (signal.replyTo)
      tags += `;reply-to=${signal.replyTo}`;
    if (signal.sdp)
      tags += `;sdp=${this.escapeTagValue(signal.sdp)}`;
    if (signal.candidate)
      tags += `;candidate=${this.escapeTagValue(signal.candidate)}`;
    this.sendRaw(`${tags} PRIVMSG #${channel} :\u200B`);
  }
  escapeTagValue(value) {
    return value.replace(/\\/g, "\\\\").replace(/;/g, "\\:").replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/ /g, "\\s");
  }
  sendRaw(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log("Cannot send, not connected");
      return;
    }
    this.log("\u2192 " + message);
    this.ws.send(message);
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Rate Limiting
  // ─────────────────────────────────────────────────────────────────────────
  canSendMessage(channel) {
    const now = Date.now();
    const cutoff = now - MSG_RATE_WINDOW_MS;
    this.msgTimestamps = this.msgTimestamps.filter((ts) => ts > cutoff);
    const limit = this.isMod.get(channel) ? MSG_RATE_LIMIT_MOD : MSG_RATE_LIMIT;
    return this.msgTimestamps.length < limit;
  }
  async waitForMessageSlot(channel) {
    while (!this.canSendMessage(channel)) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  canJoin() {
    const now = Date.now();
    const cutoff = now - JOIN_RATE_WINDOW_MS;
    this.joinTimestamps = this.joinTimestamps.filter((ts) => ts > cutoff);
    return this.joinTimestamps.length < JOIN_RATE_LIMIT;
  }
  async waitForJoinSlot() {
    while (!this.canJoin()) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  /**
   * Call this when we detect we're a mod in a channel (for rate limit adjustment)
   */
  setModStatus(channel, isMod) {
    this.isMod.set(channel.toLowerCase().replace("#", ""), isMod);
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────
  get connected() {
    return this.isConnected;
  }
  get username() {
    return this.nick;
  }
  log(msg) {
    if (this.options.debug) {
      console.log(`[ComfyJS IRC] ${msg}`);
    }
  }
};

// src/eventsub.ts
var EVENTSUB_URL = "wss://eventsub.wss.twitch.tv/ws";
var RECONNECT_DELAY_MS2 = 1e3;
var MAX_RECONNECT_DELAY_MS2 = 3e4;
var MAX_SUBSCRIPTIONS_PER_CONNECTION = 300;
var EventSubClient = class {
  constructor(options = {}) {
    this.ws = null;
    // Connection state
    this.sessionId = "";
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectCount = 0;
    this.reconnectTimer = null;
    this.keepaliveTimeoutMs = 1e4;
    // Updated by welcome message
    this.keepaliveTimer = null;
    // Subscriptions
    this.subscriptions = /* @__PURE__ */ new Map();
    this.pendingSubscriptions = [];
    // API callback for subscription creation
    this.createSubscription = null;
    // Event handlers
    this.onEvent = null;
    this.onConnected = null;
    this.onDisconnected = null;
    this.onReconnecting = null;
    this.options = {
      debug: options.debug ?? false,
      reconnect: options.reconnect ?? true,
      maxReconnectAttempts: options.maxReconnectAttempts ?? Infinity
    };
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Connection
  // ─────────────────────────────────────────────────────────────────────────
  async connect() {
    if (this.isConnected) {
      return this.sessionId;
    }
    if (this.isConnecting) {
      return new Promise((resolve, reject) => {
        const check = setInterval(() => {
          if (this.isConnected) {
            clearInterval(check);
            resolve(this.sessionId);
          } else if (!this.isConnecting) {
            clearInterval(check);
            reject(new Error("Connection failed"));
          }
        }, 100);
      });
    }
    this.isConnecting = true;
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(EVENTSUB_URL);
        this.ws.onopen = () => {
          this.log("WebSocket connected, waiting for welcome...");
        };
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data, resolve);
        };
        this.ws.onclose = (event) => {
          this.handleClose(event.reason || "Connection closed");
        };
        this.ws.onerror = () => {
          if (this.isConnecting) {
            this.isConnecting = false;
            reject(new Error("EventSub connection failed"));
          }
        };
      } catch (err) {
        this.isConnecting = false;
        reject(err);
      }
    });
  }
  disconnect() {
    this.options.reconnect = false;
    this.clearReconnectTimer();
    this.clearKeepaliveTimer();
    if (this.ws) {
      this.ws.close(1e3, "Client disconnect");
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.sessionId = "";
    this.subscriptions.clear();
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Message Handling
  // ─────────────────────────────────────────────────────────────────────────
  handleMessage(data, onWelcome) {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      this.log("Failed to parse message: " + data);
      return;
    }
    this.log(`\u2190 ${msg.metadata.message_type}`);
    switch (msg.metadata.message_type) {
      case "session_welcome":
        this.handleWelcome(msg, onWelcome);
        break;
      case "session_keepalive":
        this.resetKeepaliveTimer();
        break;
      case "notification":
        this.handleNotification(msg);
        break;
      case "session_reconnect":
        this.handleReconnect(msg);
        break;
      case "revocation":
        this.handleRevocation(msg);
        break;
    }
  }
  handleWelcome(msg, onWelcome) {
    const session = msg.payload.session;
    this.sessionId = session.id;
    this.keepaliveTimeoutMs = session.keepalive_timeout_seconds * 1e3;
    this.isConnected = true;
    this.isConnecting = false;
    const isFirst = this.reconnectCount === 0;
    this.reconnectCount = 0;
    this.resetKeepaliveTimer();
    this.log(`Session ID: ${this.sessionId}, keepalive: ${session.keepalive_timeout_seconds}s`);
    this.onConnected?.(this.sessionId, isFirst);
    onWelcome?.(this.sessionId);
    this.processPendingSubscriptions();
  }
  handleNotification(msg) {
    this.resetKeepaliveTimer();
    const notification = {
      subscriptionType: msg.metadata.subscription_type,
      subscriptionVersion: msg.metadata.subscription_version,
      event: msg.payload.event
    };
    this.log(`Event: ${notification.subscriptionType}`);
    this.onEvent?.(notification);
  }
  handleReconnect(msg) {
    const reconnectUrl = msg.payload.session?.reconnect_url;
    if (!reconnectUrl)
      return;
    this.log(`Server requested reconnect to: ${reconnectUrl}`);
    const oldWs = this.ws;
    this.ws = new WebSocket(reconnectUrl);
    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };
    this.ws.onclose = (event) => {
      this.handleClose(event.reason || "Connection closed");
    };
    this.ws.onopen = () => {
      setTimeout(() => oldWs?.close(1e3, "Reconnected"), 1e3);
    };
  }
  handleRevocation(msg) {
    const sub = msg.payload.subscription;
    if (sub) {
      this.log(`Subscription revoked: ${sub.type} (${sub.status})`);
      this.subscriptions.delete(sub.id);
    }
  }
  handleClose(reason) {
    const wasConnected = this.isConnected;
    this.isConnected = false;
    this.isConnecting = false;
    this.ws = null;
    this.clearKeepaliveTimer();
    if (wasConnected) {
      this.onDisconnected?.(reason);
    }
    for (const pending of this.pendingSubscriptions) {
      pending.reject(new Error("Connection closed"));
    }
    this.pendingSubscriptions = [];
    if (this.options.reconnect && this.reconnectCount < this.options.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Keepalive
  // ─────────────────────────────────────────────────────────────────────────
  resetKeepaliveTimer() {
    this.clearKeepaliveTimer();
    const timeout = this.keepaliveTimeoutMs * 1.1;
    this.keepaliveTimer = setTimeout(() => {
      this.log("Keepalive timeout, reconnecting...");
      this.ws?.close(4e3, "Keepalive timeout");
    }, timeout);
  }
  clearKeepaliveTimer() {
    if (this.keepaliveTimer) {
      clearTimeout(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Reconnection
  // ─────────────────────────────────────────────────────────────────────────
  scheduleReconnect() {
    this.clearReconnectTimer();
    const delay = Math.min(
      RECONNECT_DELAY_MS2 * Math.pow(2, this.reconnectCount),
      MAX_RECONNECT_DELAY_MS2
    );
    this.reconnectCount++;
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectCount})`);
    this.onReconnecting?.(this.reconnectCount);
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
        await this.resubscribeAll();
      } catch {
      }
    }, delay);
  }
  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Subscriptions
  // ─────────────────────────────────────────────────────────────────────────
  async subscribe(type, version, condition) {
    if (this.subscriptions.size >= MAX_SUBSCRIPTIONS_PER_CONNECTION) {
      throw new Error(`Max subscriptions (${MAX_SUBSCRIPTIONS_PER_CONNECTION}) reached`);
    }
    await this.connect();
    if (!this.createSubscription) {
      throw new Error("No subscription handler configured");
    }
    return this.createSubscription(this.sessionId, type, version, condition);
  }
  async processPendingSubscriptions() {
    const pending = [...this.pendingSubscriptions];
    this.pendingSubscriptions = [];
    for (const item of pending) {
      try {
        const sub = await this.subscribe(item.type, item.version, item.condition);
        item.resolve(sub);
      } catch (err) {
        item.reject(err);
      }
    }
  }
  async resubscribeAll() {
    if (!this.createSubscription)
      return;
    const oldSubs = [...this.subscriptions.values()];
    this.subscriptions.clear();
    for (const sub of oldSubs) {
      try {
        await this.createSubscription(
          this.sessionId,
          sub.type,
          sub.version,
          sub.condition
        );
      } catch (err) {
        this.log(`Failed to resubscribe ${sub.type}: ${err}`);
      }
    }
  }
  registerSubscription(sub) {
    this.subscriptions.set(sub.id, sub);
  }
  unregisterSubscription(id) {
    this.subscriptions.delete(id);
  }
  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────
  get connected() {
    return this.isConnected;
  }
  get session() {
    return this.sessionId;
  }
  get subscriptionCount() {
    return this.subscriptions.size;
  }
  getConnectionInfo() {
    if (!this.isConnected)
      return null;
    return {
      sessionId: this.sessionId,
      connectedAt: /* @__PURE__ */ new Date(),
      subscriptionCount: this.subscriptions.size
    };
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────
  log(msg) {
    if (this.options.debug) {
      console.log(`[ComfyJS EventSub] ${msg}`);
    }
  }
};
var EventSubTypes = {
  // Channel Points
  CHANNEL_POINTS_REDEMPTION: "channel.channel_points_custom_reward_redemption.add",
  CHANNEL_POINTS_REDEMPTION_UPDATE: "channel.channel_points_custom_reward_redemption.update",
  // Polls
  POLL_BEGIN: "channel.poll.begin",
  POLL_PROGRESS: "channel.poll.progress",
  POLL_END: "channel.poll.end",
  // Predictions
  PREDICTION_BEGIN: "channel.prediction.begin",
  PREDICTION_PROGRESS: "channel.prediction.progress",
  PREDICTION_LOCK: "channel.prediction.lock",
  PREDICTION_END: "channel.prediction.end",
  // Hype Train
  HYPE_TRAIN_BEGIN: "channel.hype_train.begin",
  HYPE_TRAIN_PROGRESS: "channel.hype_train.progress",
  HYPE_TRAIN_END: "channel.hype_train.end",
  // Subscriptions
  SUBSCRIBE: "channel.subscribe",
  SUBSCRIPTION_END: "channel.subscription.end",
  SUBSCRIPTION_GIFT: "channel.subscription.gift",
  SUBSCRIPTION_MESSAGE: "channel.subscription.message",
  // Cheers
  CHEER: "channel.cheer",
  // Raids
  RAID: "channel.raid",
  // Follows
  FOLLOW: "channel.follow",
  // Stream
  STREAM_ONLINE: "stream.online",
  STREAM_OFFLINE: "stream.offline",
  // Moderation
  BAN: "channel.ban",
  UNBAN: "channel.unban",
  MODERATOR_ADD: "channel.moderator.add",
  MODERATOR_REMOVE: "channel.moderator.remove",
  // Goals
  GOAL_BEGIN: "channel.goal.begin",
  GOAL_PROGRESS: "channel.goal.progress",
  GOAL_END: "channel.goal.end",
  // Shoutouts
  SHOUTOUT_CREATE: "channel.shoutout.create",
  SHOUTOUT_RECEIVE: "channel.shoutout.receive"
};

// src/p2p.ts
var STORAGE_PREFIX = "comfyjs_";
var LEADER_TIMEOUT_MS = 1e4;
var HEARTBEAT_INTERVAL_MS = 3e3;
var POLL_INTERVAL_MS = 500;
var ELECTION_DELAY_MAX_MS = 500;
var P2PCoordinator = class {
  constructor(options) {
    this.role = "standalone";
    // WebRTC connections
    this.peerConnections = /* @__PURE__ */ new Map();
    this.dataChannels = /* @__PURE__ */ new Map();
    // Leader tracking
    this.currentLeaderId = null;
    // Timers
    this.heartbeatTimer = null;
    this.pollTimer = null;
    // Track which peers we've started connecting to
    this.connectingPeers = /* @__PURE__ */ new Set();
    // Event handlers
    this.onEvent = null;
    this.onRoleChange = null;
    this.onFollowerConnected = null;
    this.onFollowerDisconnected = null;
    this.instanceId = this.generateInstanceId();
    this.options = options;
    this.channel = options.channel.toLowerCase().replace("#", "");
    this.log(`Instance ID: ${this.instanceId}, Channel: ${this.channel}`);
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Storage Key Helpers (channel-namespaced)
  // ─────────────────────────────────────────────────────────────────────────
  get leaderKey() {
    return `${STORAGE_PREFIX}leader_${this.channel}`;
  }
  get peerPrefix() {
    return `${STORAGE_PREFIX}peer_${this.channel}_`;
  }
  peerKey(peerId) {
    return `${this.peerPrefix}${peerId}`;
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Initialization
  // ─────────────────────────────────────────────────────────────────────────
  async initialize() {
    if (!this.isLocalStorageAvailable()) {
      this.log("localStorage not available, running standalone");
      this.role = "standalone";
      return this.role;
    }
    this.cleanupStaleEntries();
    const leader = this.getLeader();
    if (leader && leader.channel === this.channel && this.isLeaderAlive(leader)) {
      this.log(`Found existing leader: ${leader.id}`);
      await this.becomeFollower(leader);
    } else {
      this.log("No active leader found, attempting to become leader");
      await this.tryBecomeLeader();
    }
    this.startPolling();
    return this.role;
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Leader Election
  // ─────────────────────────────────────────────────────────────────────────
  async tryBecomeLeader() {
    await this.delay(Math.random() * ELECTION_DELAY_MAX_MS);
    const leader = this.getLeader();
    if (leader && leader.channel === this.channel && this.isLeaderAlive(leader)) {
      this.log(`Another instance became leader during election: ${leader.id}`);
      await this.becomeFollower(leader);
      return;
    }
    this.role = "leader";
    this.currentLeaderId = this.instanceId;
    const leaderEntry = {
      id: this.instanceId,
      channel: this.channel,
      timestamp: Date.now()
    };
    this.setStorageItem(this.leaderKey, leaderEntry);
    this.log("Became leader");
    this.startHeartbeat();
    this.onRoleChange?.("leader");
  }
  async becomeFollower(leader) {
    this.role = "follower";
    this.currentLeaderId = leader.id;
    this.log(`Becoming follower of ${leader.id}`);
    const peerEntry = {
      id: this.instanceId,
      leaderId: leader.id,
      timestamp: Date.now(),
      leaderIce: [],
      followerIce: [],
      connected: false
    };
    this.setStorageItem(this.peerKey(this.instanceId), peerEntry);
    this.onRoleChange?.("follower");
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Polling
  // ─────────────────────────────────────────────────────────────────────────
  startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(() => {
      try {
        if (this.role === "leader") {
          this.leaderPoll();
        } else if (this.role === "follower") {
          this.followerPoll();
        }
      } catch (e) {
        this.log(`Poll error: ${e}`);
      }
    }, POLL_INTERVAL_MS);
  }
  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
  leaderPoll() {
    const peers = this.getAllPeerEntries();
    for (const peer of peers) {
      if (peer.leaderId !== this.instanceId)
        continue;
      if (peer.connected)
        continue;
      if (this.connectingPeers.has(peer.id))
        continue;
      this.log(`New peer found: ${peer.id}`);
      this.connectingPeers.add(peer.id);
      this.initiateConnectionToPeer(peer.id);
    }
    for (const peer of peers) {
      if (peer.leaderId !== this.instanceId)
        continue;
      if (!peer.answer)
        continue;
      const pc = this.peerConnections.get(peer.id);
      if (pc && pc.remoteDescription === null) {
        this.handlePeerAnswer(peer);
      }
    }
    for (const peer of peers) {
      if (peer.leaderId !== this.instanceId)
        continue;
      this.processFollowerIceCandidates(peer);
    }
  }
  followerPoll() {
    const leader = this.getLeader();
    if (!leader || leader.channel !== this.channel || !this.isLeaderAlive(leader)) {
      this.log("Leader is gone, attempting to become new leader");
      this.promoteToLeader();
      return;
    }
    if (leader.id !== this.currentLeaderId) {
      this.log(`Leader changed from ${this.currentLeaderId} to ${leader.id}`);
      this.closeAllConnections();
      this.becomeFollower(leader);
      return;
    }
    const myEntry = this.getStorageItem(this.peerKey(this.instanceId));
    if (myEntry && myEntry.offer && !myEntry.answer) {
      this.handleLeaderOffer(myEntry);
    }
    if (myEntry) {
      this.processLeaderIceCandidates(myEntry);
    }
  }
  // ─────────────────────────────────────────────────────────────────────────
  // WebRTC - Leader Side
  // ─────────────────────────────────────────────────────────────────────────
  async initiateConnectionToPeer(peerId) {
    this.log(`Initiating connection to peer: ${peerId}`);
    const pc = this.createPeerConnection(peerId);
    const dc = pc.createDataChannel("comfyjs-events", { ordered: true });
    this.setupDataChannel(dc, peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const peerEntry = this.getStorageItem(this.peerKey(peerId));
    if (peerEntry) {
      peerEntry.offer = JSON.stringify(offer);
      peerEntry.timestamp = Date.now();
      this.setStorageItem(this.peerKey(peerId), peerEntry);
      this.log(`Wrote offer to ${peerId}'s entry`);
    }
  }
  async handlePeerAnswer(peer) {
    const pc = this.peerConnections.get(peer.id);
    if (!pc || !peer.answer)
      return;
    try {
      const answer = JSON.parse(peer.answer);
      await pc.setRemoteDescription(answer);
      this.log(`Set remote description from ${peer.id}`);
      peer.connected = true;
      this.setStorageItem(this.peerKey(peer.id), peer);
    } catch (e) {
      this.log(`Error handling answer from ${peer.id}: ${e}`);
    }
  }
  processFollowerIceCandidates(peer) {
    const pc = this.peerConnections.get(peer.id);
    if (!pc || pc.remoteDescription === null)
      return;
    for (const candidateJson of peer.followerIce) {
      try {
        const candidate = JSON.parse(candidateJson);
        pc.addIceCandidate(candidate).catch(() => {
        });
      } catch {
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────
  // WebRTC - Follower Side
  // ─────────────────────────────────────────────────────────────────────────
  async handleLeaderOffer(myEntry) {
    if (!myEntry.offer || !this.currentLeaderId)
      return;
    this.log("Received offer from leader");
    const pc = this.createPeerConnection(this.currentLeaderId);
    try {
      const offer = JSON.parse(myEntry.offer);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      myEntry.answer = JSON.stringify(answer);
      myEntry.timestamp = Date.now();
      this.setStorageItem(this.peerKey(this.instanceId), myEntry);
      this.log("Wrote answer to localStorage");
    } catch (e) {
      this.log(`Error handling offer: ${e}`);
    }
  }
  processLeaderIceCandidates(myEntry) {
    if (!this.currentLeaderId)
      return;
    const pc = this.peerConnections.get(this.currentLeaderId);
    if (!pc || pc.remoteDescription === null)
      return;
    for (const candidateJson of myEntry.leaderIce) {
      try {
        const candidate = JSON.parse(candidateJson);
        pc.addIceCandidate(candidate).catch(() => {
        });
      } catch {
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────
  // WebRTC Common
  // ─────────────────────────────────────────────────────────────────────────
  createPeerConnection(peerId) {
    const existing = this.peerConnections.get(peerId);
    if (existing) {
      existing.close();
    }
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    });
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.addIceCandidateToStorage(peerId, event.candidate.toJSON());
      }
    };
    pc.ondatachannel = (event) => {
      this.log(`Received data channel from ${peerId}`);
      this.setupDataChannel(event.channel, peerId);
    };
    pc.onconnectionstatechange = () => {
      this.log(`Connection to ${peerId}: ${pc.connectionState}`);
      if (pc.connectionState === "connected") {
        this.log(`Successfully connected to ${peerId}`);
        if (this.role === "leader") {
          this.onFollowerConnected?.(peerId);
        }
      }
      if (pc.connectionState === "failed" || pc.connectionState === "closed" || pc.connectionState === "disconnected") {
        this.cleanupPeer(peerId);
        if (this.role === "follower" && peerId === this.currentLeaderId) {
          this.log("Lost connection to leader");
          this.promoteToLeader();
        }
      }
    };
    this.peerConnections.set(peerId, pc);
    return pc;
  }
  addIceCandidateToStorage(peerId, candidate) {
    const candidateJson = JSON.stringify(candidate);
    if (this.role === "leader") {
      const peerEntry = this.getStorageItem(this.peerKey(peerId));
      if (peerEntry) {
        if (!peerEntry.leaderIce.includes(candidateJson)) {
          peerEntry.leaderIce.push(candidateJson);
          this.setStorageItem(this.peerKey(peerId), peerEntry);
        }
      }
    } else {
      const myEntry = this.getStorageItem(this.peerKey(this.instanceId));
      if (myEntry) {
        if (!myEntry.followerIce.includes(candidateJson)) {
          myEntry.followerIce.push(candidateJson);
          this.setStorageItem(this.peerKey(this.instanceId), myEntry);
        }
      }
    }
  }
  setupDataChannel(dc, peerId) {
    dc.onopen = () => {
      this.log(`DataChannel to ${peerId} opened`);
      this.dataChannels.set(peerId, dc);
    };
    dc.onclose = () => {
      this.log(`DataChannel to ${peerId} closed`);
      this.dataChannels.delete(peerId);
    };
    dc.onerror = (e) => {
      this.log(`DataChannel error with ${peerId}: ${e}`);
    };
    dc.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "event") {
          this.onEvent?.(data.event);
        }
      } catch {
        this.log("Failed to parse DataChannel message");
      }
    };
  }
  cleanupPeer(peerId) {
    const dc = this.dataChannels.get(peerId);
    if (dc) {
      dc.close();
      this.dataChannels.delete(peerId);
    }
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    this.connectingPeers.delete(peerId);
    if (this.role === "leader") {
      this.onFollowerDisconnected?.(peerId);
    }
  }
  closeAllConnections() {
    for (const [id] of this.peerConnections) {
      this.cleanupPeer(id);
    }
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Leader Promotion
  // ─────────────────────────────────────────────────────────────────────────
  async promoteToLeader() {
    this.log("Promoting to leader");
    this.closeAllConnections();
    this.removeStorageItem(this.peerKey(this.instanceId));
    this.connectingPeers.clear();
    this.currentLeaderId = null;
    await this.tryBecomeLeader();
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Heartbeat
  // ─────────────────────────────────────────────────────────────────────────
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.role === "leader") {
        const leader = this.getLeader();
        if (leader && leader.id === this.instanceId) {
          leader.timestamp = Date.now();
          this.setStorageItem(this.leaderKey, leader);
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  isLeaderAlive(leader) {
    return Date.now() - leader.timestamp < LEADER_TIMEOUT_MS;
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Event Broadcasting (Leader only)
  // ─────────────────────────────────────────────────────────────────────────
  broadcastEvent(event) {
    if (this.role !== "leader")
      return;
    const message = JSON.stringify({ type: "event", event });
    for (const [peerId, dc] of this.dataChannels) {
      if (dc.readyState === "open") {
        try {
          dc.send(message);
        } catch (e) {
          this.log(`Failed to send to ${peerId}: ${e}`);
        }
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────
  // localStorage Helpers
  // ─────────────────────────────────────────────────────────────────────────
  isLocalStorageAvailable() {
    try {
      const test = "__comfyjs_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
  getStorageItem(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }
  setStorageItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      this.log(`Failed to write to localStorage: ${e}`);
    }
  }
  removeStorageItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {
    }
  }
  getLeader() {
    return this.getStorageItem(this.leaderKey);
  }
  getAllPeerEntries() {
    const peers = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(this.peerPrefix))
        continue;
      const peer = this.getStorageItem(key);
      if (peer) {
        peers.push(peer);
      }
    }
    return peers;
  }
  cleanupStaleEntries() {
    const now = Date.now();
    const leader = this.getLeader();
    if (leader && !this.isLeaderAlive(leader)) {
      this.log("Cleaning up dead leader entry");
      this.removeStorageItem(this.leaderKey);
    }
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key?.startsWith(this.peerPrefix))
        continue;
      const peer = this.getStorageItem(key);
      if (peer && now - peer.timestamp > LEADER_TIMEOUT_MS * 3) {
        this.log(`Cleaning up stale peer: ${peer.id}`);
        this.removeStorageItem(key);
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────
  get currentRole() {
    return this.role;
  }
  get isLeader() {
    return this.role === "leader";
  }
  get followerCount() {
    return this.dataChannels.size;
  }
  get id() {
    return this.instanceId;
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────────────────
  destroy() {
    this.log("Destroying P2P coordinator");
    this.stopHeartbeat();
    this.stopPolling();
    this.closeAllConnections();
    if (this.role === "leader") {
      this.removeStorageItem(this.leaderKey);
    }
    this.removeStorageItem(this.peerKey(this.instanceId));
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────
  generateInstanceId() {
    return "cjs_" + Math.random().toString(36).substring(2, 8) + "_" + Date.now().toString(36);
  }
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  log(msg) {
    if (this.options.debug) {
      console.log(`[P2P ${this.instanceId.slice(-8)}] ${msg}`);
    }
  }
};

// src/api.ts
var API_BASE = "https://api.twitch.tv/helix";
var TwitchAPI = class {
  constructor(options) {
    this.clientId = options.clientId;
    this.accessToken = options.accessToken.replace("oauth:", "");
    this.debug = options.debug ?? false;
  }
  // ─────────────────────────────────────────────────────────────────────────
  // HTTP Methods
  // ─────────────────────────────────────────────────────────────────────────
  async request(method, endpoint, body) {
    const url = `${API_BASE}${endpoint}`;
    this.log(`${method} ${endpoint}`);
    const response = await fetch(url, {
      method,
      headers: {
        "Client-ID": this.clientId,
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : void 0
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twitch API error ${response.status}: ${error}`);
    }
    if (response.status === 204) {
      return {};
    }
    return response.json();
  }
  async get(endpoint) {
    return this.request("GET", endpoint);
  }
  async post(endpoint, body) {
    return this.request("POST", endpoint, body);
  }
  async delete(endpoint) {
    await this.request("DELETE", endpoint);
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Users
  // ─────────────────────────────────────────────────────────────────────────
  async getUsers(logins, ids) {
    const params = new URLSearchParams();
    if (logins) {
      for (const login of logins) {
        params.append("login", login);
      }
    }
    if (ids) {
      for (const id of ids) {
        params.append("id", id);
      }
    }
    const query = params.toString();
    const response = await this.get(`/users${query ? "?" + query : ""}`);
    return response.data.map((u) => ({
      id: u.id,
      login: u.login,
      displayName: u.display_name,
      type: u.type,
      broadcasterType: u.broadcaster_type,
      description: u.description,
      profileImageUrl: u.profile_image_url,
      offlineImageUrl: u.offline_image_url,
      createdAt: u.created_at
    }));
  }
  async getCurrentUser() {
    const users = await this.getUsers();
    return users[0] || null;
  }
  async getUserByLogin(login) {
    const users = await this.getUsers([login]);
    return users[0] || null;
  }
  async getUserById(id) {
    const users = await this.getUsers(void 0, [id]);
    return users[0] || null;
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Channels
  // ─────────────────────────────────────────────────────────────────────────
  async getChannelInfo(broadcasterId) {
    const response = await this.get(`/channels?broadcaster_id=${broadcasterId}`);
    const c = response.data[0];
    if (!c)
      return null;
    return {
      broadcasterId: c.broadcaster_id,
      broadcasterLogin: c.broadcaster_login,
      broadcasterName: c.broadcaster_name,
      gameId: c.game_id,
      gameName: c.game_name,
      title: c.title,
      delay: c.delay,
      tags: c.tags,
      language: c.broadcaster_language
    };
  }
  // ─────────────────────────────────────────────────────────────────────────
  // EventSub Subscriptions
  // ─────────────────────────────────────────────────────────────────────────
  async createEventSubSubscription(sessionId, type, version, condition) {
    const response = await this.post("/eventsub/subscriptions", {
      type,
      version,
      condition,
      transport: {
        method: "websocket",
        session_id: sessionId
      }
    });
    const sub = response.data[0];
    if (!sub) {
      throw new Error("Failed to create EventSub subscription");
    }
    this.log(`Created EventSub subscription: ${type}`);
    return sub;
  }
  async deleteEventSubSubscription(id) {
    await this.delete(`/eventsub/subscriptions?id=${id}`);
    this.log(`Deleted EventSub subscription: ${id}`);
  }
  async getEventSubSubscriptions() {
    const response = await this.get("/eventsub/subscriptions");
    return {
      subscriptions: response.data,
      total: response.total,
      totalCost: response.total_cost,
      maxTotalCost: response.max_total_cost
    };
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Chat
  // ─────────────────────────────────────────────────────────────────────────
  async getChatters(broadcasterId, moderatorId) {
    const response = await this.get(`/chat/chatters?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`);
    return {
      users: response.data.map((u) => ({
        userId: u.user_id,
        userLogin: u.user_login,
        userName: u.user_name
      })),
      total: response.total || response.data.length
    };
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Moderation
  // ─────────────────────────────────────────────────────────────────────────
  async banUser(broadcasterId, moderatorId, userId, reason, duration) {
    await this.post("/moderation/bans", {
      broadcaster_id: broadcasterId,
      moderator_id: moderatorId,
      data: {
        user_id: userId,
        reason: reason || "",
        duration
        // undefined = permanent ban
      }
    });
  }
  async unbanUser(broadcasterId, moderatorId, userId) {
    await this.delete(
      `/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}&user_id=${userId}`
    );
  }
  async deleteMessage(broadcasterId, moderatorId, messageId) {
    await this.delete(
      `/moderation/chat?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}&message_id=${messageId}`
    );
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Token Validation
  // ─────────────────────────────────────────────────────────────────────────
  async validateToken() {
    try {
      const response = await fetch("https://id.twitch.tv/oauth2/validate", {
        headers: {
          "Authorization": `OAuth ${this.accessToken}`
        }
      });
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return {
        clientId: data.client_id,
        login: data.login,
        userId: data.user_id,
        scopes: data.scopes,
        expiresIn: data.expires_in
      };
    } catch {
      return null;
    }
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────
  setToken(accessToken) {
    this.accessToken = accessToken.replace("oauth:", "");
  }
  log(msg) {
    if (this.debug) {
      console.log(`[ComfyJS API] ${msg}`);
    }
  }
};

// src/index.ts
var VERSION = "2.0.0";
var timestamps = {
  global: {},
  users: {}
};
function getTimePeriod(command, userId) {
  if (!command) {
    return { any: null, user: null };
  }
  const now = /* @__PURE__ */ new Date();
  const result = { any: 0, user: null };
  if (timestamps.global[command]) {
    result.any = now.getTime() - timestamps.global[command].getTime();
  }
  timestamps.global[command] = now;
  if (userId) {
    if (!timestamps.users[userId]) {
      timestamps.users[userId] = {};
    }
    if (timestamps.users[userId][command]) {
      result.user = now.getTime() - timestamps.users[userId][command].getTime();
    } else {
      result.user = 0;
    }
    timestamps.users[userId][command] = now;
  }
  return result;
}
var SCOPE_TO_EVENTSUB = {
  "moderator:read:followers": [["channel.follow", "2"]],
  "channel:read:redemptions": [
    ["channel.channel_points_automatic_reward_redemption.add", "1"],
    ["channel.channel_points_custom_reward_redemption.add", "1"]
  ],
  "channel:manage:redemptions": [
    ["channel.channel_points_automatic_reward_redemption.add", "1"],
    ["channel.channel_points_custom_reward_redemption.add", "1"]
  ],
  "channel:read:hype_train": [
    ["channel.hype_train.begin", "1"],
    ["channel.hype_train.progress", "1"],
    ["channel.hype_train.end", "1"]
  ],
  "moderator:read:shoutouts": [["channel.shoutout.create", "1"]],
  "user:read:whispers": [["user.whisper.message", "1"]],
  "channel:read:polls": [
    ["channel.poll.begin", "1"],
    ["channel.poll.progress", "1"],
    ["channel.poll.end", "1"]
  ],
  "channel:read:predictions": [
    ["channel.prediction.begin", "1"],
    ["channel.prediction.progress", "1"],
    ["channel.prediction.lock", "1"],
    ["channel.prediction.end", "1"]
  ]
};
var CONDITION_FIELDS = {
  "channel.channel_points_custom_reward_redemption.add": ["broadcaster_user_id"],
  "channel.channel_points_automatic_reward_redemption.add": ["broadcaster_user_id"],
  "channel.follow": ["broadcaster_user_id", "moderator_user_id"],
  "channel.hype_train.begin": ["broadcaster_user_id"],
  "channel.hype_train.progress": ["broadcaster_user_id"],
  "channel.hype_train.end": ["broadcaster_user_id"],
  "channel.shoutout.create": ["broadcaster_user_id", "moderator_user_id"],
  "user.whisper.message": ["user_id"],
  "channel.poll.begin": ["broadcaster_user_id"],
  "channel.poll.progress": ["broadcaster_user_id"],
  "channel.poll.end": ["broadcaster_user_id"],
  "channel.prediction.begin": ["broadcaster_user_id"],
  "channel.prediction.progress": ["broadcaster_user_id"],
  "channel.prediction.lock": ["broadcaster_user_id"],
  "channel.prediction.end": ["broadcaster_user_id"]
};
var ComfyJSImpl = class {
  constructor() {
    // State
    this.isDebug = false;
    this.useEventSub = true;
    this.chatModes = {};
    // Internal
    this.irc = null;
    this.eventSub = null;
    this.p2p = null;
    this.api = null;
    this.mainChannel = "";
    this.password = "";
    this.clientId = "";
    this.userId = "";
    this.channelId = "";
    this.scopes = [];
    this.isFirstConnect = true;
    this.boundBeforeUnload = null;
    // ─────────────────────────────────────────────────────────────────────────
    // Event Handlers (with default implementations)
    // ─────────────────────────────────────────────────────────────────────────
    this.onError = (error) => {
      console.error("Error:", error);
    };
    this.onCommand = () => {
      if (this.isDebug)
        console.log("onCommand default handler");
    };
    this.onChat = () => {
      if (this.isDebug)
        console.log("onChat default handler");
    };
    this.onWhisper = () => {
      if (this.isDebug)
        console.log("onWhisper default handler");
    };
    this.onMessageDeleted = () => {
      if (this.isDebug)
        console.log("onMessageDeleted default handler");
    };
    this.onBan = () => {
      if (this.isDebug)
        console.log("onBan default handler");
    };
    this.onTimeout = () => {
      if (this.isDebug)
        console.log("onTimeout default handler");
    };
    this.onJoin = () => {
      if (this.isDebug)
        console.log("onJoin default handler");
    };
    this.onPart = () => {
      if (this.isDebug)
        console.log("onPart default handler");
    };
    this.onHosted = () => {
      if (this.isDebug)
        console.log("onHosted default handler");
    };
    this.onRaid = () => {
      if (this.isDebug)
        console.log("onRaid default handler");
    };
    this.onSub = () => {
      if (this.isDebug)
        console.log("onSub default handler");
    };
    this.onResub = () => {
      if (this.isDebug)
        console.log("onResub default handler");
    };
    this.onSubGift = () => {
      if (this.isDebug)
        console.log("onSubGift default handler");
    };
    this.onSubMysteryGift = () => {
      if (this.isDebug)
        console.log("onSubMysteryGift default handler");
    };
    this.onGiftSubContinue = () => {
      if (this.isDebug)
        console.log("onGiftSubContinue default handler");
    };
    this.onCheer = () => {
      if (this.isDebug)
        console.log("onCheer default handler");
    };
    this.onChatMode = () => {
      if (this.isDebug)
        console.log("onChatMode default handler");
    };
    this.onReward = () => {
      if (this.isDebug)
        console.log("onReward default handler");
    };
    this.onShoutout = () => {
      if (this.isDebug)
        console.log("onShoutout default handler");
    };
    this.onHypeTrain = () => {
      if (this.isDebug)
        console.log("onHypeTrain default handler");
    };
    this.onPoll = () => {
      if (this.isDebug)
        console.log("onPoll default handler");
    };
    this.onPrediction = () => {
      if (this.isDebug)
        console.log("onPrediction default handler");
    };
    this.onRawMessage = () => {
    };
    this.onConnected = () => {
    };
    this.onReconnect = () => {
    };
    /**
     * EventSub lifecycle status callback.
     * Fired for: cleanup, subscription success/failure, P2P role, connection status.
     * Games/diagnostics can hook this to track what's happening with channel points.
     */
    this.onEventSubStatus = () => {
    };
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Public Methods
  // ─────────────────────────────────────────────────────────────────────────
  version() {
    return VERSION;
  }
  async Init(username, password, channels, isDebug) {
    let channelList;
    if (!channels) {
      channelList = [username];
    } else if (typeof channels === "string") {
      channelList = [channels];
    } else if (Array.isArray(channels)) {
      channelList = channels;
    } else {
      throw new Error("Channels is not an array");
    }
    this.isDebug = isDebug ?? false;
    this.mainChannel = channelList[0].toLowerCase().replace("#", "");
    this.password = password?.replace("oauth:", "") ?? "";
    let authenticatedLogin = "";
    if (this.password) {
      const validation = await this.validateToken(this.password);
      if (!validation) {
        throw new Error("Invalid OAuth token");
      }
      this.clientId = validation.clientId;
      this.userId = validation.userId;
      this.scopes = validation.scopes;
      authenticatedLogin = validation.login;
      this.api = new TwitchAPI({
        clientId: this.clientId,
        accessToken: this.password,
        debug: this.isDebug
      });
      let lookupError = null;
      try {
        const user = await this.api.getUserByLogin(this.mainChannel);
        if (user) {
          this.channelId = user.id;
        } else {
          lookupError = "not-found";
          console.warn(`[ComfyJS] Channel '${this.mainChannel}' not found on Twitch`);
        }
      } catch (err) {
        lookupError = `error: ${err instanceof Error ? err.message : String(err)}`;
        console.error(`[ComfyJS] Failed to look up channel '${this.mainChannel}':`, err);
      }
      if (!this.channelId && authenticatedLogin && authenticatedLogin.toLowerCase() === this.mainChannel) {
        this.channelId = this.userId;
        this.log(`Using token userId as channelId for ${this.mainChannel}`);
      }
      if (!this.channelId) {
        const nameMatch = authenticatedLogin ? authenticatedLogin.toLowerCase() === this.mainChannel : false;
        this.emitEventSubStatus(
          "eventsub-no-channel-id",
          `No channel ID available for '${this.mainChannel}'`,
          {
            mainChannel: this.mainChannel,
            authenticatedLogin: authenticatedLogin || "(none)",
            nameMatch,
            lookupError: lookupError || "unknown"
          }
        );
      }
    }
    this.irc = new IRCClient({ debug: this.isDebug });
    this.setupIRCHandlers();
    const ircUsername = this.password ? authenticatedLogin : `justinfan${Math.floor(Math.random() * 99999)}`;
    const ircPassword = this.password || "SCHMOOPIIE";
    await this.irc.connect(ircPassword, ircUsername);
    for (const channel of channelList) {
      await this.irc.join(channel);
    }
    this.initializeP2P().then(async () => {
      if (!this.password || !this.useEventSub) {
        this.emitEventSubStatus("eventsub-skipped", this.password ? "useEventSub=false" : "no-auth");
        return;
      }
      const role = this.p2p?.currentRole || "unknown";
      this.emitEventSubStatus("p2p-role", role);
      if (this.p2p?.isLeader || this.p2p?.currentRole === "standalone") {
        await this.initializeEventSub();
      } else if (this.p2p?.currentRole === "follower") {
        this.emitEventSubStatus("p2p-follower-waiting", "waiting 15s for DataChannel from leader");
        setTimeout(async () => {
          if (this.p2p && this.p2p.followerCount === 0) {
            console.warn("P2P DataChannel failed to connect. Falling back to EventSub directly.");
            this.emitEventSubStatus("p2p-fallback", "DataChannel not connected after 15s, initializing EventSub directly");
            await this.initializeEventSub();
          } else {
            this.emitEventSubStatus("p2p-connected", `DataChannel active, ${this.p2p?.followerCount || 0} channels`);
          }
        }, 15e3);
      }
    }).catch(async (e) => {
      console.error("P2P/EventSub initialization failed:", e);
      this.emitEventSubStatus("p2p-error", String(e));
      if (this.password && this.useEventSub) {
        console.warn("Attempting EventSub directly due to P2P failure.");
        this.emitEventSubStatus("eventsub-fallback", "P2P failed, attempting direct EventSub");
        try {
          await this.initializeEventSub();
        } catch (subErr) {
          console.error("Fallback EventSub initialization also failed:", subErr);
          this.emitEventSubStatus("eventsub-fallback-failed", String(subErr));
        }
      }
    });
  }
  Disconnect() {
    if (typeof window !== "undefined" && this.boundBeforeUnload) {
      window.removeEventListener("beforeunload", this.boundBeforeUnload);
      this.boundBeforeUnload = null;
    }
    this.p2p?.destroy();
    this.eventSub?.disconnect();
    this.irc?.disconnect();
    this.p2p = null;
    this.eventSub = null;
    this.irc = null;
  }
  Say(message, channel) {
    if (!this.irc)
      return false;
    const targetChannel = channel ?? this.mainChannel;
    this.irc.say(targetChannel, message).catch(this.onError);
    const selfFlags = {
      broadcaster: false,
      mod: false,
      vip: false,
      subscriber: false,
      founder: false,
      highlighted: false,
      customReward: false
    };
    const selfExtra = {
      id: "",
      channel: targetChannel,
      roomId: "",
      messageType: "chat",
      messageEmotes: void 0,
      isEmoteOnly: false,
      userId: this.userId,
      username: this.irc.username,
      displayName: this.irc.username,
      userColor: "",
      userBadges: {},
      userState: {},
      customRewardId: void 0,
      flags: "",
      timestamp: String(Date.now())
    };
    this.onChat(this.irc.username, message, selfFlags, true, selfExtra);
    return true;
  }
  Reply(parentId, message, channel) {
    if (!this.irc)
      return false;
    const targetChannel = channel ?? this.mainChannel;
    this.irc.reply(targetChannel, parentId, message).catch(this.onError);
    return true;
  }
  Whisper(_message, _user) {
    console.warn("Whisper via IRC is deprecated. Use Twitch API instead.");
    return false;
  }
  Announce(message, channel, _color) {
    if (!this.irc)
      return false;
    const targetChannel = channel ?? this.mainChannel;
    this.irc.say(targetChannel, `/announce ${message}`).catch(this.onError);
    return true;
  }
  DeleteMessage(id, _channel) {
    if (!this.irc || !this.api)
      return false;
    this.api.deleteMessage(this.channelId, this.userId, id).catch(this.onError);
    return true;
  }
  GetClient() {
    return this.irc;
  }
  async GetChannelRewards(clientId, manageableOnly = false) {
    if (!this.password || !this.api)
      return [];
    try {
      const response = await fetch(
        `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${this.channelId}&only_manageable_rewards=${manageableOnly}`,
        {
          headers: {
            "Client-ID": clientId || this.clientId,
            "Authorization": `Bearer ${this.password}`
          }
        }
      );
      const data = await response.json();
      return data.data || [];
    } catch {
      return [];
    }
  }
  async CreateChannelReward(clientId, rewardInfo) {
    if (!this.password)
      throw new Error("Missing Channel Password");
    const response = await fetch(
      `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${this.channelId}`,
      {
        method: "POST",
        headers: {
          "Client-ID": clientId || this.clientId,
          "Authorization": `Bearer ${this.password}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(rewardInfo)
      }
    );
    const data = await response.json();
    return data.data[0];
  }
  async UpdateChannelReward(clientId, rewardId, rewardInfo) {
    if (!this.password)
      throw new Error("Missing Channel Password");
    const response = await fetch(
      `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${this.channelId}&id=${rewardId}`,
      {
        method: "PATCH",
        headers: {
          "Client-ID": clientId || this.clientId,
          "Authorization": `Bearer ${this.password}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(rewardInfo)
      }
    );
    const data = await response.json();
    return data.data[0];
  }
  async DeleteChannelReward(clientId, rewardId) {
    if (!this.password)
      throw new Error("Missing Channel Password");
    const response = await fetch(
      `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${this.channelId}&id=${rewardId}`,
      {
        method: "DELETE",
        headers: {
          "Client-ID": clientId || this.clientId,
          "Authorization": `Bearer ${this.password}`
        }
      }
    );
    return response.text();
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Private: Token Validation
  // ─────────────────────────────────────────────────────────────────────────
  async validateToken(token) {
    try {
      const response = await fetch("https://id.twitch.tv/oauth2/validate", {
        headers: { "Authorization": `OAuth ${token}` }
      });
      if (!response.ok)
        return null;
      const data = await response.json();
      return {
        clientId: data.client_id,
        userId: data.user_id,
        login: data.login,
        scopes: data.scopes
      };
    } catch {
      return null;
    }
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Private: IRC Handlers
  // ─────────────────────────────────────────────────────────────────────────
  setupIRCHandlers() {
    if (!this.irc)
      return;
    this.irc.onConnected = (isFirst) => {
      console.log("Connected to IRC");
      this.onConnected("irc-ws.chat.twitch.tv", 443, isFirst ? this.isFirstConnect : false);
      this.isFirstConnect = false;
    };
    this.irc.onDisconnected = (_reason) => {
    };
    this.irc.onReconnecting = (attempt) => {
      this.onReconnect(attempt);
    };
    this.irc.onMessage = (msg) => {
      this.handleIRCMessage(msg);
    };
  }
  handleIRCMessage(msg) {
    this.onRawMessage(msg.command, msg.raw, msg);
    try {
      switch (msg.command) {
        case "PRIVMSG":
          this.handlePrivmsg(msg);
          break;
        case "WHISPER":
          this.handleWhisper(msg);
          break;
        case "CLEARCHAT":
          this.handleClearChat(msg);
          break;
        case "CLEARMSG":
          this.handleClearMsg(msg);
          break;
        case "ROOMSTATE":
          this.handleRoomState(msg);
          break;
        case "USERNOTICE":
          this.handleUserNotice(msg);
          break;
        case "JOIN":
          this.handleJoin(msg);
          break;
        case "PART":
          this.handlePart(msg);
          break;
      }
    } catch (error) {
      this.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }
  handlePrivmsg(msg) {
    const channel = msg.channel?.replace("#", "") || "";
    const username = msg.tags["display-name"] || msg.prefix?.split("!")[0] || "";
    const message = msg.message || "";
    const self = false;
    const flags = parseUserFlags(msg.tags, channel);
    const extra = buildUserExtra(msg);
    const bits = parseInt(msg.tags["bits"] || "0", 10);
    if (bits > 0 && !self) {
      const cheerExtra = {
        ...extra,
        subscriber: msg.tags["subscriber"] || ""
      };
      this.onCheer(username, message, bits, flags, cheerExtra);
      return;
    }
    const parsed = parseCommand(message);
    if (!self && parsed) {
      const sinceLastCmd = getTimePeriod(parsed.command, msg.tags["user-id"] || null);
      const extraWithCmd = {
        ...extra,
        sinceLastCommand: { any: sinceLastCmd.any ?? 0, user: sinceLastCmd.user ?? 0 }
      };
      this.onCommand(username, parsed.command, parsed.args, flags, extraWithCmd);
    } else {
      const msgType = msg.tags["msg-id"] || "chat";
      if (msgType === "action" || !msg.tags["msg-id"]) {
        this.onChat(username, message, flags, self, extra);
      }
    }
  }
  handleWhisper(msg) {
    const username = msg.tags["display-name"] || msg.prefix?.split("!")[0] || "";
    const message = msg.message || "";
    const flags = parseUserFlags(msg.tags, "");
    const extra = buildUserExtra(msg);
    this.onWhisper(username, message, flags, false, extra);
  }
  handleClearChat(msg) {
    const targetUser = msg.message || "";
    const duration = msg.tags["ban-duration"];
    const targetUserId = msg.tags["target-user-id"] || "";
    const roomId = msg.tags["room-id"] || "";
    if (duration) {
      const timeoutExtra = {
        roomId,
        username: targetUser,
        timedOutUserId: targetUserId
      };
      this.onTimeout(targetUser, parseInt(duration, 10), timeoutExtra);
    } else if (targetUser) {
      const banExtra = {
        roomId,
        username: targetUser,
        bannedUserId: targetUserId
      };
      this.onBan(targetUser, banExtra);
    }
  }
  handleClearMsg(msg) {
    const messageId = msg.tags["target-msg-id"] || "";
    const extra = {
      id: messageId,
      roomId: msg.tags["room-id"] || "",
      username: msg.tags["login"] || "",
      message: msg.message || ""
    };
    this.onMessageDeleted(messageId, extra);
  }
  handleRoomState(msg) {
    const channel = msg.channel?.replace("#", "") || "";
    if (!this.chatModes[channel]) {
      this.chatModes[channel] = {};
    }
    const modes = this.chatModes[channel];
    const tags = msg.tags;
    if ("emote-only" in tags)
      modes.emoteOnly = tags["emote-only"] === "1";
    if ("followers-only" in tags)
      modes.followerOnly = parseInt(tags["followers-only"] || "-1", 10) >= 0;
    if ("subs-only" in tags)
      modes.subOnly = tags["subs-only"] === "1";
    if ("r9k" in tags)
      modes.r9kMode = tags["r9k"] === "1";
    if ("slow" in tags)
      modes.slowMode = parseInt(tags["slow"] || "0", 10) > 0;
    this.onChatMode(modes, channel);
  }
  handleUserNotice(msg) {
    const msgId = msg.tags["msg-id"];
    const username = msg.tags["display-name"] || msg.tags["login"] || "";
    const message = msg.message || "";
    const tags = msg.tags;
    const extra = buildUserExtra(msg);
    switch (msgId) {
      case "sub":
      case "resub": {
        const months = parseInt(tags["msg-param-cumulative-months"] || "1", 10);
        const streakMonths = parseInt(tags["msg-param-streak-months"] || "0", 10);
        const subTier = parseSubTier(tags["msg-param-sub-plan"] || "1000");
        if (msgId === "sub") {
          this.onSub(username, message, subTier, extra);
        } else {
          this.onResub(username, message, streakMonths, months, subTier, extra);
        }
        break;
      }
      case "subgift": {
        const recipient = tags["msg-param-recipient-display-name"] || tags["msg-param-recipient-user-name"] || "";
        const streakMonths = parseInt(tags["msg-param-months"] || "0", 10);
        const senderCount = parseInt(tags["msg-param-sender-count"] || "0", 10);
        const subTier = parseSubTier(tags["msg-param-sub-plan"] || "1000");
        const giftExtra = {
          ...extra,
          recipientDisplayName: tags["msg-param-recipient-display-name"],
          recipientUsername: tags["msg-param-recipient-user-name"],
          recipientId: tags["msg-param-recipient-id"]
        };
        this.onSubGift(username, streakMonths, recipient, senderCount, subTier, giftExtra);
        break;
      }
      case "submysterygift": {
        const numSubs = parseInt(tags["msg-param-mass-gift-count"] || "0", 10);
        const senderCount = parseInt(tags["msg-param-sender-count"] || "0", 10);
        const subTier = parseSubTier(tags["msg-param-sub-plan"] || "1000");
        const mysteryExtra = {
          ...extra,
          userMassGiftCount: numSubs
        };
        this.onSubMysteryGift(username, numSubs, senderCount, subTier, mysteryExtra);
        break;
      }
      case "giftpaidupgrade": {
        const sender = tags["msg-param-sender-name"] || tags["msg-param-sender-login"] || "";
        const upgradeExtra = {
          ...extra,
          gifterUsername: tags["msg-param-sender-login"],
          gifterDisplayName: tags["msg-param-sender-name"]
        };
        this.onGiftSubContinue(username, sender, upgradeExtra);
        break;
      }
      case "raid": {
        const viewers = parseInt(tags["msg-param-viewerCount"] || "0", 10);
        const raidExtra = {
          ...extra,
          viewerCount: viewers,
          raidingChannel: username,
          raidingChannelId: tags["user-id"] || ""
        };
        this.onRaid(username, viewers, raidExtra);
        break;
      }
    }
  }
  handleJoin(msg) {
    const channel = msg.channel?.replace("#", "") || "";
    const username = msg.prefix?.split("!")[0] || "";
    const self = username.toLowerCase() === this.irc?.username;
    this.onJoin(username, self, { channel, roomId: msg.tags["room-id"] || "" });
  }
  handlePart(msg) {
    const channel = msg.channel?.replace("#", "") || "";
    const username = msg.prefix?.split("!")[0] || "";
    const self = username.toLowerCase() === this.irc?.username;
    this.onPart(username, self, { channel, roomId: msg.tags["room-id"] || "" });
  }
  // ─────────────────────────────────────────────────────────────
  // Private: P2P Coordination
  // ─────────────────────────────────────────────────────────────
  async initializeP2P() {
    this.p2p = new P2PCoordinator({
      channel: this.mainChannel,
      debug: this.isDebug
    });
    const role = await this.p2p.initialize();
    this.log(`P2P role: ${role}`);
    this.p2p.onEvent = (event) => {
      this.handleEventSubNotification(event);
    };
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Private: EventSub
  // ─────────────────────────────────────────────────────────────────────────
  async initializeEventSub() {
    if (!this.api)
      return;
    await this.cleanupStaleSubscriptions();
    this.eventSub = new EventSubClient({ debug: this.isDebug });
    this.eventSub.createSubscription = async (sessionId, type, version, condition) => {
      const sub = await this.api.createEventSubSubscription(sessionId, type, version, condition);
      this.eventSub.registerSubscription(sub);
      return sub;
    };
    this.eventSub.onEvent = (event) => {
      this.handleEventSubNotification(event);
      this.p2p?.broadcastEvent(event);
    };
    await this.eventSub.connect();
    this.emitEventSubStatus("eventsub-connected", `session: ${this.eventSub.session}`);
    await this.subscribeToScopedEvents();
    if (typeof window !== "undefined") {
      this.boundBeforeUnload = () => {
        this.eventSub?.disconnect();
      };
      window.addEventListener("beforeunload", this.boundBeforeUnload);
    }
  }
  /**
   * Delete stale EventSub subscriptions (websocket_disconnected, etc.)
   * that linger after page refreshes and eat into the cost limit.
   */
  async cleanupStaleSubscriptions() {
    if (!this.api)
      return;
    try {
      const result = await this.api.getEventSubSubscriptions();
      const staleStatuses = ["websocket_disconnected", "notification_failures_exceeded", "authorization_revoked", "user_removed", "version_removed"];
      const staleSubs = result.subscriptions.filter(
        (s) => staleStatuses.includes(s.status)
      );
      this.emitEventSubStatus("stale-cleanup-start", `Found ${staleSubs.length} stale of ${result.subscriptions.length} total subs`, {
        staleCount: staleSubs.length,
        totalCount: result.subscriptions.length,
        totalCost: result.totalCost,
        maxTotalCost: result.maxTotalCost
      });
      if (staleSubs.length > 0) {
        this.log(`Cleaning up ${staleSubs.length} stale EventSub subscriptions (total cost: ${result.totalCost}/${result.maxTotalCost})`);
        console.log(`[ComfyJS] Cleaning up ${staleSubs.length} stale EventSub subscriptions`);
        let deletedCount = 0;
        for (const sub of staleSubs) {
          try {
            await this.api.deleteEventSubSubscription(sub.id);
            deletedCount++;
            this.log(`Deleted stale sub: ${sub.type} (${sub.status})`);
          } catch (err) {
            this.log(`Failed to delete stale sub ${sub.id}: ${err}`);
            this.emitEventSubStatus("stale-cleanup-error", `Failed to delete ${sub.type}: ${String(err)}`, { subId: sub.id, type: sub.type });
          }
        }
        this.emitEventSubStatus("stale-cleanup-done", `Deleted ${deletedCount}/${staleSubs.length} stale subs`, { deletedCount, staleCount: staleSubs.length });
      } else {
        this.log(`No stale subscriptions found (total cost: ${result.totalCost}/${result.maxTotalCost})`);
      }
    } catch (err) {
      console.warn("[ComfyJS] Failed to clean up stale EventSub subscriptions:", err);
      this.emitEventSubStatus("stale-cleanup-error", `Cleanup failed: ${String(err)}`, { error: String(err) });
    }
  }
  async subscribeToScopedEvents() {
    if (!this.eventSub)
      return;
    const subscribedTypes = /* @__PURE__ */ new Set();
    for (const scope of this.scopes) {
      const eventTypes = SCOPE_TO_EVENTSUB[scope];
      if (!eventTypes)
        continue;
      for (const [type, version] of eventTypes) {
        if (subscribedTypes.has(type))
          continue;
        subscribedTypes.add(type);
        try {
          const allowedFields = CONDITION_FIELDS[type] || ["broadcaster_user_id"];
          const condition = {};
          if (allowedFields.includes("broadcaster_user_id")) {
            condition.broadcaster_user_id = this.channelId;
          }
          if (allowedFields.includes("moderator_user_id")) {
            condition.moderator_user_id = this.userId;
          }
          if (allowedFields.includes("user_id")) {
            condition.user_id = this.userId;
          }
          if (allowedFields.includes("broadcaster_user_id") && !this.channelId) {
            this.log(`Skipping ${type}: no channelId available`);
            this.emitEventSubStatus("eventsub-subscribe-failed", `${type}: No channel ID available (getUserByLogin may have failed)`, { type, error: "no-channel-id" });
            continue;
          }
          await this.eventSub.subscribe(type, version, condition);
          this.emitEventSubStatus("eventsub-subscribed", type, { version, condition });
        } catch (err) {
          console.error(`Failed to subscribe to ${type}:`, err);
          this.log(`Failed to subscribe to ${type}: ${err}`);
          this.emitEventSubStatus("eventsub-subscribe-failed", `${type}: ${String(err)}`, { type, error: String(err) });
        }
      }
    }
  }
  handleEventSubNotification(notification) {
    const { subscriptionType, event } = notification;
    try {
      switch (subscriptionType) {
        case "channel.channel_points_custom_reward_redemption.add":
        case "channel.channel_points_automatic_reward_redemption.add":
          this.handleRewardEvent(event);
          break;
        case "channel.hype_train.begin":
        case "channel.hype_train.progress":
        case "channel.hype_train.end":
          this.handleHypeTrainEvent(subscriptionType, event);
          break;
        case "channel.shoutout.create":
          this.handleShoutoutEvent(event);
          break;
        case "user.whisper.message":
          this.handleWhisperEvent(event);
          break;
        case "channel.poll.begin":
        case "channel.poll.progress":
        case "channel.poll.end":
          this.handlePollEvent(subscriptionType, event);
          break;
        case "channel.prediction.begin":
        case "channel.prediction.progress":
        case "channel.prediction.lock":
        case "channel.prediction.end":
          this.handlePredictionEvent(subscriptionType, event);
          break;
      }
    } catch (error) {
      this.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }
  handleRewardEvent(event) {
    const user = event.user_name || event.user_login;
    const reward = event.reward;
    const title = reward?.title || "";
    const cost = reward?.cost || 0;
    const message = event.user_input || "";
    const extra = {
      channelId: event.broadcaster_user_id,
      channelName: event.broadcaster_user_login,
      channelDisplayName: event.broadcaster_user_name,
      reward: {
        id: reward?.id,
        title: reward?.title,
        prompt: reward?.prompt,
        cost: reward?.cost
      },
      rewardFulfilled: event.status?.toLowerCase() === "fulfilled",
      userId: event.user_id,
      username: event.user_login,
      displayName: event.user_name,
      customRewardId: event.id,
      redeemed_at: event.redeemed_at
    };
    this.onReward(user, title, cost, message, extra);
  }
  handleHypeTrainEvent(type, event) {
    const phase = type.split(".").pop();
    const level = event.level;
    const progress = event.progress || 0;
    const goal = event.goal;
    const total = event.total;
    const endDate = event.expires_at || event.ended_at;
    const timeRemaining = new Date(endDate).getTime() - Date.now();
    const extra = {
      ...event,
      id: event.id,
      channelId: event.broadcaster_user_id,
      channelName: event.broadcaster_user_login,
      channelDisplayName: event.broadcaster_user_name,
      level,
      progressToNextLevel: progress,
      goalToNextLevel: goal,
      totalHype: total,
      isGoldenKappaTrain: event.is_golden_kappa_train,
      startDate: event.started_at,
      endDate
    };
    this.onHypeTrain(phase, level, progress, goal, total, timeRemaining, extra);
  }
  handleShoutoutEvent(event) {
    const channel = event.to_broadcaster_user_name;
    const viewerCount = event.viewer_count;
    const startedAt = event.started_at;
    const timeRemaining = new Date(startedAt).getTime() - Date.now() + 6e4;
    const extra = {
      ...event,
      channelId: event.to_broadcaster_user_id,
      channelName: event.to_broadcaster_user_login,
      channelDisplayName: event.to_broadcaster_user_name,
      shouterChannelId: event.broadcaster_user_id,
      shouterChannelName: event.broadcaster_user_login,
      shouterChannelDisplayName: event.broadcaster_user_name,
      viewerCount,
      startedAt,
      cooldownEndsAt: event.cooldown_ends_at,
      targetCooldownEndsAt: event.target_cooldown_ends_at
    };
    this.onShoutout(channel, viewerCount, timeRemaining, extra);
  }
  handleWhisperEvent(event) {
    const user = event.from_user_name || event.from_user_login;
    const whisper = event.whisper;
    const message = whisper?.text || "";
    const extra = {
      fromUserId: event.from_user_id,
      fromUserLogin: event.from_user_login,
      fromUserName: event.from_user_name,
      toUserId: event.to_user_id,
      toUserLogin: event.to_user_login,
      toUserName: event.to_user_name,
      whisperId: event.whisper_id,
      whisper
    };
    const emptyFlags = {
      broadcaster: false,
      mod: false,
      vip: false,
      subscriber: false,
      founder: false,
      highlighted: false,
      customReward: false
    };
    this.onWhisper(user, message, emptyFlags, false, extra);
  }
  handlePollEvent(type, event) {
    const phase = type.split(".").pop();
    const title = event.title;
    const choices = event.choices;
    let pollChoices = choices.map((c) => c.title);
    let pollVotes = choices.map((c) => (c.bits_votes || 0) + (c.channel_points_votes || 0) + (c.votes || 0));
    const endDate = event.ends_at || event.ended_at;
    const timeRemaining = new Date(endDate).getTime() - Date.now();
    if (phase !== "begin") {
      const sorted = pollChoices.map((c, i) => [c, pollVotes[i]]).sort((a, b) => b[1] - a[1]);
      pollChoices = sorted.map((x) => x[0]);
      pollVotes = sorted.map((x) => x[1]);
    }
    let phaseStr = phase;
    if (phase === "end") {
      const status = event.status;
      phaseStr = status === "terminated" ? "close" : status === "archived" ? "archive" : status === "moderated" ? "delete" : status === "completed" ? "end" : "unknown";
    }
    const extra = {
      ...event,
      channelId: event.broadcaster_user_id,
      channelName: event.broadcaster_user_login,
      channelDisplayName: event.broadcaster_user_name,
      pollId: event.id,
      title,
      choices,
      startDate: event.started_at,
      endDate,
      status: event.status
    };
    this.onPoll(phaseStr, title, pollChoices, pollVotes, timeRemaining, extra);
  }
  handlePredictionEvent(type, event) {
    const phase = type.split(".").pop();
    const title = event.title;
    const outcomes = event.outcomes;
    const predictionOutcomes = outcomes.map((o) => o.title);
    const topPredictors = outcomes.map((o) => {
      if (!o.top_predictors)
        return [];
      return o.top_predictors.map((p) => ({
        user: p.user_name || p.user_login || "",
        userId: p.user_id,
        points: p.channel_points_used || 0,
        won: p.channel_points_won || 0
      }));
    });
    const lockDate = event.locks_at || event.locked_at;
    const timeRemaining = new Date(lockDate).getTime() - Date.now();
    let phaseStr = phase;
    if (phase === "end") {
      const status = event.status;
      phaseStr = status === "canceled" ? "cancel" : status === "resolved" ? "end" : "unknown";
    }
    const extra = {
      ...event,
      channelId: event.broadcaster_user_id,
      channelName: event.broadcaster_user_login,
      channelDisplayName: event.broadcaster_user_name,
      predictionId: event.id,
      title,
      outcomes,
      startDate: event.started_at,
      lockDate,
      endDate: event.ended_at,
      status: event.status
    };
    this.onPrediction(phaseStr, title, predictionOutcomes, topPredictors, phase === "end" || phase === "lock" ? 0 : timeRemaining, extra);
  }
  // ─────────────────────────────────────────────────────────────────────────
  // P2P Status
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Get the P2P coordination role
   */
  p2pRole() {
    return this.p2p?.currentRole ?? null;
  }
  /**
   * Get this instance's P2P ID
   */
  p2pId() {
    return this.p2p?.id ?? null;
  }
  /**
   * Get the number of connected followers (leader only)
   */
  p2pFollowerCount() {
    return this.p2p?.followerCount ?? 0;
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────
  emitEventSubStatus(event, detail, data) {
    this.log(`EventSub status: ${event} \u2014 ${detail}`);
    try {
      if (this.onEventSubStatus) {
        this.onEventSubStatus(event, detail, data);
      }
    } catch (err) {
      console.warn("[ComfyJS] onEventSubStatus callback error:", err);
    }
  }
  log(msg) {
    if (this.isDebug) {
      console.log(`[ComfyJS] ${msg}`);
    }
  }
};
var ComfyJS = new ComfyJSImpl();
var src_default = ComfyJS;
if (typeof window !== "undefined") {
  window.ComfyJS = ComfyJS;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ComfyJS,
  EventSubClient,
  EventSubTypes,
  IRCClient,
  P2PCoordinator,
  TwitchAPI
});
//# sourceMappingURL=comfy.cjs.map
