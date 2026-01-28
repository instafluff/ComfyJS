import type { IRCMessage, UserFlags, UserExtra, ChatModeFlags, P2PSignal } from './types';
/**
 * Parse IRC tags string into a key-value object
 * @example "@badge-info=subscriber/3;badges=subscriber/3,premium/1" -> { "badge-info": "subscriber/3", ... }
 */
export declare function parseIRCTags(tagString: string): Record<string, string>;
/**
 * Parse a raw IRC message into structured format
 * @example "@tags :nick!user@host COMMAND #channel :message"
 */
export declare function parseIRCMessage(raw: string): IRCMessage;
export declare function parseUserFlags(tags: Record<string, string>, channel: string): UserFlags;
export declare function parseEmotes(emoteTag: string): Record<string, string[]> | undefined;
export declare function parseBadges(badgeTag: string): Record<string, string>;
export declare function buildUserExtra(msg: IRCMessage): UserExtra;
export declare function parseChatModeFlags(tags: Record<string, string>): ChatModeFlags;
export declare function parseP2PSignal(tags: Record<string, string>): P2PSignal | null;
export declare function parseSubTier(plan: string): {
    prime: boolean;
    plan: string;
    planName: string;
};
export declare function parseCommand(message: string, prefix?: string): {
    command: string;
    args: string;
} | null;
