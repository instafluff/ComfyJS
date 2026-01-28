import type { IRCMessage, P2PSignal } from './types';
export interface IRCClientOptions {
    debug?: boolean;
    reconnect?: boolean;
    maxReconnectAttempts?: number;
}
export type IRCEventHandler = (message: IRCMessage) => void;
export type IRCSignalHandler = (signal: P2PSignal) => void;
export declare class IRCClient {
    private ws;
    private oauth;
    private nick;
    private channels;
    private options;
    private isConnected;
    private isConnecting;
    private reconnectCount;
    private reconnectTimer;
    private msgTimestamps;
    private joinTimestamps;
    private isMod;
    onMessage: IRCEventHandler | null;
    onSignal: IRCSignalHandler | null;
    onConnected: ((isFirstConnect: boolean) => void) | null;
    onDisconnected: ((reason: string) => void) | null;
    onReconnecting: ((attempt: number) => void) | null;
    constructor(options?: IRCClientOptions);
    connect(oauth: string, nick: string): Promise<void>;
    disconnect(): void;
    private authenticate;
    private handleRawMessage;
    private handleClose;
    private scheduleReconnect;
    private clearReconnectTimer;
    join(channel: string): Promise<void>;
    part(channel: string): void;
    private rejoinChannels;
    say(channel: string, message: string): Promise<void>;
    reply(channel: string, parentId: string, message: string): Promise<void>;
    /**
     * Send a P2P signal message (invisible to users)
     */
    sendSignal(channel: string, signal: P2PSignal): void;
    private escapeTagValue;
    private sendRaw;
    private canSendMessage;
    private waitForMessageSlot;
    private canJoin;
    private waitForJoinSlot;
    /**
     * Call this when we detect we're a mod in a channel (for rate limit adjustment)
     */
    setModStatus(channel: string, isMod: boolean): void;
    get connected(): boolean;
    get username(): string;
    private log;
}
