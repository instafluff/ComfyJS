import { TwitchEventType } from "./twitch";
export type TwitchEventHandler = (context?: any) => void;
export type TwitchChatMode = {
    emoteOnly: boolean;
    followersOnly: boolean;
    subscribersOnly: boolean;
    r9k: boolean;
    slow: boolean;
    language: string;
};
export declare class TwitchEvents {
    #private;
    debug: boolean;
    reconnects: number;
    channels: string[];
    chatModes: {
        [channel: string]: TwitchChatMode;
    };
    handlers: Partial<{
        [key in TwitchEventType]: TwitchEventHandler | undefined;
    }>;
    constructor(username: string, password?: string, channels?: string[] | string, isDebug?: boolean);
    get version(): string;
    get latency(): number;
    get ws(): WebSocket | undefined;
    on(eventType: TwitchEventType, handler: (context?: any) => void): void;
    say(message: string, channel?: string): void;
    reply(messageId: string, message: string, channel?: string): void;
    join(channel: string | string[]): void;
    leave(channel: string): void;
    deleteMessage(messageId: string, channel?: string): void;
    simulateIRCMessage(message: string): void;
    destroy(): void;
}
