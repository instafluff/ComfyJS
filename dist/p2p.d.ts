import type { EventSubNotification } from './eventsub';
export type P2PRole = 'leader' | 'follower' | 'standalone';
export interface P2PCoordinatorOptions {
    debug?: boolean;
    channel: string;
}
export declare class P2PCoordinator {
    private instanceId;
    private role;
    private channel;
    private options;
    private peerConnections;
    private dataChannels;
    private currentLeaderId;
    private heartbeatTimer;
    private pollTimer;
    private connectingPeers;
    private electing;
    private appliedIce;
    private unloadListener;
    onEvent: ((event: EventSubNotification) => void) | null;
    onRoleChange: ((role: P2PRole) => void) | null;
    onFollowerConnected: ((instanceId: string) => void) | null;
    onFollowerDisconnected: ((instanceId: string) => void) | null;
    onAppMessage: ((payload: unknown, fromId: string) => void) | null;
    constructor(options: P2PCoordinatorOptions);
    private get leaderKey();
    private get peerPrefix();
    private peerKey;
    private get offerPrefix();
    private offerKey;
    initialize(): Promise<P2PRole>;
    private tryBecomeLeader;
    private runElection;
    private becomeFollower;
    private startPolling;
    private stopPolling;
    private leaderPoll;
    private followerPoll;
    private touchOwnPeerEntry;
    private initiateConnectionToPeer;
    private handlePeerAnswer;
    private processFollowerIceCandidates;
    private handleLeaderOffer;
    private processLeaderIceCandidates;
    /** Returns true the first time a candidate is seen for a peer. */
    private markIceApplied;
    private createPeerConnection;
    private addIceCandidateToStorage;
    private setupDataChannel;
    private cleanupPeer;
    private closeAllConnections;
    private promoteToLeader;
    private startHeartbeat;
    private stopHeartbeat;
    private isLeaderAlive;
    broadcastEvent(event: EventSubNotification): void;
    /**
     * Send an application-level message to the other browser sources. Followers
     * send to the leader, which relays it on to everyone else.
     */
    sendAppMessage(payload: unknown): void;
    private sendToChannels;
    private isLocalStorageAvailable;
    private getStorageItem;
    private setStorageItem;
    private removeStorageItem;
    private getLeader;
    private getAllPeerEntries;
    private cleanupStaleEntries;
    private registerUnloadHandler;
    get currentRole(): P2PRole;
    get isLeader(): boolean;
    get followerCount(): number;
    get id(): string;
    destroy(): void;
    private generateInstanceId;
    private delay;
    private log;
}
