// ═══════════════════════════════════════════════════════════════════════════
// COMFY.JS v2 - Main Entry Point
// ═══════════════════════════════════════════════════════════════════════════
//
// Backward compatible with v1 API while providing TypeScript support and
// solving the multi-instance EventSub limit problem.
//
// ═══════════════════════════════════════════════════════════════════════════

import type {
  ComfyJSInstance,
  IRCMessage,
  CommandHandler,
  ChatHandler,
  WhisperHandler,
  JoinHandler,
  PartHandler,
  RaidHandler,
  SubHandler,
  ResubHandler,
  SubGiftHandler,
  SubMysteryGiftHandler,
  GiftSubContinueHandler,
  CheerHandler,
  RewardHandler,
  HypeTrainHandler,
  PollHandler,
  PredictionHandler,
  ShoutoutHandler,
  MessageDeletedHandler,
  BanHandler,
  TimeoutHandler,
  ChatModeHandler,
  ErrorHandler,
  ConnectedHandler,
  ReconnectHandler,
  RawMessageHandler,
  UserExtra,
} from './types';

import type { EventSubNotification } from './eventsub';

import { IRCClient } from './irc';
import { EventSubClient } from './eventsub';
import { P2PCoordinator } from './p2p';
import { TwitchAPI } from './api';
import { parseUserFlags, buildUserExtra, parseCommand, parseSubTier } from './parsers';

// ─────────────────────────────────────────────────────────────────────────────
// Version
// ─────────────────────────────────────────────────────────────────────────────

const VERSION = '2.0.0';

// ─────────────────────────────────────────────────────────────────────────────
// Timestamp Store (for command cooldowns)
// ─────────────────────────────────────────────────────────────────────────────

interface TimestampStore {
  global: Record<string, Date>;
  users: Record<string, Record<string, Date>>;
}

const timestamps: TimestampStore = {
  global: {},
  users: {},
};

