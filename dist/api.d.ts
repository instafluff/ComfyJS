import type { EventSubSubscription } from './types';
export interface TwitchAPIOptions {
    clientId: string;
    accessToken: string;
    debug?: boolean;
}
export interface TwitchUser {
    id: string;
    login: string;
    displayName: string;
    type: string;
    broadcasterType: string;
    description: string;
    profileImageUrl: string;
    offlineImageUrl: string;
    createdAt: string;
}
export interface TwitchChannel {
    broadcasterId: string;
    broadcasterLogin: string;
    broadcasterName: string;
    gameId: string;
    gameName: string;
    title: string;
    delay: number;
    tags: string[];
    language: string;
}
export declare class TwitchAPI {
    private clientId;
    private accessToken;
    private debug;
    constructor(options: TwitchAPIOptions);
    private request;
    private get;
    private post;
    private delete;
    getUsers(logins?: string[], ids?: string[]): Promise<TwitchUser[]>;
    getCurrentUser(): Promise<TwitchUser | null>;
    getUserByLogin(login: string): Promise<TwitchUser | null>;
    getUserById(id: string): Promise<TwitchUser | null>;
    getChannelInfo(broadcasterId: string): Promise<TwitchChannel | null>;
    createEventSubSubscription(sessionId: string, type: string, version: string, condition: Record<string, string>): Promise<EventSubSubscription>;
    deleteEventSubSubscription(id: string): Promise<void>;
    getEventSubSubscriptions(): Promise<{
        subscriptions: EventSubSubscription[];
        total: number;
        totalCost: number;
        maxTotalCost: number;
    }>;
    getChatters(broadcasterId: string, moderatorId: string): Promise<{
        users: Array<{
            userId: string;
            userLogin: string;
            userName: string;
        }>;
        total: number;
    }>;
    banUser(broadcasterId: string, moderatorId: string, userId: string, reason?: string, duration?: number): Promise<void>;
    unbanUser(broadcasterId: string, moderatorId: string, userId: string): Promise<void>;
    deleteMessage(broadcasterId: string, moderatorId: string, messageId: string): Promise<void>;
    validateToken(): Promise<{
        clientId: string;
        login: string;
        userId: string;
        scopes: string[];
        expiresIn: number;
    } | null>;
    setToken(accessToken: string): void;
    private log;
}
