// ═══════════════════════════════════════════════════════════════════════════
// COMFY.JS v2 - IRC WebSocket Client
// ═══════════════════════════════════════════════════════════════════════════

import type { IRCMessage, P2PSignal } from './types';
import { parseIRCMessage, parseP2PSignal } from './parsers';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const IRC_URL = 'wss://irc-ws.chat.twitch.tv:443';
const RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

// Rate limits
const MSG_RATE_LIMIT = 20; // messages per 30 seconds (non-mod)
const MSG_RATE_LIMIT_MOD = 100; // messages per 30 seconds (mod)
const MSG_RATE_WINDOW_MS = 30000;
const JOIN_RATE_LIMIT = 20; // joins per 10 seconds
const JOIN_RATE_WINDOW_MS = 10000;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IRCClientOptions {
  debug?: boolean;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
}

export type IRCEventHandler = (message: IRCMessage) => void;
export type IRCSignalHandler = (signal: P2PSignal) => void;

// ─────────────────────────────────────────────────────────────────────────────
// IRC Client Class
// ─────────────────────────────────────────────────────────────────────────────

export class IRCClient {
  private ws: WebSocket | null = null;
  private oauth: string = '';
  private nick: string = '';
  private channels: Set<string> = new Set();
  private options: Required<IRCClientOptions>;
  
  // Connection state
  private isConnected = false;
  private isConnecting = false;
  private reconnectCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Rate limiting
  private msgTimestamps: number[] = [];
  private joinTimestamps: number[] = [];
  private isMod: Map<string, boolean> = new Map();
  
  // Event handlers
  public onMessage: IRCEventHandler | null = null;
  public onSignal: IRCSignalHandler | null = null;
  public onConnected: ((isFirstConnect: boolean) => void) | null = null;
  public onDisconnected: ((reason: string) => void) | null = null;
  public onReconnecting: ((attempt: number) => void) | null = null;

