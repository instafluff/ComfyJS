// ═══════════════════════════════════════════════════════════════════════════
// COMFY.JS v2 - EventSub WebSocket Client
// ═══════════════════════════════════════════════════════════════════════════

import type { EventSubMessage, EventSubSubscription } from './types';

// EventSubNotification is defined inline in this module
export interface EventSubNotification {
  subscriptionType: string;
  subscriptionVersion: string;
  event: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const EVENTSUB_URL = 'wss://eventsub.wss.twitch.tv/ws';
const RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

// Limits per user token (client_id + user_id combination)
// const MAX_CONNECTIONS_PER_USER = 3;
const MAX_SUBSCRIPTIONS_PER_CONNECTION = 300;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// EventSub Client Class
// ─────────────────────────────────────────────────────────────────────────────

export class EventSubClient {
  private ws: WebSocket | null = null;
  private options: Required<EventSubClientOptions>;
  
  // Connection state
  private sessionId: string = '';
  private isConnected = false;
  private isConnecting = false;
  private reconnectCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private keepaliveTimeoutMs = 10000; // Updated by welcome message
  private keepaliveTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Subscriptions
  private subscriptions: Map<string, EventSubSubscription> = new Map();
  private pendingSubscriptions: Array<{
    type: string;
    version: string;
    condition: Record<string, string>;
    resolve: (sub: EventSubSubscription) => void;
    reject: (err: Error) => void;
  }> = [];
  
  // API callback for subscription creation
  public createSubscription: ((
    sessionId: string,
    type: string,
    version: string,
    condition: Record<string, string>
  ) => Promise<EventSubSubscription>) | null = null;
  
  // Event handlers
  public onEvent: EventSubHandler | null = null;
  public onConnected: ((sessionId: string, isFirstConnect: boolean) => void) | null = null;
  public onDisconnected: ((reason: string) => void) | null = null;
  public onReconnecting: ((attempt: number) => void) | null = null;

  constructor(options: EventSubClientOptions = {}) {
    this.options = {
      debug: options.debug ?? false,
      reconnect: options.reconnect ?? true,
      maxReconnectAttempts: options.maxReconnectAttempts ?? Infinity,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Connection
  // ─────────────────────────────────────────────────────────────────────────

  async connect(): Promise<string> {
    if (this.isConnected) {
      return this.sessionId;
    }
    
    if (this.isConnecting) {
      // Wait for existing connection
      return new Promise((resolve, reject) => {
        const check = setInterval(() => {
          if (this.isConnected) {
            clearInterval(check);
            resolve(this.sessionId);
          } else if (!this.isConnecting) {
            clearInterval(check);
            reject(new Error('Connection failed'));
          }
        }, 100);
      });
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(EVENTSUB_URL);

        this.ws.onopen = () => {
          this.log('WebSocket connected, waiting for welcome...');
        };

        this.ws.onmessage = (event: MessageEvent) => {
          this.handleMessage(event.data as string, resolve);
        };

        this.ws.onclose = (event: CloseEvent) => {
          this.handleClose(event.reason || 'Connection closed');
        };

        this.ws.onerror = () => {
          if (this.isConnecting) {
            this.isConnecting = false;
            reject(new Error('EventSub connection failed'));
          }
        };
      } catch (err) {
        this.isConnecting = false;
        reject(err);
      }
    });
  }

