import { ParsedMessage } from "./parseFast";
export declare enum TwitchEventType {
    None = "none",
    Ping = "Ping",
    Pong = "Pong",
    Connect = "connect",
    Reconnect = "reconnect",
    Error = "error",
    Warning = "Warning",
    ChatMode = "chatmode",
    ClearChat = "ClearChat",
    RoomState = "roomstate",
    GlobalUserState = "globaluserstate",
    UserState = "userstate",
    Notice = "notice",
    Join = "join",
    Leave = "leave",
    Command = "command",
    Chat = "message",
    Reply = "reply",
    Whisper = "whisper",
    Announcement = "announcement",
    Cheer = "Cheer",
    Subscribe = "sub",
    Resubscribe = "resub",
    SubGift = "subgift",
    MysterySubGift = "submysterygift",
    SubGiftContinue = "subgiftcontinue",
    Raid = "raid",
    Unraid = "unraid",
    Timeout = "Timeout",
    Ban = "Ban",
    MessageDeleted = "MessageDeleted",
    ViewerMilestone = "ViewerMilestone",
    All = "all"
}
export declare enum TwitchMessageFlag {
    AggressiveContent = "aggressive",
    IdentityBasedHate = "identity-hate",
    ProfaneContent = "profane",
    SexualContent = "sexual"
}
export type ProcessedMessage = {
    type: TwitchEventType;
    data?: any;
    extra?: any;
};
export declare function processMessage(message: ParsedMessage): ProcessedMessage | null;
export declare function requestCapabilities(ws: WebSocket): void;
export declare function authenticate(ws: WebSocket, username?: string, password?: string): void;
export declare function joinChannel(ws: WebSocket, channel: string | string[]): void;
export declare function leaveChannel(ws: WebSocket, channel: string): void;
export declare function ping(ws: WebSocket): void;
export declare function pong(ws: WebSocket): void;
export declare function sendChat(ws: WebSocket, channel: string, message: string): void;
export declare function replyChat(ws: WebSocket, channel: string, messageId: string, message: string): void;
