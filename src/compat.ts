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
  /** Receives every EventSub notification before any convenience callback runs. */
  onEventSub: EventSubCallback;

  /**
   * Subscribe to any Twitch EventSub type without waiting for a ComfyJS release.
   * The caller supplies Twitch's subscription type, version, and condition.
   */
  SubscribeEventSub(
    type: string,
    version: string,
    condition: Record<string, string>
  ): Promise<unknown>;

  /** Remove an EventSub subscription by Twitch subscription ID. */
  UnsubscribeEventSub(id: string): Promise<void>;

  /** Return Twitch's current EventSub subscription inventory for this token/app. */
  GetEventSubSubscriptions(): Promise<unknown>;
}

export type ComfyJSPublicInstance = ComfyJSInstance & ComfyJSModernExtensions;

/**
 * Compatibility boundary for the public ComfyJS singleton.
 *
 * v2 internals are free to evolve, but the handlers installed here preserve the
 * observable v1 IRC callback contract. New data is exposed through additive
 * APIs/events rather than changing the arguments of legacy callbacks.
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

const originalHandleUserNotice = comfy.handleUserNotice.bind(comfy);
const originalHandleEventSubNotification = comfy.handleEventSubNotification.bind(comfy);

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
      // v1's cheer event had a deliberately smaller flags object and a
      // cheer-specific extra payload. Preserve that shape exactly.
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

const PublicComfyJS = ComfyJS as ComfyJSPublicInstance;

export default PublicComfyJS;
export * from './types';
export { IRCClient } from './irc';
export { EventSubClient, EventSubTypes } from './eventsub';
export { TwitchAPI } from './api';
export { P2PCoordinator } from './p2p';
export * from './parsers';
