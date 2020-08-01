// Type definitions for comfy.js 1.1.2
// Project: https://github.com/instafluff/ComfyJS
// Definitions by: Michael Jolley <https://github.com/michaeljolley>

// Last updated: 2020/08/01

import { Badges, Client, RoomState, SubMethods } from "tmi.js";

/**
 * Types
 */
export { Badges, Client, RoomState, SubMethods } from "tmi.js";

export type CommandTimePeriod = {
  any: number;
  user: number;
};

export type OnCheerFlags = {
  mod: boolean;
  founder: boolean;
  subscriber: boolean;
  vip: boolean;
};

export type OnMessageFlags = {
  broadcaster: boolean;
  mod: boolean;
  founder: boolean;
  subscriber: boolean;
  vip: boolean;
  highlighted: boolean;
  customReward: boolean;
}

export type OnRewardExtra = {
  channelId: string;
  reward: string;
  rewardFulfilled: boolean;
  userId: string;
  username: string;
  displayName: string;
  customRewardId: string;
  timestamp: string;
}

export type OnMessageExtra = {
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
  userBadges: Badges;
  customRewardId: string;
  flags: any;
  timestamp: string;
}

export type OnCommandExtra = {
  id: string;
  channel: string;
  roomId: string;
  messageType: string;
  messageEmotes: EmoteSet;
  isEmoteOnly: boolean;
  userId: string;
  username: string;
  displayName: string;
  userColor: string;
  userBadges: Badges;
  customRewardId: string;
  flags: any;
  timestamp: string;
  sinceLastCommand: CommandTimePeriod;
}

export type OnMessageDeletedExtra = {
  id: string;
  roomId: string;
  username: string;
  message: string;
}

export type OnJoinExtra = {
  channel: string;
}

export type OnPartExtra = {
  channel: string;
}

export type OnHostExtra = {
  channel: string;
}

export type OnRaidExtra = {
  channel: string;
}

export type OnCheerExtra = {
  channel: string;
  roomId: string;
  userId: string;
  username: string;
  userColor: string;
  userBadges: Badges;
  displayName: string;
  messageEmotes: EmoteSet;
  subscriber: string;
}

export type OnSubExtra = {
  id: string;
  roomId: string;
  messageType: string;
  messageEmotes: EmoteSet;
  userId: string;
  username: string;
  displayName: string;
  userColor: string;
  userBadges: Badges;
}

export type OnResubExtra = {
  id: string;
  roomId: string;
  messageType: string;
  messageEmotes: EmoteSet;
  userId: string;
  username: string;
  displayName: string;
  userColor: string;
  userBadges: Badges;
}

export type OnSubGiftExtra = {
  id: string;
  roomId: string;
  messageType: string;
  messageEmotes: EmoteSet;
  userId: string;
  username: string;
  displayName: string;
  userColor: string;
  userBadges: Badges;
  recipientDisplayName: string;
  recipientUsername: string;
  recipientId: string;
}

export type OnSubMysteryGiftExtra = {
  id: string;
  roomId: string;
  messageType: string;
  messageEmotes: EmoteSet;
  userId: string;
  username: string;
  displayName: string;
  userColor: string;
  userBadges: Badges;
  recipientDisplayName: string;
  recipientUsername: string;
  recipientId: string;
  userMassGiftCount: number;
}

export type OnGiftSubContinueExtra = {
  id: string;
  roomId: string;
  messageType: string;
  messageEmotes: EmoteSet;
  userId: string;
  username: string;
  displayName: string;
  userColor: string;
  userBadges: Badges;
  gifterUsername: string;
  gifterDisplayName: string;
}

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
    flags: OnMessageFlags,
    extra: OnCommandExtra
  ): void;
};

export type OnChatHandler = {
  (
    user: string,
    message: string,
    flags: OnMessageFlags,
    self: boolean,
    extra: OnMessageExtra
  ): void;
};

export type OnWhisperHandler = {
  (
    user: string,
    message: string,
    flags: OnMessageFlags,
    self: boolean,
    extra: OnMessageExtra
  ): void;
};

export type OnMessageDeletedHandler = {
  (id: string, extra: OnMessageDeletedExtra): void;
};

export type OnJoinHandler = {
  (user: string, self: boolean, extra: OnJoinExtra): void;
};

export type OnPartHandler = {
  (user: string, self: boolean, extra: OnPartExtra): void;
};

export type OnHostedHandler = {
  (user: string, viewers: number, autohost: boolean, extra: OnHostExtra): void;
};

export type OnRaidHandler = {
  (user: string, viewers: number, extra: OnRaidExtra): void;
};

export type OnSubHandler = {
  (user: string, message: string, subTierInfo: SubMethods, extra: OnSubExtra): void;
};

export type OnResubHandler = {
  (
    user: string,
    message: string,
    streakMonths: number,
    cumulativeMonths: number,
    subTierInfo: SubMethods,
    extra: OnResubExtra
  ): void;
};

export type OnSubGiftHandler = {
  (
    gifterUser: string,
    streakMonths: number,
    recipientUser: string,
    senderCount: number,
    subTierInfo: SubMethods,
    extra: OnSubGiftExtra
  ): void;
};

export type OnSubMysteryGiftHandler = {
  (
    gifterUser: string,
    numbOfSubs: number,
    senderCount: number,
    subTierInfo: SubMethods,
    extra: OnSubMysteryGiftExtra
  ): void;
};

export type OnGiftSubContinueHandler = {
  (user: string, sender: string, extra: OnGiftSubContinueExtra): void;
};

export type OnCheerHandler = {
  (
    user: string,
    message: string,
    bits: number,
    flags: OnCheerFlags,
    extra: OnCheerExtra
  ): void;
};

export type OnChatModeHandler = {
  (flags: RoomState, channel: string): void;
};

export type OnRewardHandler = {
  (user: string, reward: string, cost: string, message: string, extra: OnRewardExtra): void;
}

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
  onReward: OnRewardHandler;
  onConnected: OnConnectedHandler;
  onReconnect: OnReconnectHandler;
}

declare const ComfyJS: ComfyJSInstance;

export default ComfyJS;