  disconnect(): void {
    this.options.reconnect = false;
    this.clearReconnectTimer();
    this.clearKeepaliveTimer();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.sessionId = '';
    this.subscriptions.clear();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Message Handling
  // ─────────────────────────────────────────────────────────────────────────

  private handleMessage(data: string, onWelcome?: (sessionId: string) => void): void {
    let msg: EventSubMessage;
    
    try {
      msg = JSON.parse(data);
    } catch {
      this.log('Failed to parse message: ' + data);
      return;
    }

    this.log(`← ${msg.metadata.message_type}`);

    switch (msg.metadata.message_type) {
      case 'session_welcome':
        this.handleWelcome(msg, onWelcome);
        break;

      case 'session_keepalive':
        this.resetKeepaliveTimer();
        break;

      case 'notification':
        this.handleNotification(msg);
        break;

      case 'session_reconnect':
        this.handleReconnect(msg);
        break;

      case 'revocation':
        this.handleRevocation(msg);
        break;
    }
  }

  private handleWelcome(msg: EventSubMessage, onWelcome?: (sessionId: string) => void): void {
    const session = msg.payload.session!;
    this.sessionId = session.id;
    this.keepaliveTimeoutMs = session.keepalive_timeout_seconds * 1000;
    
    this.isConnected = true;
    this.isConnecting = false;
    const isFirst = this.reconnectCount === 0;
    this.reconnectCount = 0;
    
    this.resetKeepaliveTimer();
    
    this.log(`Session ID: ${this.sessionId}, keepalive: ${session.keepalive_timeout_seconds}s`);
    this.onConnected?.(this.sessionId, isFirst);
    onWelcome?.(this.sessionId);
    
    // Process pending subscriptions
    this.processPendingSubscriptions();
  }

  private handleNotification(msg: EventSubMessage): void {
    this.resetKeepaliveTimer();
    
    const notification: EventSubNotification = {
      subscriptionType: msg.metadata.subscription_type!,
      subscriptionVersion: msg.metadata.subscription_version!,
      event: msg.payload.event!,
    };
    
    this.log(`Event: ${notification.subscriptionType}`);
    this.onEvent?.(notification);
  }

  private handleReconnect(msg: EventSubMessage): void {
    const reconnectUrl = msg.payload.session?.reconnect_url;
    if (!reconnectUrl) return;
    
    this.log(`Server requested reconnect to: ${reconnectUrl}`);
    
    // Connect to new URL while keeping old connection alive
    const oldWs = this.ws;
    
    this.ws = new WebSocket(reconnectUrl);
    this.ws.onmessage = (event: MessageEvent) => {
      this.handleMessage(event.data as string);
    };
    this.ws.onclose = (event: CloseEvent) => {
      this.handleClose(event.reason || 'Connection closed');
    };
    this.ws.onopen = () => {
      // Close old connection after new one is ready
      setTimeout(() => oldWs?.close(1000, 'Reconnected'), 1000);
    };
  }

  private handleRevocation(msg: EventSubMessage): void {
    const sub = msg.payload.subscription;
    if (sub) {
      this.log(`Subscription revoked: ${sub.type} (${sub.status})`);
      this.subscriptions.delete(sub.id);
    }
  }

  private handleClose(reason: string): void {
    const wasConnected = this.isConnected;
    this.isConnected = false;
    this.isConnecting = false;
    this.ws = null;
    this.clearKeepaliveTimer();

    if (wasConnected) {
      this.onDisconnected?.(reason);
    }

    // Reject pending subscriptions
    for (const pending of this.pendingSubscriptions) {
      pending.reject(new Error('Connection closed'));
    }
    this.pendingSubscriptions = [];

    // Attempt reconnect
    if (this.options.reconnect && this.reconnectCount < this.options.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Keepalive
  // ─────────────────────────────────────────────────────────────────────────

  private resetKeepaliveTimer(): void {
    this.clearKeepaliveTimer();
    
    // Add buffer to timeout (10% extra)
    const timeout = this.keepaliveTimeoutMs * 1.1;
    
    this.keepaliveTimer = setTimeout(() => {
      this.log('Keepalive timeout, reconnecting...');
      this.ws?.close(4000, 'Keepalive timeout');
    }, timeout);
  }

  private clearKeepaliveTimer(): void {
    if (this.keepaliveTimer) {
      clearTimeout(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Reconnection
  // ─────────────────────────────────────────────────────────────────────────

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    
    const delay = Math.min(
      RECONNECT_DELAY_MS * Math.pow(2, this.reconnectCount),
      MAX_RECONNECT_DELAY_MS
    );
    
    this.reconnectCount++;
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectCount})`);
    this.onReconnecting?.(this.reconnectCount);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
        // Re-subscribe after reconnect
        await this.resubscribeAll();
      } catch {
        // handleClose will schedule next retry
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Subscriptions
  // ─────────────────────────────────────────────────────────────────────────

  async subscribe(
    type: string,
    version: string,
    condition: Record<string, string>
  ): Promise<EventSubSubscription> {
    if (this.subscriptions.size >= MAX_SUBSCRIPTIONS_PER_CONNECTION) {
      throw new Error(`Max subscriptions (${MAX_SUBSCRIPTIONS_PER_CONNECTION}) reached`);
    }

    // Ensure connected
    await this.connect();

    if (!this.createSubscription) {
      throw new Error('No subscription handler configured');
    }

    return this.createSubscription(this.sessionId, type, version, condition);
  }

  private async processPendingSubscriptions(): Promise<void> {
    const pending = [...this.pendingSubscriptions];
    this.pendingSubscriptions = [];

    for (const item of pending) {
      try {
        const sub = await this.subscribe(item.type, item.version, item.condition);
        item.resolve(sub);
      } catch (err) {
        item.reject(err as Error);
      }
    }
  }

  private async resubscribeAll(): Promise<void> {
    if (!this.createSubscription) return;

    const oldSubs = [...this.subscriptions.values()];
    this.subscriptions.clear();

    for (const sub of oldSubs) {
      try {
        await this.createSubscription(
          this.sessionId,
          sub.type,
          sub.version,
          sub.condition
        );
      } catch (err) {
        this.log(`Failed to resubscribe ${sub.type}: ${err}`);
      }
    }
  }

  registerSubscription(sub: EventSubSubscription): void {
    this.subscriptions.set(sub.id, sub);
  }

  unregisterSubscription(id: string): void {
    this.subscriptions.delete(id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────

  get connected(): boolean {
    return this.isConnected;
  }

  get session(): string {
    return this.sessionId;
  }

  get subscriptionCount(): number {
    return this.subscriptions.size;
  }

  getConnectionInfo(): EventSubConnectionInfo | null {
    if (!this.isConnected) return null;
    
    return {
      sessionId: this.sessionId,
      connectedAt: new Date(),
      subscriptionCount: this.subscriptions.size,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────

  private log(msg: string): void {
    if (this.options.debug) {
      console.log(`[ComfyJS EventSub] ${msg}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Common EventSub Subscription Types (for reference)
// ─────────────────────────────────────────────────────────────────────────────

export const EventSubTypes = {
  // Channel Points
  CHANNEL_POINTS_REDEMPTION: 'channel.channel_points_custom_reward_redemption.add',
  CHANNEL_POINTS_REDEMPTION_UPDATE: 'channel.channel_points_custom_reward_redemption.update',
  
  // Polls
  POLL_BEGIN: 'channel.poll.begin',
  POLL_PROGRESS: 'channel.poll.progress',
  POLL_END: 'channel.poll.end',
  
  // Predictions
  PREDICTION_BEGIN: 'channel.prediction.begin',
  PREDICTION_PROGRESS: 'channel.prediction.progress',
  PREDICTION_LOCK: 'channel.prediction.lock',
  PREDICTION_END: 'channel.prediction.end',
  
  // Hype Train
  HYPE_TRAIN_BEGIN: 'channel.hype_train.begin',
  HYPE_TRAIN_PROGRESS: 'channel.hype_train.progress',
  HYPE_TRAIN_END: 'channel.hype_train.end',
  
  // Subscriptions
  SUBSCRIBE: 'channel.subscribe',
  SUBSCRIPTION_END: 'channel.subscription.end',
  SUBSCRIPTION_GIFT: 'channel.subscription.gift',
  SUBSCRIPTION_MESSAGE: 'channel.subscription.message',
  
  // Cheers
  CHEER: 'channel.cheer',
  
  // Raids
  RAID: 'channel.raid',
  
  // Follows
  FOLLOW: 'channel.follow',
  
  // Stream
  STREAM_ONLINE: 'stream.online',
  STREAM_OFFLINE: 'stream.offline',
  
  // Moderation
  BAN: 'channel.ban',
  UNBAN: 'channel.unban',
  MODERATOR_ADD: 'channel.moderator.add',
  MODERATOR_REMOVE: 'channel.moderator.remove',
  
  // Goals
  GOAL_BEGIN: 'channel.goal.begin',
  GOAL_PROGRESS: 'channel.goal.progress',
  GOAL_END: 'channel.goal.end',
  
  // Shoutouts
  SHOUTOUT_CREATE: 'channel.shoutout.create',
  SHOUTOUT_RECEIVE: 'channel.shoutout.receive',
} as const;
