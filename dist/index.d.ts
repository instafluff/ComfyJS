import type { ComfyJSInstance, CommandHandler, ChatHandler, WhisperHandler, JoinHandler, PartHandler, RaidHandler, SubHandler, ResubHandler, SubGiftHandler, SubMysteryGiftHandler, GiftSubContinueHandler, CheerHandler, RewardHandler, HypeTrainHandler, PollHandler, PredictionHandler, ShoutoutHandler, MessageDeletedHandler, BanHandler, TimeoutHandler, ChatModeHandler, ErrorHandler, ConnectedHandler, ReconnectHandler, RawMessageHandler, UserExtra } from './types';
import { IRCClient } from './irc';
declare class ComfyJSImpl implements ComfyJSInstance {
    isDebug: boolean;
    useEventSub: boolean;
    chatModes: Record<string, Record<string, boolean>>;
    private irc;
    private eventSub;
    private p2p;
    private api;
    private mainChannel;
    private password;
    private clientId;
    private userId;
    private channelId;
    private scopes;
    private isFirstConnect;
    private eventSubStarting;
    private boundBeforeUnload;
    private seenEvents;
    private seenEventOrder;
    onError: ErrorHandler;
    onCommand: CommandHandler;
    onChat: ChatHandler;
    onWhisper: WhisperHandler;
    onMessageDeleted: MessageDeletedHandler;
    onBan: BanHandler;
    onTimeout: TimeoutHandler;
    onJoin: JoinHandler;
    onPart: PartHandler;
    onHosted: (user: string, viewers: number, autohost: boolean, extra: UserExtra) => void;
    onRaid: RaidHandler;
    onSub: SubHandler;
    onResub: ResubHandler;
    onSubGift: SubGiftHandler;
    onSubMysteryGift: SubMysteryGiftHandler;
    onGiftSubContinue: GiftSubContinueHandler;
    onCheer: CheerHandler;
    onChatMode: ChatModeHandler;
    onReward: RewardHandler;
    onShoutout: ShoutoutHandler;
    onHypeTrain: HypeTrainHandler;
    onPoll: PollHandler;
    onPrediction: PredictionHandler;
    onRawMessage: RawMessageHandler;
    onConnected: ConnectedHandler;
    onReconnect: ReconnectHandler;
    /**
     * EventSub lifecycle status callback.
     * Fired for: cleanup, subscription success/failure, P2P role, connection status.
     * Games/diagnostics can hook this to track what's happening with channel points.
     */
    onEventSubStatus: ((event: string, detail: string, data?: Record<string, unknown>) => void);
    /**
     * Message received from another browser source of the same channel.
     * Paired with Broadcast(); used to coordinate work between overlays that
     * run side by side in OBS.
     */
    onBroadcast: ((payload: unknown, fromId: string) => void);
    version(): string;
    Init(username: string, password?: string, channels?: string | string[], isDebug?: boolean): Promise<void>;
    Disconnect(): void;
    Say(message: string, channel?: string): boolean;
    Reply(parentId: string, message: string, channel?: string): boolean;
    Whisper(_message: string, _user: string): boolean;
    Announce(message: string, channel?: string, _color?: string): boolean;
    DeleteMessage(id: string, _channel?: string): boolean;
    GetClient(): IRCClient | null;
    GetChannelRewards(clientId: string, manageableOnly?: boolean): Promise<unknown[]>;
    CreateChannelReward(clientId: string, rewardInfo: unknown): Promise<unknown>;
    UpdateChannelReward(clientId: string, rewardId: string, rewardInfo: unknown): Promise<unknown>;
    DeleteChannelReward(clientId: string, rewardId: string): Promise<string>;
    /**
     * Resolve a pending redemption. `CANCELED` refunds the points to the viewer.
     *
     * Requires the channel:manage:redemptions scope, a reward created by this
     * client id, and a reward configured with
     * should_redemptions_skip_request_queue: false — Twitch auto-fulfills
     * skip-the-queue redemptions and refuses to change them afterwards.
     */
    UpdateRedemptionStatus(rewardId: string, redemptionId: string, status: 'FULFILLED' | 'CANCELED'): Promise<unknown>;
    /** Refund a redemption's channel points to the viewer. */
    RefundRedemption(rewardId: string, redemptionId: string): Promise<unknown>;
    /** Mark a redemption as completed so it leaves the streamer's queue. */
    FulfillRedemption(rewardId: string, redemptionId: string): Promise<unknown>;
    /**
     * Send a message to the other browser sources running the same channel.
     * Delivered over the same BroadcastChannel used to relay EventSub events.
     */
    Broadcast(payload: unknown): boolean;
    private validateToken;
    private setupIRCHandlers;
    private handleIRCMessage;
    private handlePrivmsg;
    private handleWhisper;
    private handleClearChat;
    private handleClearMsg;
    private handleRoomState;
    private handleUserNotice;
    private handleJoin;
    private handlePart;
    private initializeP2P;
    private initializeEventSub;
    /**
     * Delete stale EventSub subscriptions (websocket_disconnected, etc.)
     * that linger after page refreshes and eat into the cost limit.
     */
    private cleanupStaleSubscriptions;
    private subscribeToScopedEvents;
    private handleEventSubNotification;
    private handleRewardEvent;
    private handleHypeTrainEvent;
    private handleShoutoutEvent;
    private handleWhisperEvent;
    private handlePollEvent;
    private handlePredictionEvent;
    /**
     * Get the P2P coordination role
     */
    p2pRole(): 'leader' | 'follower' | 'standalone' | null;
    /**
     * Get this instance's P2P ID
     */
    p2pId(): string | null;
    /**
     * Get the number of connected followers (leader only)
     */
    p2pFollowerCount(): number;
    private emitEventSubStatus;
    /**
     * Returns true the first time an event is seen. Redemptions are keyed on the
     * redemption id so they still deduplicate across two EventSub sessions;
     * everything else falls back to the per-message id, which catches Twitch's
     * own retransmissions.
     */
    private markEventSeen;
    private log;
}
declare const ComfyJS: ComfyJSImpl;
export default ComfyJS;
export { ComfyJS };
export type { ComfyJSInstance, ComfyJSConfig, UserFlags, UserExtra, IRCMessage, SubTierInfo, CommandHandler, ChatHandler, RewardHandler, } from './types';
export type { EventSubNotification } from './eventsub';
export { IRCClient } from './irc';
export { EventSubClient, EventSubTypes } from './eventsub';
export { P2PCoordinator } from './p2p';
export { TwitchAPI } from './api';
