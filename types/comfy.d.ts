import { TwitchEvents } from ".";
export type ComfyJSInstance = {
    version: () => string;
    latency: () => number;
    getInstance: () => TwitchEvents | undefined;
    onConnected: (address: string, port: number, isFirstConnect: boolean) => void;
    onReconnect: (reconnectCount: number) => void;
    onError: (error: Error) => void;
    onCommand: (user: string, command: string, message: string, flags: any, extra: any) => void;
    onChat: (user: string, message: string, flags: any, self: boolean, extra: any) => void;
    onWhisper: (user: string, message: string, flags: any, self: boolean, extra: any) => void;
    onCheer: (user: string, message: string, bits: number, flags: any, extra: any) => void;
    onSub: (user: string, message: string, subTierInfo: any, extra: any) => void;
    onResub: (user: string, message: string, streamMonths: number, cumulativeMonths: number, subTierInfo: any, extra: any) => void;
    onSubGift: (gifterUser: string, streakMonths: number, recipientUser: string, senderCount: number, subTierInfo: any, extra: any) => void;
    onSubMysteryGift: (gifterUser: string, numbOfSubs: number, senderCount: number, subTierInfo: any, extra: any) => void;
    onGiftSubContinue: (user: string, sender: string, extra: any) => void;
    onTimeout: (user: string, duration: number, extra: any) => void;
    onBan: (user: string, extra: any) => void;
    onMessageDeleted: (messageId: string, extra: any) => void;
    onRaid: (user: string, viewers: number, extra: any) => void;
    onUnraid: (channel: string, extra: any) => void;
    simulateIRCMessage: (message: string) => void;
    Init: (username: string, password?: string, channels?: string[] | string, isDebug?: boolean) => void;
};
declare global {
    interface Window {
        ComfyJS: ComfyJSInstance;
        ComfyJSv2: ComfyJSInstance;
    }
}
export * from "./index";
export * from "./parseFast";
export * from "./twitch";
