import ComfyJS from './index';
import type { ComfyJSInstance, IRCMessage, UserExtra } from './types';
import type { EventSubNotification } from './eventsub';
import { buildUserExtra, parseCommand, parseUserFlags } from './parsers';

export type EventSubCallback = (
  type: string,
  event: Record<string, unknown>,
  version: string
) => void;

export interface ComfyJSModernExtensions {
  /** Awaitable counterpart to the legacy fire-and-forget Init(). */
  InitAsync(
    username: string,
    password?: string,
    channels?: string | string[],
    isDebug?: boolean
  ): Promise<void>;

  /** Receives every EventSub notification before any convenience callback runs. */
  onEventSub: EventSubCallback;

  /** Subscribe to any Twitch EventSub type without waiting for a ComfyJS release. */
  SubscribeEventSub(
    type: string,
    version: string,
    condition: Record<string, string>
  ): Promise<unknown>;

  /** Remove an EventSub subscription by Twitch subscription ID. */
  UnsubscribeEventSub(id: string): Promise<void>;

  /** Return Twitch's current EventSub subscription inventory for this token/app. */
  GetEventSubSubscriptions(): Promise<unknown>;

  /** Get the currently pinned mod message for a channel. */
  GetPinnedChatMessage(channel?: string): Promise<unknown[]>;

  /** Pin an existing chat message. Twitch currently accepts 30-1800 seconds. */
  PinChatMessage(messageId: string, durationSeconds?: number, channel?: string): Promise<void>;

  /** Change the remaining duration of the current pinned chat message. */
  UpdatePinnedChatMessage(messageId: string, durationSeconds?: number, channel?: string): Promise<void>;

  /** Unpin an existing chat message. */
  UnpinChatMessage(messageId: string, channel?: string): Promise<void>;
}

type LegacyInit = (
  username: string,
  password?: string,
  channels?: string | string[],
  isDebug?: boolean
) => void;

export type ComfyJSPublicInstance = Omit<ComfyJSInstance, 'Init'> &
  ComfyJSModernExtensions & {
    /** v1-compatible fire-and-forget initialization. Use InitAsync to await readiness. */
    Init: LegacyInit;
  };

/**
 * Compatibility boundary for the public ComfyJS singleton.
 *
 * v2 internals are free to evolve, but the handlers installed here preserve the
 * observable v1 contract. New data is exposed through additive APIs/events
 * rather than changing legacy callbacks or method return values.
 */
const comfy = ComfyJS as any;

type TimestampStore = {
  global: Record<string, number>;
  users: Record<string, Record<string, number>>;
};

const timestamps: TimestampStore = {
  global: {},
  users: {},
};

function getTimePeriod(command: string, userId?: string): { any: number; user: number | null } {
  const now = Date.now();
  const previousGlobal = timestamps.global[command];
  const any = previousGlobal === undefined ? 0 : now - previousGlobal;
  timestamps.global[command] = now;

  if (!userId) {
    return { any, user: null };
  }

  timestamps.users[userId] ||= {};
  const previousUser = timestamps.users[userId][command];
  const user = previousUser === undefined ? 0 : now - previousUser;
  timestamps.users[userId][command] = now;
  return { any, user };
}

function normalizePrivmsg(msg: IRCMessage): { message: string; messageType: 'chat' | 'action' } {
  const raw = msg.message || '';
  const actionPrefix = '\u0001ACTION ';

  if (raw.startsWith(actionPrefix) && raw.endsWith('\u0001')) {
    return {
      message: raw.slice(actionPrefix.length, -1),
      messageType: 'action',
    };
  }

  return { message: raw, messageType: 'chat' };
}

function legacyExtra(msg: IRCMessage, messageType: string): UserExtra {
  return {
    ...buildUserExtra(msg),
    messageType,
  };
}

function reportAsyncError(instance: any, error: unknown): void {
  instance.onError(error instanceof Error ? error : new Error(String(error)));
}

