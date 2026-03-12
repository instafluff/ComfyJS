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
    private boundBeforeUnload;
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
