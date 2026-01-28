// ═══════════════════════════════════════════════════════════════════════════
// COMFY.JS v2 - Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface ComfyJSConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Use EventSub for channel points, polls, etc. (default: true) */
  useEventSub?: boolean;
  /** P2P mode for multi-instance: 'auto' | 'leader' | 'follower' | 'disabled' */
  p2pMode?: 'auto' | 'leader' | 'follower' | 'disabled';
  /** Channels to join (alternative to channel parameter) */
  channels?: string[];
  /** Reconnect automatically on disconnect (default: true) */
  reconnect?: boolean;
  /** Max reconnect attempts (default: Infinity) */
  maxReconnectAttempts?: number;
  /** Reconnect delay in ms (default: 1000, doubles each attempt) */
  reconnectDelay?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// User & Flags
// ─────────────────────────────────────────────────────────────────────────────

export interface UserFlags {
  broadcaster: boolean;
  mod: boolean;
  vip: boolean;
  subscriber: boolean;
  founder: boolean;
  highlighted: boolean;
  customReward: boolean;
}

export interface UserExtra {
  // v1 compatibility: `id` is the message ID
  id: string;
  channel: string;
  roomId: string;
  messageType: string;
  messageEmotes?: Record<string, string[]>;
  isEmoteOnly: boolean;
  userId: string;
  username: string;
  displayName: string;
  userColor: string;
  userBadges: Record<string, string>;
  userState: Record<string, string>; // Full IRC tags
  customRewardId?: string;
  flags: string; // Message flags from Twitch (not UserFlags)
  timestamp: string;
  sinceLastCommand?: CommandTimestamp;
}

