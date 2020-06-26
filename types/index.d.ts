// Type definitions for comfy.js 1.0.18
// Project: https://github.com/instafluff/ComfyJS
// Definitions by: Michael Jolley <https://github.com/michaeljolley>

// Last updated: 2019/6/25

import { Badges, Client, RoomState, SubMethods } from "tmi.js";

/**
 * Types
 */
export type UserFlags = {
  broadcaster: boolean;
  mod: boolean;
  founder: boolean;
  subscriber: boolean;
  vip: boolean;
  highlighted?: boolean;
  customReward?: boolean;
};

export type Extra = {
  id: string;
  channel: string;
  roomId: string;
  messageType: string;
  messageEmotes?: EmoteSet;
  isEmoteOnly: boolean;
  userId: string;
  username: string;
  displayName: string;
  userColor: string;
  userBadges?: Badges;
  customRewardId?: string;
  flags?: any;
  timestamp: string;
  sinceLastCommand?: TimePeriod;
};

export type TimePeriod = {
  any: number;
  user?: number;
};

export type EmoteSet = {
  [emoteid: string]: string[];
};

/**
 * Callback Definitions
 */
export type OnErrorHandler = {
  (error: any): void;
};

export type OnCommandHandler = {
  (
    user: string,
    command: string,
    message: string,
    flags: UserFlags,
    extra: Extra
  ): void;
};

export type OnChatHandler = {
  (
    user: string,
    message: string,
    flags: UserFlags,
    self: boolean,
    extra: Extra
  ): void;
};

export type OnWhisperHandler = {
  (
    user: string,
    message: string,
    flags: UserFlags,
    self: boolean,
    extra: Extra
  ): void;
};

export type OnMessageDeletedHandler = {
  (id: string, extra: Extra): void;
};

export type OnJoinHandler = {
  (user: string, self: boolean): void;
};

export type OnPartHandler = {
  (user: string, self: boolean): void;
};

export type OnHostedHandler = {
  (user: string, viewers: number, autohost: boolean): void;
};

export type OnRaidHandler = {
  (user: string, viewers: number): void;
};

export type OnSubHandler = {
  (user: string, message: string, subTierInfo: SubMethods, extra: Extra): void;
};

export type OnResubHandler = {
  (
    user: string,
    message: string,
    streakMonths: number,
    cumulativeMonths: number,
    subTierInfo: SubMethods,
    extra: Extra
  ): void;
};

export type OnSubGiftHandler = {
  (
    gifterUser: string,
    streakMonths: number,
    recipientUser: string,
    senderCount: number,
    subTierInfo: SubMethods,
    extra: Extra
  ): void;
};

export type OnSubMysteryGiftHandler = {
  (
    gifterUser: string,
    numbOfSubs: number,
    senderCount: number,
    subTierInfo: SubMethods,
    extra: Extra
  ): void;
};

export type OnGiftSubContinueHandler = {
  (user: string, sender: string, extra: Extra): void;
};

export type OnCheerHandler = {
  (
    user: string,
    message: string,
    bits: number,
    flags: UserFlags,
    extra: Extra
  ): void;
};

export type OnChatModeHandler = {
  (flags: RoomState, channel: string): void;
};

export type OnConnectedHandler = {
  (address: string, port: number, isFirstConnect: boolean): void;
};

export type OnReconnectHandler = {
  (reconnectCount: number): void;
};

/**
 * ComfyJS
 */
export interface ComfyJSInstance {
  version(): string;

  // Functions
  Say(message: string, channel: string): boolean;
  Whisper(message: string, user: string): boolean;
  DeleteMessage(id: string, channel: string): boolean;
  GetClient(): Client;
  Init(
    username: string,
    password?: string,
    channels?: string | string[],
    isDebug?: boolean
  ): void;
  Disconnect(): void;

  // Events
  onError: OnErrorHandler;
  onCommand: OnCommandHandler;
  onChat: OnChatHandler;
  onWhisper: OnWhisperHandler;
  onMessageDeleted: OnMessageDeletedHandler;
  onJoin: OnJoinHandler;
  onPart: OnPartHandler;
  onHosted: OnHostedHandler;
  onRaid: OnRaidHandler;
  onSub: OnSubHandler;
  onResub: OnResubHandler;
  onSubGift: OnSubGiftHandler;
  onSubMysteryGift: OnSubMysteryGiftHandler;
  onGiftSubContinue: OnGiftSubContinueHandler;
  onCheer: OnCheerHandler;
  onChatMode: OnChatModeHandler;
  onConnected: OnConnectedHandler;
  onReconnect: OnReconnectHandler;
}

declare const ComfyJS: ComfyJSInstance;

export default ComfyJS;