  constructor(options: IRCClientOptions = {}) {
    this.options = {
      debug: options.debug ?? false,
      reconnect: options.reconnect ?? true,
      maxReconnectAttempts: options.maxReconnectAttempts ?? Infinity,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Connection
  // ─────────────────────────────────────────────────────────────────────────

  async connect(oauth: string, nick: string): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      return;
    }

    this.oauth = oauth.startsWith('oauth:') ? oauth : `oauth:${oauth}`;
    this.nick = nick.toLowerCase();
    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(IRC_URL);

        this.ws.onopen = () => {
          this.log('WebSocket connected, authenticating...');
          this.authenticate();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          this.handleRawMessage(event.data as string, resolve);
        };

        this.ws.onclose = (event: CloseEvent) => {
          this.handleClose(event.reason || 'Connection closed');
        };

        this.ws.onerror = () => {
          if (this.isConnecting) {
            reject(new Error('IRC connection failed'));
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
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.channels.clear();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Authentication
  // ─────────────────────────────────────────────────────────────────────────

  private authenticate(): void {
    this.sendRaw('CAP REQ :twitch.tv/membership twitch.tv/tags twitch.tv/commands');
    this.sendRaw(`PASS ${this.oauth}`);
    this.sendRaw(`NICK ${this.nick}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Message Handling
  // ─────────────────────────────────────────────────────────────────────────

  private handleRawMessage(data: string, onAuth?: (value: void) => void): void {
    // IRC can send multiple messages in one frame
    const lines = data.split('\r\n').filter(line => line.length > 0);
    
    for (const line of lines) {
      this.log('← ' + line);
      const msg = parseIRCMessage(line);
      
      // Handle protocol messages
      switch (msg.command) {
        case 'PING':
          this.sendRaw(`PONG :${msg.params[0] || 'tmi.twitch.tv'}`);
          continue;

        case '001': // Welcome
          this.isConnected = true;
          this.isConnecting = false;
          const isFirst = this.reconnectCount === 0;
          this.reconnectCount = 0;
          this.log('Authenticated successfully');
          this.onConnected?.(isFirst);
          onAuth?.();
          // Rejoin channels if reconnecting
          this.rejoinChannels();
          continue;

        case 'NOTICE':
          if (msg.message?.includes('Login authentication failed')) {
            this.disconnect();
            return;
          }
          break;

        case 'RECONNECT':
          this.log('Server requested reconnect');
          this.ws?.close(1000, 'Server reconnect');
          return;
      }

      // Check for P2P signal (internal ComfyJS coordination)
      const signal = parseP2PSignal(msg.tags);
      if (signal) {
        this.onSignal?.(signal);
        continue; // Don't emit as regular message
      }

      // Emit to handler
      this.onMessage?.(msg);
    }
  }

  private handleClose(reason: string): void {
    const wasConnected = this.isConnected;
    this.isConnected = false;
    this.isConnecting = false;
    this.ws = null;

    if (wasConnected) {
      this.onDisconnected?.(reason);
    }

    // Attempt reconnect
    if (this.options.reconnect && this.reconnectCount < this.options.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

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
        await this.connect(this.oauth, this.nick);
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
  // Channel Management
  // ─────────────────────────────────────────────────────────────────────────

  async join(channel: string): Promise<void> {
    channel = channel.toLowerCase().replace('#', '');
    
    if (this.channels.has(channel)) return;
    
    // Rate limit joins
    if (!this.canJoin()) {
      await this.waitForJoinSlot();
    }
    
    this.channels.add(channel);
    this.joinTimestamps.push(Date.now());
    this.sendRaw(`JOIN #${channel}`);
    this.log(`Joined #${channel}`);
  }

  part(channel: string): void {
    channel = channel.toLowerCase().replace('#', '');
    
    if (!this.channels.has(channel)) return;
    
    this.channels.delete(channel);
    this.isMod.delete(channel);
    this.sendRaw(`PART #${channel}`);
    this.log(`Left #${channel}`);
  }

  private rejoinChannels(): void {
    for (const channel of this.channels) {
      this.sendRaw(`JOIN #${channel}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Sending Messages
  // ─────────────────────────────────────────────────────────────────────────

  async say(channel: string, message: string): Promise<void> {
    channel = channel.toLowerCase().replace('#', '');
    
    // Rate limit messages
    if (!this.canSendMessage(channel)) {
      await this.waitForMessageSlot(channel);
    }
    
    this.msgTimestamps.push(Date.now());
    this.sendRaw(`PRIVMSG #${channel} :${message}`);
  }

  async reply(channel: string, parentId: string, message: string): Promise<void> {
    channel = channel.toLowerCase().replace('#', '');
    
    if (!this.canSendMessage(channel)) {
      await this.waitForMessageSlot(channel);
    }
    
    this.msgTimestamps.push(Date.now());
    this.sendRaw(`@reply-parent-msg-id=${parentId} PRIVMSG #${channel} :${message}`);
  }

  /**
   * Send a P2P signal message (invisible to users)
   */
  sendSignal(channel: string, signal: P2PSignal): void {
    channel = channel.toLowerCase().replace('#', '');
    
    let tags = `@comfyjs-signal=${signal.type};instance-id=${signal.instanceId}`;
    if (signal.replyTo) tags += `;reply-to=${signal.replyTo}`;
    if (signal.sdp) tags += `;sdp=${this.escapeTagValue(signal.sdp)}`;
    if (signal.candidate) tags += `;candidate=${this.escapeTagValue(signal.candidate)}`;
    
    // Zero-width space makes the message invisible if somehow displayed
    this.sendRaw(`${tags} PRIVMSG #${channel} :\u200B`);
  }

  private escapeTagValue(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\:')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/ /g, '\\s');
  }

  private sendRaw(message: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log('Cannot send, not connected');
      return;
    }
    this.log('→ ' + message);
    this.ws.send(message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Rate Limiting
  // ─────────────────────────────────────────────────────────────────────────

  private canSendMessage(channel: string): boolean {
    const now = Date.now();
    const cutoff = now - MSG_RATE_WINDOW_MS;
    this.msgTimestamps = this.msgTimestamps.filter(ts => ts > cutoff);
    
    const limit = this.isMod.get(channel) ? MSG_RATE_LIMIT_MOD : MSG_RATE_LIMIT;
    return this.msgTimestamps.length < limit;
  }

  private async waitForMessageSlot(channel: string): Promise<void> {
    while (!this.canSendMessage(channel)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private canJoin(): boolean {
    const now = Date.now();
    const cutoff = now - JOIN_RATE_WINDOW_MS;
    this.joinTimestamps = this.joinTimestamps.filter(ts => ts > cutoff);
    return this.joinTimestamps.length < JOIN_RATE_LIMIT;
  }

  private async waitForJoinSlot(): Promise<void> {
    while (!this.canJoin()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Call this when we detect we're a mod in a channel (for rate limit adjustment)
   */
  setModStatus(channel: string, isMod: boolean): void {
    this.isMod.set(channel.toLowerCase().replace('#', ''), isMod);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────

  get connected(): boolean {
    return this.isConnected;
  }

  get username(): string {
    return this.nick;
  }

  private log(msg: string): void {
    if (this.options.debug) {
      console.log(`[ComfyJS IRC] ${msg}`);
    }
  }
}