export interface CommandTimestamp {
  any: number;
  user: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub/Cheer Info
// ─────────────────────────────────────────────────────────────────────────────

export interface SubTierInfo {
  prime: boolean;
  plan: string;
  planName: string;
}

export interface SubGiftExtra extends UserExtra {
  recipientId: string;
  recipientUsername: string;
  recipientDisplayName: string;
}

export interface SubMysteryGiftExtra extends UserExtra {
  recipientCount: number;
  giftCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel Point Rewards
// ─────────────────────────────────────────────────────────────────────────────

export interface RewardExtra extends UserExtra {
  oderId: string;
  reward: string;
  rewardId: string;
  rewardPrompt: string;
  rewardCost: number;
  rewardImage: string;
  rewardBackgroundColor: string;
  status: 'unfulfilled' | 'fulfilled' | 'canceled';
}

export interface RewardInfo {
  title: string;
  cost: number;
  prompt?: string;
  isEnabled?: boolean;
  backgroundColor?: string;
  isUserInputRequired?: boolean;
  isMaxPerStreamEnabled?: boolean;
  maxPerStream?: number;
  isMaxPerUserPerStreamEnabled?: boolean;
  maxPerUserPerStream?: number;
  isGlobalCooldownEnabled?: boolean;
  globalCooldownSeconds?: number;
  shouldRedemptionsSkipRequestQueue?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hype Train
// ─────────────────────────────────────────────────────────────────────────────

export type HypeTrainEventType = 'start' | 'progress' | 'levelup' | 'end';

export interface HypeTrainExtra {
  level: number;
  progress: number;
  goal: number;
  total: number;
  topContributors: HypeTrainContributor[];
  lastContribution?: HypeTrainContributor;
  startedAt: string;
  expiresAt?: string;
  endedAt?: string;
}

export interface HypeTrainContributor {
  id: string;
  username: string;
  displayName: string;
  type: 'bits' | 'subscription';
  total: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Polls
// ─────────────────────────────────────────────────────────────────────────────

export type PollEventType = 'start' | 'progress' | 'end';

export interface PollChoice {
  id: string;
  title: string;
  votes: number;
  channelPointsVotes: number;
  bitsVotes: number;
}

export interface PollExtra {
  pollId: string;
  startedAt: string;
  endsAt?: string;
  endedAt?: string;
  status: 'active' | 'completed' | 'terminated' | 'archived';
  channelPointsVotingEnabled: boolean;
  channelPointsPerVote: number;
  bitsVotingEnabled: boolean;
  bitsPerVote: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Predictions
// ─────────────────────────────────────────────────────────────────────────────

export type PredictionEventType = 'start' | 'progress' | 'lock' | 'end';

export interface PredictionOutcome {
  id: string;
  title: string;
  color: 'blue' | 'pink';
  users: number;
  channelPoints: number;
  topPredictors: PredictionPredictor[];
}

export interface PredictionPredictor {
  id: string;
  username: string;
  displayName: string;
  channelPointsUsed: number;
  channelPointsWon?: number;
}

export interface PredictionExtra {
  predictionId: string;
  startedAt: string;
  locksAt?: string;
  lockedAt?: string;
  endedAt?: string;
  status: 'active' | 'locked' | 'resolved' | 'canceled';
  winningOutcomeId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Mode
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatModeFlags {
  emoteOnly: boolean;
  followersOnly: boolean;
  followersOnlyMinutes: number;
  slowMode: boolean;
  slowModeSeconds: number;
  subsOnly: boolean;
  r9k: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// IRC Message (Internal)
// ─────────────────────────────────────────────────────────────────────────────

export interface IRCMessage {
  raw: string;
  tags: Record<string, string>;
  prefix: string | null;
  nick: string | null;
  user: string | null;
  host: string | null;
  command: string;
  params: string[];
  channel: string | null;
  message: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// EventSub (Internal)
// ─────────────────────────────────────────────────────────────────────────────

export interface EventSubMessage {
  metadata: {
    message_id: string;
    message_type: 'session_welcome' | 'session_keepalive' | 'notification' | 'session_reconnect' | 'revocation';
    message_timestamp: string;
    subscription_type?: string;
    subscription_version?: string;
  };
  payload: {
    session?: EventSubSession;
    subscription?: EventSubSubscription;
    event?: Record<string, unknown>;
  };
}

export interface EventSubSession {
  id: string;
  status: 'connected' | 'reconnecting';
  connected_at: string;
  keepalive_timeout_seconds: number;
  reconnect_url: string | null;
}

export interface EventSubSubscription {
  id: string;
  status: string;
  type: string;
  version: string;
  cost: number;
  condition: Record<string, string>;
  transport: {
    method: 'websocket';
    session_id: string;
  };
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// P2P Signaling (Internal)
// ─────────────────────────────────────────────────────────────────────────────

export interface P2PSignal {
  type: 'discover' | 'leader' | 'heartbeat' | 'offer' | 'answer' | 'ice';
  instanceId: string;
  replyTo?: string;
  sdp?: string;
  candidate?: string;
}

export interface P2PEvent {
  type: 'event';
  name: string;
  args: unknown[];
  eventId: string;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────────

export type ComfyErrorCode = 
  | 'IRC_CONNECTION_FAILED'
  | 'IRC_AUTH_FAILED'
  | 'EVENTSUB_CONNECTION_FAILED'
  | 'EVENTSUB_CONNECTION_LIMIT'
  | 'EVENTSUB_SUBSCRIPTION_FAILED'
  | 'P2P_CONNECTION_FAILED'
  | 'API_ERROR'
  | 'UNKNOWN';

export interface ComfyError extends Error {
  code: ComfyErrorCode;
  details?: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Handler Types
// ─────────────────────────────────────────────────────────────────────────────

export type OnErrorHandler = (error: ComfyError, context?: string) => void;
export type OnConnectedHandler = (address: string, port: number, isFirstConnect: boolean) => void;
export type OnReconnectHandler = (reconnectCount: number) => void;
export type OnChatHandler = (user: string, message: string, flags: UserFlags, self: boolean, extra: UserExtra) => void;
export type OnCommandHandler = (user: string, command: string, message: string, flags: UserFlags, extra: UserExtra) => void;
export type OnWhisperHandler = (user: string, message: string, flags: UserFlags, self: boolean, extra: UserExtra) => void;
export type OnMessageDeletedHandler = (id: string, extra: UserExtra) => void;
export type OnBanHandler = (bannedUsername: string, extra: UserExtra) => void;
export type OnTimeoutHandler = (timedOutUsername: string, durationInSeconds: number, extra: UserExtra) => void;
export type OnJoinHandler = (user: string, self: boolean, extra: UserExtra) => void;
export type OnPartHandler = (user: string, self: boolean, extra: UserExtra) => void;
export type OnRaidHandler = (user: string, viewers: number, extra: UserExtra) => void;
export type OnSubHandler = (user: string, message: string, subTierInfo: SubTierInfo, extra: UserExtra) => void;
export type OnResubHandler = (user: string, message: string, streakMonths: number, cumulativeMonths: number, subTierInfo: SubTierInfo, extra: UserExtra) => void;
export type OnSubGiftHandler = (gifterUser: string, streakMonths: number, recipientUser: string, senderCount: number, subTierInfo: SubTierInfo, extra: SubGiftExtra) => void;
export type OnSubMysteryGiftHandler = (gifterUser: string, numbOfSubs: number, senderCount: number, subTierInfo: SubTierInfo, extra: SubMysteryGiftExtra) => void;
export type OnGiftSubContinueHandler = (user: string, sender: string, extra: UserExtra) => void;
export type OnCheerHandler = (user: string, message: string, bits: number, flags: UserFlags, extra: UserExtra) => void;
export type OnChatModeHandler = (flags: ChatModeFlags, channel: string) => void;
export type OnRewardHandler = (user: string, reward: string, cost: number, message: string, extra: RewardExtra) => void;
export type OnShoutoutHandler = (channelDisplayName: string, viewerCount: number, extra: UserExtra) => void;
export type OnHypeTrainHandler = (type: HypeTrainEventType, level: number, progress: number, goal: number, total: number, extra: HypeTrainExtra) => void;
export type OnPollHandler = (type: PollEventType, title: string, choices: PollChoice[], extra: PollExtra) => void;
export type OnPredictionHandler = (type: PredictionEventType, title: string, outcomes: PredictionOutcome[], extra: PredictionExtra) => void;

// v2 New Events
export type OnFollowHandler = (user: string, extra: UserExtra) => void;
export type OnStreamOnlineHandler = (channel: string, extra: { startedAt: string; type: string }) => void;
export type OnStreamOfflineHandler = (channel: string, extra: Record<string, unknown>) => void;
export type OnModAddHandler = (user: string, extra: UserExtra) => void;
export type OnModRemoveHandler = (user: string, extra: UserExtra) => void;
export type OnVIPAddHandler = (user: string, extra: UserExtra) => void;
export type OnVIPRemoveHandler = (user: string, extra: UserExtra) => void;
// ─────────────────────────────────────────────────────────────────────────────
// Type Aliases for Backward Compatibility
// ─────────────────────────────────────────────────────────────────────────────

export type ErrorHandler = (error: Error | ComfyError) => void;
export type ConnectedHandler = OnConnectedHandler;
export type ReconnectHandler = OnReconnectHandler;
export type ChatHandler = OnChatHandler;
export type CommandHandler = OnCommandHandler;
export type WhisperHandler = OnWhisperHandler;
export type MessageDeletedHandler = OnMessageDeletedHandler;
export type BanHandler = (bannedUsername: string, extra: Record<string, unknown>) => void;
export type TimeoutHandler = (timedOutUsername: string, durationInSeconds: number, extra: Record<string, unknown>) => void;
export type JoinHandler = (user: string, self: boolean, extra: Record<string, unknown>) => void;
export type PartHandler = (user: string, self: boolean, extra: Record<string, unknown>) => void;
export type RaidHandler = OnRaidHandler;
export type SubHandler = OnSubHandler;
export type ResubHandler = OnResubHandler;
export type SubGiftHandler = OnSubGiftHandler;
export type SubMysteryGiftHandler = OnSubMysteryGiftHandler;
export type GiftSubContinueHandler = OnGiftSubContinueHandler;
export type CheerHandler = OnCheerHandler;
export type ChatModeHandler = (modes: Record<string, boolean>, channel: string) => void;
export type RewardHandler = (user: string, reward: string, cost: number, message: string, extra: Record<string, unknown>) => void;
export type ShoutoutHandler = (channelDisplayName: string, viewerCount: number, timeRemaining: number, extra: Record<string, unknown>) => void;
export type HypeTrainHandler = (type: string, level: number, progress: number, goal: number, total: number, timeRemaining: number, extra: Record<string, unknown>) => void;
export type PollHandler = (type: string, title: string, choices: string[], votes: number[], timeRemaining: number, extra: Record<string, unknown>) => void;
export type PredictionHandler = (type: string, title: string, outcomes: string[], topPredictors: unknown[][], timeRemaining: number, extra: Record<string, unknown>) => void;

// ─────────────────────────────────────────────────────────────────────────────
// EventSub Notification
// ─────────────────────────────────────────────────────────────────────────────

export interface EventSubNotification {
  subscriptionType: string;
  subscriptionVersion: string;
  event: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// ComfyJS Instance Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface ComfyJSInstance {
  isDebug: boolean;
  useEventSub: boolean;
  chatModes: Record<string, Record<string, boolean>>;

  // Event Handlers
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
  onConnected: ConnectedHandler;
  onReconnect: ReconnectHandler;

  // Methods
  version(): string;
  p2pRole(): 'leader' | 'follower' | 'standalone' | null;
  p2pId(): string | null;
  p2pFollowerCount(): number;
  Init(username: string, password?: string, channels?: string | string[], isDebug?: boolean): Promise<void>;
  Disconnect(): void;
  Say(message: string, channel?: string): boolean;
  Reply(parentId: string, message: string, channel?: string): boolean;
  Whisper(message: string, user: string): boolean;
  Announce(message: string, channel?: string, color?: string): boolean;
  DeleteMessage(id: string, channel?: string): boolean;
  GetClient(): unknown;
  GetChannelRewards(clientId: string, manageableOnly?: boolean): Promise<unknown[]>;
  CreateChannelReward(clientId: string, rewardInfo: unknown): Promise<unknown>;
  UpdateChannelReward(clientId: string, rewardId: string, rewardInfo: unknown): Promise<unknown>;
  DeleteChannelReward(clientId: string, rewardId: string): Promise<string>;
}