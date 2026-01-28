import type { EventSubSubscription } from './types';
export interface EventSubNotification {
    subscriptionType: string;
    subscriptionVersion: string;
    event: Record<string, unknown>;
}
export interface EventSubClientOptions {
    debug?: boolean;
    reconnect?: boolean;
    maxReconnectAttempts?: number;
}
export interface EventSubConnectionInfo {
    sessionId: string;
    connectedAt: Date;
    subscriptionCount: number;
}
export type EventSubHandler = (event: EventSubNotification) => void;
export declare class EventSubClient {
    private ws;
    private options;
    private sessionId;
    private isConnected;
    private isConnecting;
    private reconnectCount;
    private reconnectTimer;
    private keepaliveTimeoutMs;
    private keepaliveTimer;
    private subscriptions;
    private pendingSubscriptions;
    createSubscription: ((sessionId: string, type: string, version: string, condition: Record<string, string>) => Promise<EventSubSubscription>) | null;
    onEvent: EventSubHandler | null;
    onConnected: ((sessionId: string, isFirstConnect: boolean) => void) | null;
    onDisconnected: ((reason: string) => void) | null;
    onReconnecting: ((attempt: number) => void) | null;
    constructor(options?: EventSubClientOptions);
    connect(): Promise<string>;
    disconnect(): void;
    private handleMessage;
    private handleWelcome;
    private handleNotification;
    private handleReconnect;
    private handleRevocation;
    private handleClose;
    private resetKeepaliveTimer;
    private clearKeepaliveTimer;
    private scheduleReconnect;
    private clearReconnectTimer;
    subscribe(type: string, version: string, condition: Record<string, string>): Promise<EventSubSubscription>;
    private processPendingSubscriptions;
    private resubscribeAll;
    registerSubscription(sub: EventSubSubscription): void;
    unregisterSubscription(id: string): void;
    get connected(): boolean;
    get session(): string;
    get subscriptionCount(): number;
    getConnectionInfo(): EventSubConnectionInfo | null;
    private log;
}
export declare const EventSubTypes: {
    readonly CHANNEL_POINTS_REDEMPTION: "channel.channel_points_custom_reward_redemption.add";
    readonly CHANNEL_POINTS_REDEMPTION_UPDATE: "channel.channel_points_custom_reward_redemption.update";
    readonly POLL_BEGIN: "channel.poll.begin";
    readonly POLL_PROGRESS: "channel.poll.progress";
    readonly POLL_END: "channel.poll.end";
    readonly PREDICTION_BEGIN: "channel.prediction.begin";
    readonly PREDICTION_PROGRESS: "channel.prediction.progress";
    readonly PREDICTION_LOCK: "channel.prediction.lock";
    readonly PREDICTION_END: "channel.prediction.end";
    readonly HYPE_TRAIN_BEGIN: "channel.hype_train.begin";
    readonly HYPE_TRAIN_PROGRESS: "channel.hype_train.progress";
    readonly HYPE_TRAIN_END: "channel.hype_train.end";
    readonly SUBSCRIBE: "channel.subscribe";
    readonly SUBSCRIPTION_END: "channel.subscription.end";
    readonly SUBSCRIPTION_GIFT: "channel.subscription.gift";
    readonly SUBSCRIPTION_MESSAGE: "channel.subscription.message";
    readonly CHEER: "channel.cheer";
    readonly RAID: "channel.raid";
    readonly FOLLOW: "channel.follow";
    readonly STREAM_ONLINE: "stream.online";
    readonly STREAM_OFFLINE: "stream.offline";
    readonly BAN: "channel.ban";
    readonly UNBAN: "channel.unban";
    readonly MODERATOR_ADD: "channel.moderator.add";
    readonly MODERATOR_REMOVE: "channel.moderator.remove";
    readonly GOAL_BEGIN: "channel.goal.begin";
    readonly GOAL_PROGRESS: "channel.goal.progress";
    readonly GOAL_END: "channel.goal.end";
    readonly SHOUTOUT_CREATE: "channel.shoutout.create";
    readonly SHOUTOUT_RECEIVE: "channel.shoutout.receive";
};