function afterInit(instance: any, action: () => boolean | void | Promise<unknown>): void {
  const pending = instance.__comfyInitPromise as Promise<void> | undefined;
  const run = async (): Promise<void> => {
    if (pending) await pending;
    await action();
  };
  void run().catch(error => reportAsyncError(instance, error));
}

async function resolveChannelId(instance: any, channel?: string): Promise<string> {
  const target = channel?.replace('#', '').toLowerCase();
  if (!target || target === instance.mainChannel) {
    if (!instance.channelId) throw new Error('Channel ID is not available');
    return instance.channelId;
  }
  if (!instance.api) throw new Error('Twitch API is not initialized');
  const user = await instance.api.getUserByLogin(target);
  if (!user) throw new Error(`Twitch channel '${target}' was not found`);
  return user.id;
}

async function twitchRequest(instance: any, path: string, init: RequestInit = {}): Promise<Response> {
  if (!instance.password || !instance.clientId) {
    throw new Error('An OAuth token is required for this Twitch API operation');
  }
  const response = await fetch(`https://api.twitch.tv/helix${path}`, {
    ...init,
    headers: {
      'Client-ID': instance.clientId,
      'Authorization': `Bearer ${instance.password}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Twitch API ${response.status}: ${body || response.statusText}`);
  }
  return response;
}

const originalInit = comfy.Init.bind(comfy);
const originalSay = comfy.Say.bind(comfy);
const originalReply = comfy.Reply.bind(comfy);
const originalHandleUserNotice = comfy.handleUserNotice.bind(comfy);
const originalHandleEventSubNotification = comfy.handleEventSubNotification.bind(comfy);

function beginInit(
  instance: any,
  username: string,
  password?: string,
  channels?: string | string[],
  isDebug?: boolean
): Promise<void> {
  const promise = originalInit(username, password, channels, isDebug);
  instance.__comfyInitPromise = promise;
  void promise.finally(() => {
    if (instance.__comfyInitPromise === promise) instance.__comfyInitPromise = undefined;
  }).catch(() => {});
  return promise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Frozen v1 method contract
// ─────────────────────────────────────────────────────────────────────────────

comfy.Init = function InitCompat(
  username: string,
  password?: string,
  channels?: string | string[],
  isDebug?: boolean
): void {
  void beginInit(this, username, password, channels, isDebug)
    .catch(error => reportAsyncError(this, error));
};

comfy.InitAsync = function InitAsync(
  username: string,
  password?: string,
  channels?: string | string[],
  isDebug?: boolean
): Promise<void> {
  return beginInit(this, username, password, channels, isDebug);
};

comfy.Say = function SayCompat(message: string, channel?: string): boolean {
  if (this.irc) return originalSay(message, channel);
  if (!this.__comfyInitPromise) return false;
  afterInit(this, () => originalSay(message, channel));
  return true;
};

comfy.Reply = function ReplyCompat(parentId: string, message: string, channel?: string): boolean {
  if (this.irc) return originalReply(parentId, message, channel);
  if (!this.__comfyInitPromise) return false;
  afterInit(this, () => originalReply(parentId, message, channel));
  return true;
};

comfy.Whisper = function WhisperCompat(message: string, user: string): boolean {
  if (!this.irc && !this.__comfyInitPromise) return false;

  afterInit(this, async () => {
    if (!this.api || !this.userId) throw new Error('Whisper requires an authenticated ComfyJS connection');
    const target = await this.api.getUserByLogin(user);
    if (!target) throw new Error(`Twitch user '${user}' was not found`);
    await twitchRequest(
      this,
      `/whispers?from_user_id=${encodeURIComponent(this.userId)}&to_user_id=${encodeURIComponent(target.id)}`,
      { method: 'POST', body: JSON.stringify({ message }) }
    );
  });
  return true;
};

comfy.DeleteMessage = function DeleteMessageCompat(id: string, channel?: string): boolean {
  if (!this.irc && !this.__comfyInitPromise) return false;

  afterInit(this, async () => {
    if (!this.api || !this.userId) throw new Error('DeleteMessage requires an authenticated ComfyJS connection');
    const broadcasterId = await resolveChannelId(this, channel);
    await this.api.deleteMessage(broadcasterId, this.userId, id);
  });
  return true;
};

// ─────────────────────────────────────────────────────────────────────────────
// Frozen v1 IRC callback contract
// ─────────────────────────────────────────────────────────────────────────────

comfy.handlePrivmsg = function handlePrivmsgCompat(msg: IRCMessage): void {
  try {
    const channel = msg.channel?.replace('#', '') || '';
    const username = msg.tags['display-name'] || msg.tags.username || msg.nick || '';
    const { message, messageType } = normalizePrivmsg(msg);
    const self = false;
    const flags = parseUserFlags(msg.tags, channel);
    const extra = legacyExtra(msg, messageType);

    const bits = Number.parseInt(msg.tags.bits || '0', 10);
    if (bits > 0) {
      const cheerFlags = {
        broadcaster: flags.broadcaster,
        mod: flags.mod,
        founder: flags.founder,
        subscriber: flags.subscriber,
        vip: flags.vip,
      };
      const cheerExtra = {
        id: extra.id,
        channel: extra.channel,
        roomId: extra.roomId,
        userId: extra.userId,
        username: extra.username,
        userColor: extra.userColor,
        userBadges: extra.userBadges,
        userState: extra.userState,
        displayName: extra.displayName,
        messageEmotes: extra.messageEmotes,
        subscriber: msg.tags.subscriber || '',
      };
      this.onCheer(username, message, bits, cheerFlags, cheerExtra);
      return;
    }

    const parsed = parseCommand(message);
    if (!self && parsed) {
      const sinceLastCommand = getTimePeriod(parsed.command, msg.tags['user-id']);
      this.onCommand(username, parsed.command, parsed.args, flags, {
        ...extra,
        sinceLastCommand: {
          any: sinceLastCommand.any,
          user: sinceLastCommand.user ?? 0,
        },
      });
      return;
    }

    this.onChat(username, message, flags, self, extra);
  } catch (error) {
    this.onError(error instanceof Error ? error : new Error(String(error)));
  }
};

comfy.handleWhisper = function handleWhisperCompat(msg: IRCMessage): void {
  try {
    const username = msg.tags['display-name'] || msg.tags.username || msg.nick || '';
    const message = msg.message || '';
    const flags = parseUserFlags(msg.tags, msg.nick || '');
    this.onWhisper(username, message, flags, false, legacyExtra(msg, 'whisper'));
  } catch (error) {
    this.onError(error instanceof Error ? error : new Error(String(error)));
  }
};

comfy.handleJoin = function handleJoinCompat(msg: IRCMessage): void {
  const channel = msg.channel?.replace('#', '') || '';
  const username = msg.nick || msg.prefix?.split('!')[0] || '';
  const self = username.toLowerCase() === this.irc?.username?.toLowerCase();
  this.onJoin(username, self, { channel });
};

comfy.handlePart = function handlePartCompat(msg: IRCMessage): void {
  const channel = msg.channel?.replace('#', '') || '';
  const username = msg.nick || msg.prefix?.split('!')[0] || '';
  const self = username.toLowerCase() === this.irc?.username?.toLowerCase();
  this.onPart(username, self, { channel });
};

comfy.handleUserNotice = function handleUserNoticeCompat(msg: IRCMessage): void {
  if (msg.tags['msg-id'] === 'raid') {
    const username = msg.tags['display-name'] || msg.tags.login || '';
    const viewers = Number.parseInt(msg.tags['msg-param-viewerCount'] || '0', 10);
    this.onRaid(username, viewers, { channel: msg.channel?.replace('#', '') || '' });
    return;
  }

  originalHandleUserNotice(msg);
};

// ─────────────────────────────────────────────────────────────────────────────
// Additive modern EventSub surface
// ─────────────────────────────────────────────────────────────────────────────

comfy.onEventSub = (_type: string, _event: Record<string, unknown>, _version: string): void => {};

comfy.handleEventSubNotification = function handleEventSubNotificationCompat(
  notification: EventSubNotification
): void {
  try {
    this.onEventSub(
      notification.subscriptionType,
      notification.event,
      notification.subscriptionVersion
    );
  } catch (error) {
    this.onError(error instanceof Error ? error : new Error(String(error)));
  }

  originalHandleEventSubNotification(notification);
};

comfy.SubscribeEventSub = async function SubscribeEventSub(
  type: string,
  version: string,
  condition: Record<string, string>
): Promise<unknown> {
  if (!this.eventSub) {
    throw new Error('EventSub is not initialized. Call ComfyJS.Init() with an OAuth token first.');
  }
  return this.eventSub.subscribe(type, version, condition);
};

comfy.UnsubscribeEventSub = async function UnsubscribeEventSub(id: string): Promise<void> {
  if (!this.api) {
    throw new Error('Twitch API is not initialized. Call ComfyJS.Init() with an OAuth token first.');
  }
  await this.api.deleteEventSubSubscription(id);
  this.eventSub?.unregisterSubscription(id);
};

comfy.GetEventSubSubscriptions = async function GetEventSubSubscriptions(): Promise<unknown> {
  if (!this.api) {
    throw new Error('Twitch API is not initialized. Call ComfyJS.Init() with an OAuth token first.');
  }
  return this.api.getEventSubSubscriptions();
};

comfy.GetPinnedChatMessage = async function GetPinnedChatMessage(channel?: string): Promise<unknown[]> {
  const broadcasterId = await resolveChannelId(this, channel);
  const response = await twitchRequest(
    this,
    `/chat/pins?broadcaster_id=${encodeURIComponent(broadcasterId)}&moderator_id=${encodeURIComponent(this.userId)}`
  );
  const data = await response.json() as { data?: unknown[] };
  return data.data || [];
};

async function mutatePin(
  instance: any,
  method: 'PUT' | 'PATCH' | 'DELETE',
  messageId: string,
  durationSeconds?: number,
  channel?: string
): Promise<void> {
  const broadcasterId = await resolveChannelId(instance, channel);
  const params = new URLSearchParams({
    broadcaster_id: broadcasterId,
    moderator_id: instance.userId,
    message_id: messageId,
  });
  if (durationSeconds !== undefined && method !== 'DELETE') {
    params.set('duration_seconds', String(durationSeconds));
  }
  await twitchRequest(instance, `/chat/pins?${params}`, { method });
}

comfy.PinChatMessage = function PinChatMessage(
  messageId: string,
  durationSeconds?: number,
  channel?: string
): Promise<void> {
  return mutatePin(this, 'PUT', messageId, durationSeconds, channel);
};

comfy.UpdatePinnedChatMessage = function UpdatePinnedChatMessage(
  messageId: string,
  durationSeconds?: number,
  channel?: string
): Promise<void> {
  return mutatePin(this, 'PATCH', messageId, durationSeconds, channel);
};

comfy.UnpinChatMessage = function UnpinChatMessage(messageId: string, channel?: string): Promise<void> {
  return mutatePin(this, 'DELETE', messageId, undefined, channel);
};

const PublicComfyJS = ComfyJS as ComfyJSPublicInstance;

export default PublicComfyJS;
export * from './types';
export { IRCClient } from './irc';
export { EventSubClient, EventSubTypes } from './eventsub';
export { TwitchAPI } from './api';
export { P2PCoordinator } from './p2p';
export * from './parsers';