function getTimePeriod(command: string | null, userId: string | null): { any: number | null; user: number | null } {
  if (!command) {
    return { any: null, user: null };
  }

  const now = new Date();
  const result: { any: number | null; user: number | null } = { any: 0, user: null };

  if (timestamps.global[command]) {
    result.any = now.getTime() - timestamps.global[command].getTime();
  }
  timestamps.global[command] = now;

  if (userId) {
    if (!timestamps.users[userId]) {
      timestamps.users[userId] = {};
    }
    if (timestamps.users[userId][command]) {
      result.user = now.getTime() - timestamps.users[userId][command].getTime();
    } else {
      result.user = 0;
    }
    timestamps.users[userId][command] = now;
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scope to EventSub Mapping
// ─────────────────────────────────────────────────────────────────────────────

const SCOPE_TO_EVENTSUB: Record<string, string[]> = {
  'moderator:read:followers': [['channel.follow', '2']],
  'channel:read:redemptions': [
    ['channel.channel_points_automatic_reward_redemption.add', '1'],
    ['channel.channel_points_custom_reward_redemption.add', '1'],
  ],
  'channel:manage:redemptions': [
    ['channel.channel_points_automatic_reward_redemption.add', '1'],
    ['channel.channel_points_custom_reward_redemption.add', '1'],
  ],
  'channel:read:hype_train': [
    ['channel.hype_train.begin', '1'],
    ['channel.hype_train.progress', '1'],
    ['channel.hype_train.end', '1'],
  ],
  'moderator:read:shoutouts': [['channel.shoutout.create', '1']],
  'user:read:whispers': [['user.whisper.message', '1']],
  'channel:read:polls': [
    ['channel.poll.begin', '1'],
    ['channel.poll.progress', '1'],
    ['channel.poll.end', '1'],
  ],
  'channel:read:predictions': [
    ['channel.prediction.begin', '1'],
    ['channel.prediction.progress', '1'],
    ['channel.prediction.lock', '1'],
    ['channel.prediction.end', '1'],
  ],
} as unknown as Record<string, string[]>;

// ─────────────────────────────────────────────────────────────────────────────
// ComfyJS Instance
// ─────────────────────────────────────────────────────────────────────────────

class ComfyJSImpl implements ComfyJSInstance {
  // State
  isDebug = false;
  useEventSub = true;
  chatModes: Record<string, Record<string, boolean>> = {};

  // Internal
  private irc: IRCClient | null = null;
  private eventSub: EventSubClient | null = null;
  private p2p: P2PCoordinator | null = null;
  private api: TwitchAPI | null = null;
  
  private mainChannel = '';
  private password = '';
  private clientId = '';
  private userId = '';
  private channelId = '';
  private scopes: string[] = [];
  
  private isFirstConnect = true;

  // ─────────────────────────────────────────────────────────────────────────
  // Event Handlers (with default implementations)
  // ─────────────────────────────────────────────────────────────────────────

  onError: ErrorHandler = (error: Error) => {
    console.error('Error:', error);
  };

  onCommand: CommandHandler = () => {
    if (this.isDebug) console.log('onCommand default handler');
  };

  onChat: ChatHandler = () => {
    if (this.isDebug) console.log('onChat default handler');
  };

  onWhisper: WhisperHandler = () => {
    if (this.isDebug) console.log('onWhisper default handler');
  };

  onMessageDeleted: MessageDeletedHandler = () => {
    if (this.isDebug) console.log('onMessageDeleted default handler');
  };

  onBan: BanHandler = () => {
    if (this.isDebug) console.log('onBan default handler');
  };

  onTimeout: TimeoutHandler = () => {
    if (this.isDebug) console.log('onTimeout default handler');
  };

  onJoin: JoinHandler = () => {
    if (this.isDebug) console.log('onJoin default handler');
  };

  onPart: PartHandler = () => {
    if (this.isDebug) console.log('onPart default handler');
  };

  onHosted: (user: string, viewers: number, autohost: boolean, extra: UserExtra) => void = () => {
    if (this.isDebug) console.log('onHosted default handler');
  };

  onRaid: RaidHandler = () => {
    if (this.isDebug) console.log('onRaid default handler');
  };

  onSub: SubHandler = () => {
    if (this.isDebug) console.log('onSub default handler');
  };

  onResub: ResubHandler = () => {
    if (this.isDebug) console.log('onResub default handler');
  };

  onSubGift: SubGiftHandler = () => {
    if (this.isDebug) console.log('onSubGift default handler');
  };

  onSubMysteryGift: SubMysteryGiftHandler = () => {
    if (this.isDebug) console.log('onSubMysteryGift default handler');
  };

  onGiftSubContinue: GiftSubContinueHandler = () => {
    if (this.isDebug) console.log('onGiftSubContinue default handler');
  };

  onCheer: CheerHandler = () => {
    if (this.isDebug) console.log('onCheer default handler');
  };

  onChatMode: ChatModeHandler = () => {
    if (this.isDebug) console.log('onChatMode default handler');
  };

  onReward: RewardHandler = () => {
    if (this.isDebug) console.log('onReward default handler');
  };

  onShoutout: ShoutoutHandler = () => {
    if (this.isDebug) console.log('onShoutout default handler');
  };

  onHypeTrain: HypeTrainHandler = () => {
    if (this.isDebug) console.log('onHypeTrain default handler');
  };

  onPoll: PollHandler = () => {
    if (this.isDebug) console.log('onPoll default handler');
  };

  onPrediction: PredictionHandler = () => {
    if (this.isDebug) console.log('onPrediction default handler');
  };

  onRawMessage: RawMessageHandler = () => {};

  onConnected: ConnectedHandler = () => {};

  onReconnect: ReconnectHandler = () => {};

  // ─────────────────────────────────────────────────────────────────────────
  // Public Methods
  // ─────────────────────────────────────────────────────────────────────────

  version(): string {
    return VERSION;
  }

  async Init(
    username: string,
    password?: string,
    channels?: string | string[],
    isDebug?: boolean
  ): Promise<void> {
    // Normalize channels
    let channelList: string[];
    if (!channels) {
      channelList = [username];
    } else if (typeof channels === 'string') {
      channelList = [channels];
    } else if (Array.isArray(channels)) {
      channelList = channels;
    } else {
      throw new Error('Channels is not an array');
    }

    this.isDebug = isDebug ?? false;
    this.mainChannel = channelList[0].toLowerCase().replace('#', '');
    this.password = password?.replace('oauth:', '') ?? '';

    // Validate token and get scopes + actual login
    let authenticatedLogin = '';
    if (this.password) {
      const validation = await this.validateToken(this.password);
      if (!validation) {
        throw new Error('Invalid OAuth token');
      }
      this.clientId = validation.clientId;
      this.userId = validation.userId;
      this.scopes = validation.scopes;
      authenticatedLogin = validation.login; // The actual username from the token

      // Initialize API client
      this.api = new TwitchAPI({
        clientId: this.clientId,
        accessToken: this.password,
        debug: this.isDebug,
      });

      // Get channel ID
      const user = await this.api.getUserByLogin(this.mainChannel);
      if (user) {
        this.channelId = user.id;
      }
    }

    // Initialize IRC client
    this.irc = new IRCClient({ debug: this.isDebug });
    this.setupIRCHandlers();

    // Connect to IRC
    // For authenticated connections, use the actual login from the token (not the username param)
    // For anonymous connections, use justinfan username
    const ircUsername = this.password ? authenticatedLogin : `justinfan${Math.floor(Math.random() * 99999)}`;
    const ircPassword = this.password || 'SCHMOOPIIE';
    await this.irc.connect(ircPassword, ircUsername);

    // Join channels
    for (const channel of channelList) {
      await this.irc.join(channel);
    }

    // Initialize P2P coordination (non-blocking — don't let P2P failure block IRC)
    this.initializeP2P().then(async () => {
      // Initialize EventSub if we have auth and are the leader
      if (this.password && this.useEventSub && (this.p2p?.isLeader || this.p2p?.currentRole === 'standalone')) {
        await this.initializeEventSub();
      }
    }).catch((e) => {
      if (this.isDebug) console.warn('P2P/EventSub initialization failed:', e);
    });
  }

  Disconnect(): void {
    this.p2p?.destroy();
    this.eventSub?.disconnect();
    this.irc?.disconnect();
    
    this.p2p = null;
    this.eventSub = null;
    this.irc = null;
  }

  Say(message: string, channel?: string): boolean {
    if (!this.irc) return false;
    
    const targetChannel = channel ?? this.mainChannel;
    this.irc.say(targetChannel, message).catch(this.onError);
    
    // Simulate echo like tmi.js does - trigger onChat with self=true
    // This mimics v1 behavior where messages sent via Say() are echoed back
    const selfFlags = {
      broadcaster: false,
      mod: false,
      vip: false,
      subscriber: false,
      founder: false,
      highlighted: false,
      customReward: false,
    };
    const selfExtra = {
      id: '',
      channel: targetChannel,
      roomId: '',
      messageType: 'chat',
      messageEmotes: undefined,
      isEmoteOnly: false,
      userId: this.userId,
      username: this.irc.username,
      displayName: this.irc.username,
      userColor: '',
      userBadges: {},
      userState: {},
      customRewardId: undefined,
      flags: '',
      timestamp: String(Date.now()),
    };
    this.onChat(this.irc.username, message, selfFlags, true, selfExtra as never);
    
    return true;
  }

  Reply(parentId: string, message: string, channel?: string): boolean {
    if (!this.irc) return false;
    
    const targetChannel = channel ?? this.mainChannel;
    this.irc.reply(targetChannel, parentId, message).catch(this.onError);
    return true;
  }

  Whisper(_message: string, _user: string): boolean {
    // Whispers are deprecated via IRC, would need API
    console.warn('Whisper via IRC is deprecated. Use Twitch API instead.');
    return false;
  }

  Announce(message: string, channel?: string, _color?: string): boolean {
    if (!this.irc) return false;
    
    const targetChannel = channel ?? this.mainChannel;
    this.irc.say(targetChannel, `/announce ${message}`).catch(this.onError);
    return true;
  }

  DeleteMessage(id: string, _channel?: string): boolean {
    if (!this.irc || !this.api) return false;
    
    this.api.deleteMessage(this.channelId, this.userId, id).catch(this.onError);
    return true;
  }

  GetClient(): IRCClient | null {
    return this.irc;
  }

  async GetChannelRewards(clientId: string, manageableOnly = false): Promise<unknown[]> {
    if (!this.password || !this.api) return [];
    
    // Use API to get rewards
    try {
      const response = await fetch(
        `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${this.channelId}&only_manageable_rewards=${manageableOnly}`,
        {
          headers: {
            'Client-ID': clientId || this.clientId,
            'Authorization': `Bearer ${this.password}`,
          },
        }
      );
      const data = await response.json() as { data: unknown[] };
      return data.data || [];
    } catch {
      return [];
    }
  }

  async CreateChannelReward(clientId: string, rewardInfo: unknown): Promise<unknown> {
    if (!this.password) throw new Error('Missing Channel Password');
    
    const response = await fetch(
      `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${this.channelId}`,
      {
        method: 'POST',
        headers: {
          'Client-ID': clientId || this.clientId,
          'Authorization': `Bearer ${this.password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rewardInfo),
      }
    );
    const data = await response.json() as { data: unknown[] };
    return data.data[0];
  }

  async UpdateChannelReward(clientId: string, rewardId: string, rewardInfo: unknown): Promise<unknown> {
    if (!this.password) throw new Error('Missing Channel Password');
    
    const response = await fetch(
      `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${this.channelId}&id=${rewardId}`,
      {
        method: 'PATCH',
        headers: {
          'Client-ID': clientId || this.clientId,
          'Authorization': `Bearer ${this.password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rewardInfo),
      }
    );
    const data = await response.json() as { data: unknown[] };
    return data.data[0];
  }

  async DeleteChannelReward(clientId: string, rewardId: string): Promise<string> {
    if (!this.password) throw new Error('Missing Channel Password');
    
    const response = await fetch(
      `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${this.channelId}&id=${rewardId}`,
      {
        method: 'DELETE',
        headers: {
          'Client-ID': clientId || this.clientId,
          'Authorization': `Bearer ${this.password}`,
        },
      }
    );
    return response.text();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: Token Validation
  // ─────────────────────────────────────────────────────────────────────────

  private async validateToken(token: string): Promise<{
    clientId: string;
    userId: string;
    login: string;
    scopes: string[];
  } | null> {
    try {
      const response = await fetch('https://id.twitch.tv/oauth2/validate', {
        headers: { 'Authorization': `OAuth ${token}` },
      });
      
      if (!response.ok) return null;
      
      const data = await response.json() as {
        client_id: string;
        user_id: string;
        login: string;
        scopes: string[];
      };
      
      return {
        clientId: data.client_id,
        userId: data.user_id,
        login: data.login,
        scopes: data.scopes,
      };
    } catch {
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: IRC Handlers
  // ─────────────────────────────────────────────────────────────────────────

  private setupIRCHandlers(): void {
    if (!this.irc) return;

    this.irc.onConnected = (isFirst) => {
      console.log('Connected to IRC');
      this.onConnected('irc-ws.chat.twitch.tv', 443, isFirst ? this.isFirstConnect : false);
      this.isFirstConnect = false;
    };

    this.irc.onDisconnected = (_reason) => {
      // Will auto-reconnect
    };

    this.irc.onReconnecting = (attempt: number) => {
      this.onReconnect(attempt);
    };

    this.irc.onMessage = (msg) => {
      this.handleIRCMessage(msg);
    };
  }

  private handleIRCMessage(msg: IRCMessage): void {
    // Call raw message handler for all IRC messages (useful for debugging/capture)
    this.onRawMessage(msg.command, msg.raw, msg);

    try {
      switch (msg.command) {
        case 'PRIVMSG':
          this.handlePrivmsg(msg);
          break;

        case 'WHISPER':
          this.handleWhisper(msg);
          break;

        case 'CLEARCHAT':
          this.handleClearChat(msg);
          break;

        case 'CLEARMSG':
          this.handleClearMsg(msg);
          break;

        case 'ROOMSTATE':
          this.handleRoomState(msg);
          break;

        case 'USERNOTICE':
          this.handleUserNotice(msg);
          break;

        case 'JOIN':
          this.handleJoin(msg);
          break;

        case 'PART':
          this.handlePart(msg);
          break;
      }
    } catch (error) {
      this.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private handlePrivmsg(msg: IRCMessage): void {
    const channel = msg.channel?.replace('#', '') || '';
    const username = msg.tags['display-name'] || msg.prefix?.split('!')[0] || '';
    const message = msg.message || '';
    
    // Note: In v1/tmi.js, 'self' is only true for messages sent via client.say()
    // Since we don't request echo-message capability, we don't receive our own sent messages
    // Any PRIVMSG we receive was typed in the Twitch interface, not sent by our client
    // So self should always be false for received messages
    const self = false;

    const flags = parseUserFlags(msg.tags, channel);
    const extra = buildUserExtra(msg);

    // Check for cheers (bits)
    const bits = parseInt(msg.tags['bits'] || '0', 10);
    if (bits > 0 && !self) {
      // v1 parity: cheer extra has subscriber field
      const cheerExtra = {
        ...extra,
        subscriber: msg.tags['subscriber'] || '',
      };
      this.onCheer(username, message, bits, flags, cheerExtra);
      return; // Cheers don't also trigger onChat in v1
    }

    // Check for commands
    const parsed = parseCommand(message);

    if (!self && parsed) {
      const sinceLastCmd = getTimePeriod(parsed.command, msg.tags['user-id'] || null);
      const extraWithCmd = {
        ...extra,
        sinceLastCommand: { any: sinceLastCmd.any ?? 0, user: sinceLastCmd.user ?? 0 },
      };
      this.onCommand(username, parsed.command, parsed.args, flags, extraWithCmd);
    } else {
      const msgType = msg.tags['msg-id'] || 'chat';
      if (msgType === 'action' || !msg.tags['msg-id']) {
        this.onChat(username, message, flags, self, extra);
      }
    }
  }

  private handleWhisper(msg: IRCMessage): void {
    const username = msg.tags['display-name'] || msg.prefix?.split('!')[0] || '';
    const message = msg.message || '';
    const flags = parseUserFlags(msg.tags, '');
    const extra = buildUserExtra(msg);

    this.onWhisper(username, message, flags, false, extra);
  }

  private handleClearChat(msg: IRCMessage): void {
    const targetUser = msg.message || '';
    const duration = msg.tags['ban-duration'];
    const targetUserId = msg.tags['target-user-id'] || '';
    const roomId = msg.tags['room-id'] || '';

    if (duration) {
      // v1 parity: timeout extra has timedOutUserId
      const timeoutExtra = {
        roomId,
        username: targetUser,
        timedOutUserId: targetUserId,
      };
      this.onTimeout(targetUser, parseInt(duration, 10), timeoutExtra);
    } else if (targetUser) {
      // v1 parity: ban extra has bannedUserId
      const banExtra = {
        roomId,
        username: targetUser,
        bannedUserId: targetUserId,
      };
      this.onBan(targetUser, banExtra);
    }
  }

  private handleClearMsg(msg: IRCMessage): void {
    const messageId = msg.tags['target-msg-id'] || '';
    // v1 parity: minimal extra object
    const extra = {
      id: messageId,
      roomId: msg.tags['room-id'] || '',
      username: msg.tags['login'] || '',
      message: msg.message || '',
    };

    this.onMessageDeleted(messageId, extra);
  }

  private handleRoomState(msg: IRCMessage): void {
    const channel = msg.channel?.replace('#', '') || '';
    
    if (!this.chatModes[channel]) {
      this.chatModes[channel] = {};
    }

    const modes = this.chatModes[channel];
    const tags = msg.tags;

    if ('emote-only' in tags) modes.emoteOnly = tags['emote-only'] === '1';
    if ('followers-only' in tags) modes.followerOnly = parseInt(tags['followers-only'] || '-1', 10) >= 0;
    if ('subs-only' in tags) modes.subOnly = tags['subs-only'] === '1';
    if ('r9k' in tags) modes.r9kMode = tags['r9k'] === '1';
    if ('slow' in tags) modes.slowMode = parseInt(tags['slow'] || '0', 10) > 0;

    this.onChatMode(modes, channel);
  }

  private handleUserNotice(msg: IRCMessage): void {
    const msgId = msg.tags['msg-id'];
    const username = msg.tags['display-name'] || msg.tags['login'] || '';
    const message = msg.message || '';
    const tags = msg.tags;

    const extra = buildUserExtra(msg);

    switch (msgId) {
      case 'sub':
      case 'resub': {
        const months = parseInt(tags['msg-param-cumulative-months'] || '1', 10);
        const streakMonths = parseInt(tags['msg-param-streak-months'] || '0', 10);
        const subTier = parseSubTier(tags['msg-param-sub-plan'] || '1000');

        if (msgId === 'sub') {
          this.onSub(username, message, subTier, extra);
        } else {
          this.onResub(username, message, streakMonths, months, subTier, extra);
        }
        break;
      }

      case 'subgift': {
        const recipient = tags['msg-param-recipient-display-name'] || tags['msg-param-recipient-user-name'] || '';
        const streakMonths = parseInt(tags['msg-param-months'] || '0', 10);
        const senderCount = parseInt(tags['msg-param-sender-count'] || '0', 10);
        const subTier = parseSubTier(tags['msg-param-sub-plan'] || '1000');

        const giftExtra = {
          ...extra,
          recipientDisplayName: tags['msg-param-recipient-display-name'],
          recipientUsername: tags['msg-param-recipient-user-name'],
          recipientId: tags['msg-param-recipient-id'],
        };

        this.onSubGift(username, streakMonths, recipient, senderCount, subTier, giftExtra as never);
        break;
      }

      case 'submysterygift': {
        const numSubs = parseInt(tags['msg-param-mass-gift-count'] || '0', 10);
        const senderCount = parseInt(tags['msg-param-sender-count'] || '0', 10);
        const subTier = parseSubTier(tags['msg-param-sub-plan'] || '1000');

        const mysteryExtra = {
          ...extra,
          userMassGiftCount: numSubs,
        };

        this.onSubMysteryGift(username, numSubs, senderCount, subTier, mysteryExtra as never);
        break;
      }

      case 'giftpaidupgrade': {
        const sender = tags['msg-param-sender-name'] || tags['msg-param-sender-login'] || '';
        const upgradeExtra = {
          ...extra,
          gifterUsername: tags['msg-param-sender-login'],
          gifterDisplayName: tags['msg-param-sender-name'],
        };

        this.onGiftSubContinue(username, sender, upgradeExtra);
        break;
      }

      case 'raid': {
        const viewers = parseInt(tags['msg-param-viewerCount'] || '0', 10);
        // v2: provide full extra with additional raid info
        const raidExtra = {
          ...extra,
          viewerCount: viewers,
          raidingChannel: username,
          raidingChannelId: tags['user-id'] || '',
        };
        this.onRaid(username, viewers, raidExtra);
        break;
      }
    }
  }

  private handleJoin(msg: IRCMessage): void {
    const channel = msg.channel?.replace('#', '') || '';
    const username = msg.prefix?.split('!')[0] || '';
    const self = username.toLowerCase() === this.irc?.username;

    // v2: provide channel info (v1 only had { channel })
    this.onJoin(username, self, { channel, roomId: msg.tags['room-id'] || '' });
  }

  private handlePart(msg: IRCMessage): void {
    const channel = msg.channel?.replace('#', '') || '';
    const username = msg.prefix?.split('!')[0] || '';
    const self = username.toLowerCase() === this.irc?.username;

    // v2: provide channel info (v1 only had { channel })
    this.onPart(username, self, { channel, roomId: msg.tags['room-id'] || '' });
  }

  // ─────────────────────────────────────────────────────────────
  // Private: P2P Coordination
  // ─────────────────────────────────────────────────────────────

  private async initializeP2P(): Promise<void> {
    // Initialize P2P coordinator
    this.p2p = new P2PCoordinator({
      channel: this.mainChannel,
      debug: this.isDebug,
    });

    const role = await this.p2p.initialize();
    this.log(`P2P role: ${role}`);

    // Set up P2P event handler (for followers to receive EventSub events)
    this.p2p.onEvent = (event) => {
      this.handleEventSubNotification(event);
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: EventSub
  // ─────────────────────────────────────────────────────────────────────────

  private async initializeEventSub(): Promise<void> {
    if (!this.api) return;

    this.eventSub = new EventSubClient({ debug: this.isDebug });
    
    // Set up subscription handler
    this.eventSub.createSubscription = async (sessionId, type, version, condition) => {
      const sub = await this.api!.createEventSubSubscription(sessionId, type, version, condition);
      this.eventSub!.registerSubscription(sub);
      return sub;
    };

    // Set up event handler
    this.eventSub.onEvent = (event) => {
      // Handle locally
      this.handleEventSubNotification(event);
      // Broadcast to followers
      this.p2p?.broadcastEvent(event);
    };

    // Connect
    await this.eventSub.connect();

    // Subscribe based on scopes
    await this.subscribeToScopedEvents();
  }

  private async subscribeToScopedEvents(): Promise<void> {
    if (!this.eventSub) return;

    const subscribedTypes = new Set<string>();

    for (const scope of this.scopes) {
      const eventTypes = SCOPE_TO_EVENTSUB[scope];
      if (!eventTypes) continue;

      for (const [type, version] of eventTypes as unknown as [string, string][]) {
        if (subscribedTypes.has(type)) continue;
        subscribedTypes.add(type);

        try {
          await this.eventSub.subscribe(type, version, {
            broadcaster_user_id: this.channelId,
            moderator_user_id: this.userId,
            user_id: this.userId,
          });
        } catch (err) {
          this.log(`Failed to subscribe to ${type}: ${err}`);
        }
      }
    }
  }

  private handleEventSubNotification(notification: EventSubNotification): void {
    const { subscriptionType, event } = notification;

    try {
      switch (subscriptionType) {
        // Channel Points
        case 'channel.channel_points_custom_reward_redemption.add':
        case 'channel.channel_points_automatic_reward_redemption.add':
          this.handleRewardEvent(event);
          break;

        // Hype Train
        case 'channel.hype_train.begin':
        case 'channel.hype_train.progress':
        case 'channel.hype_train.end':
          this.handleHypeTrainEvent(subscriptionType, event);
          break;

        // Shoutout
        case 'channel.shoutout.create':
          this.handleShoutoutEvent(event);
          break;

        // Whisper
        case 'user.whisper.message':
          this.handleWhisperEvent(event);
          break;

        // Polls
        case 'channel.poll.begin':
        case 'channel.poll.progress':
        case 'channel.poll.end':
          this.handlePollEvent(subscriptionType, event);
          break;

        // Predictions
        case 'channel.prediction.begin':
        case 'channel.prediction.progress':
        case 'channel.prediction.lock':
        case 'channel.prediction.end':
          this.handlePredictionEvent(subscriptionType, event);
          break;
      }
    } catch (error) {
      this.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private handleRewardEvent(event: Record<string, unknown>): void {
    const user = (event.user_name || event.user_login) as string;
    const reward = event.reward as Record<string, unknown>;
    const title = reward?.title as string || '';
    const cost = reward?.cost as number || 0;
    const message = event.user_input as string || '';

    const extra = {
      channelId: event.broadcaster_user_id as string,
      channelName: event.broadcaster_user_login as string,
      channelDisplayName: event.broadcaster_user_name as string,
      reward: {
        id: reward?.id,
        title: reward?.title,
        prompt: reward?.prompt,
        cost: reward?.cost,
      },
      rewardFulfilled: (event.status as string)?.toLowerCase() === 'fulfilled',
      userId: event.user_id as string,
      username: event.user_login as string,
      displayName: event.user_name as string,
      customRewardId: event.id as string,
      redeemed_at: event.redeemed_at as string,
    };

    this.onReward(user, title, cost, message, extra);
  }

  private handleHypeTrainEvent(type: string, event: Record<string, unknown>): void {
    const phase = type.split('.').pop() as 'begin' | 'progress' | 'end';
    const level = event.level as number;
    const progress = event.progress as number || 0;
    const goal = event.goal as number;
    const total = event.total as number;
    
    const endDate = (event.expires_at || event.ended_at) as string;
    const timeRemaining = new Date(endDate).getTime() - Date.now();

    const extra = {
      ...event,
      id: event.id,
      channelId: event.broadcaster_user_id,
      channelName: event.broadcaster_user_login,
      channelDisplayName: event.broadcaster_user_name,
      level,
      progressToNextLevel: progress,
      goalToNextLevel: goal,
      totalHype: total,
      isGoldenKappaTrain: event.is_golden_kappa_train,
      startDate: event.started_at,
      endDate,
    };

    this.onHypeTrain(phase, level, progress, goal, total, timeRemaining, extra);
  }

  private handleShoutoutEvent(event: Record<string, unknown>): void {
    const channel = event.to_broadcaster_user_name as string;
    const viewerCount = event.viewer_count as number;
    const startedAt = event.started_at as string;
    const timeRemaining = new Date(startedAt).getTime() - Date.now() + 60000;

    const extra = {
      ...event,
      channelId: event.to_broadcaster_user_id,
      channelName: event.to_broadcaster_user_login,
      channelDisplayName: event.to_broadcaster_user_name,
      shouterChannelId: event.broadcaster_user_id,
      shouterChannelName: event.broadcaster_user_login,
      shouterChannelDisplayName: event.broadcaster_user_name,
      viewerCount,
      startedAt,
      cooldownEndsAt: event.cooldown_ends_at,
      targetCooldownEndsAt: event.target_cooldown_ends_at,
    };

    this.onShoutout(channel, viewerCount, timeRemaining, extra);
  }

  private handleWhisperEvent(event: Record<string, unknown>): void {
    const user = (event.from_user_name || event.from_user_login) as string;
    const whisper = event.whisper as Record<string, unknown>;
    const message = whisper?.text as string || '';

    const extra = {
      fromUserId: event.from_user_id,
      fromUserLogin: event.from_user_login,
      fromUserName: event.from_user_name,
      toUserId: event.to_user_id,
      toUserLogin: event.to_user_login,
      toUserName: event.to_user_name,
      whisperId: event.whisper_id,
      whisper,
    };

    const emptyFlags = {
      broadcaster: false,
      mod: false,
      vip: false,
      subscriber: false,
      founder: false,
      highlighted: false,
      customReward: false,
    };

    this.onWhisper(user, message, emptyFlags, false, extra as unknown as UserExtra);
  }

  private handlePollEvent(type: string, event: Record<string, unknown>): void {
    const phase = type.split('.').pop() as string;
    const title = event.title as string;
    const choices = event.choices as Array<{ title: string; votes?: number; bits_votes?: number; channel_points_votes?: number }>;
    
    let pollChoices = choices.map(c => c.title);
    let pollVotes = choices.map(c => (c.bits_votes || 0) + (c.channel_points_votes || 0) + (c.votes || 0));

    const endDate = (event.ends_at || event.ended_at) as string;
    const timeRemaining = new Date(endDate).getTime() - Date.now();

    // Sort by votes if not begin
    if (phase !== 'begin') {
      const sorted = pollChoices.map((c, i) => [c, pollVotes[i]] as [string, number])
        .sort((a, b) => b[1] - a[1]);
      pollChoices = sorted.map(x => x[0]);
      pollVotes = sorted.map(x => x[1]);
    }

    let phaseStr: string = phase;
    if (phase === 'end') {
      const status = event.status as string;
      phaseStr = status === 'terminated' ? 'close' :
                 status === 'archived' ? 'archive' :
                 status === 'moderated' ? 'delete' :
                 status === 'completed' ? 'end' : 'unknown';
    }

    const extra = {
      ...event,
      channelId: event.broadcaster_user_id,
      channelName: event.broadcaster_user_login,
      channelDisplayName: event.broadcaster_user_name,
      pollId: event.id,
      title,
      choices,
      startDate: event.started_at,
      endDate,
      status: event.status,
    };

    this.onPoll(phaseStr, title, pollChoices, pollVotes, timeRemaining, extra);
  }

  private handlePredictionEvent(type: string, event: Record<string, unknown>): void {
    const phase = type.split('.').pop() as string;
    const title = event.title as string;
    const outcomes = event.outcomes as Array<{
      title: string;
      top_predictors?: Array<{
        user_name?: string;
        user_login?: string;
        user_id: string;
        channel_points_used?: number;
        channel_points_won?: number;
      }>;
    }>;

    const predictionOutcomes = outcomes.map(o => o.title);
    const topPredictors = outcomes.map(o => {
      if (!o.top_predictors) return [];
      return o.top_predictors.map(p => ({
        user: p.user_name || p.user_login || '',
        userId: p.user_id,
        points: p.channel_points_used || 0,
        won: p.channel_points_won || 0,
      }));
    });

    const lockDate = (event.locks_at || event.locked_at) as string;
    const timeRemaining = new Date(lockDate).getTime() - Date.now();

    let phaseStr: string = phase;
    if (phase === 'end') {
      const status = event.status as string;
      phaseStr = status === 'canceled' ? 'cancel' :
                 status === 'resolved' ? 'end' : 'unknown';
    }

    const extra = {
      ...event,
      channelId: event.broadcaster_user_id,
      channelName: event.broadcaster_user_login,
      channelDisplayName: event.broadcaster_user_name,
      predictionId: event.id,
      title,
      outcomes,
      startDate: event.started_at,
      lockDate,
      endDate: event.ended_at,
      status: event.status,
    };

    this.onPrediction(phaseStr, title, predictionOutcomes, topPredictors, phase === 'end' || phase === 'lock' ? 0 : timeRemaining, extra);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // P2P Status
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the P2P coordination role
   */
  p2pRole(): 'leader' | 'follower' | 'standalone' | null {
    return this.p2p?.currentRole ?? null;
  }

  /**
   * Get this instance's P2P ID
   */
  p2pId(): string | null {
    return this.p2p?.id ?? null;
  }

  /**
   * Get the number of connected followers (leader only)
   */
  p2pFollowerCount(): number {
    return this.p2p?.followerCount ?? 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────

  private log(msg: string): void {
    if (this.isDebug) {
      console.log(`[ComfyJS] ${msg}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Singleton
// ─────────────────────────────────────────────────────────────────────────────

const ComfyJS = new ComfyJSImpl();

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export default ComfyJS;
export { ComfyJS };

// Browser global
if (typeof window !== 'undefined') {
  (window as unknown as { ComfyJS: ComfyJSInstance }).ComfyJS = ComfyJS;
}

// Re-export types
export type {
  ComfyJSInstance,
  ComfyJSConfig,
  UserFlags,
  UserExtra,
  IRCMessage,
  SubTierInfo,
  CommandHandler,
  ChatHandler,
  RewardHandler,
} from './types';

export type { EventSubNotification } from './eventsub';

// Re-export internals for advanced usage
export { IRCClient } from './irc';
export { EventSubClient, EventSubTypes } from './eventsub';
export { P2PCoordinator } from './p2p';
export { TwitchAPI } from './api';
