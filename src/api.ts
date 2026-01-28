// ═══════════════════════════════════════════════════════════════════════════
// COMFY.JS v2 - Twitch REST API Client
// ═══════════════════════════════════════════════════════════════════════════

import type { EventSubSubscription } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = 'https://api.twitch.tv/helix';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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

interface APIResponse<T> {
  data: T[];
  pagination?: { cursor?: string };
  total?: number;
}

interface EventSubAPIResponse {
  data: EventSubSubscription[];
  total: number;
  total_cost: number;
  max_total_cost: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Client Class
// ─────────────────────────────────────────────────────────────────────────────

export class TwitchAPI {
  private clientId: string;
  private accessToken: string;
  private debug: boolean;

  constructor(options: TwitchAPIOptions) {
    this.clientId = options.clientId;
    this.accessToken = options.accessToken.replace('oauth:', '');
    this.debug = options.debug ?? false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HTTP Methods
  // ─────────────────────────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    
    this.log(`${method} ${endpoint}`);
    
    const response = await fetch(url, {
      method,
      headers: {
        'Client-ID': this.clientId,
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twitch API error ${response.status}: ${error}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  private async get<T>(endpoint: string): Promise<T> {
    return this.request<T>('GET', endpoint);
  }

  private async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>('POST', endpoint, body);
  }

  private async delete(endpoint: string): Promise<void> {
    await this.request<void>('DELETE', endpoint);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Users
  // ─────────────────────────────────────────────────────────────────────────

  async getUsers(logins?: string[], ids?: string[]): Promise<TwitchUser[]> {
    const params = new URLSearchParams();
    
    if (logins) {
      for (const login of logins) {
        params.append('login', login);
      }
    }
    
    if (ids) {
      for (const id of ids) {
        params.append('id', id);
      }
    }
    
    const query = params.toString();
    const response = await this.get<APIResponse<{
      id: string;
      login: string;
      display_name: string;
      type: string;
      broadcaster_type: string;
      description: string;
      profile_image_url: string;
      offline_image_url: string;
      created_at: string;
    }>>(`/users${query ? '?' + query : ''}`);
    
    return response.data.map(u => ({
      id: u.id,
      login: u.login,
      displayName: u.display_name,
      type: u.type,
      broadcasterType: u.broadcaster_type,
      description: u.description,
      profileImageUrl: u.profile_image_url,
      offlineImageUrl: u.offline_image_url,
      createdAt: u.created_at,
    }));
  }

  async getCurrentUser(): Promise<TwitchUser | null> {
    const users = await this.getUsers();
    return users[0] || null;
  }

  async getUserByLogin(login: string): Promise<TwitchUser | null> {
    const users = await this.getUsers([login]);
    return users[0] || null;
  }

  async getUserById(id: string): Promise<TwitchUser | null> {
    const users = await this.getUsers(undefined, [id]);
    return users[0] || null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Channels
  // ─────────────────────────────────────────────────────────────────────────

  async getChannelInfo(broadcasterId: string): Promise<TwitchChannel | null> {
    const response = await this.get<APIResponse<{
      broadcaster_id: string;
      broadcaster_login: string;
      broadcaster_name: string;
      game_id: string;
      game_name: string;
      title: string;
      delay: number;
      tags: string[];
      broadcaster_language: string;
    }>>(`/channels?broadcaster_id=${broadcasterId}`);
    
    const c = response.data[0];
    if (!c) return null;
    
    return {
      broadcasterId: c.broadcaster_id,
      broadcasterLogin: c.broadcaster_login,
      broadcasterName: c.broadcaster_name,
      gameId: c.game_id,
      gameName: c.game_name,
      title: c.title,
      delay: c.delay,
      tags: c.tags,
      language: c.broadcaster_language,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EventSub Subscriptions
  // ─────────────────────────────────────────────────────────────────────────

  async createEventSubSubscription(
    sessionId: string,
    type: string,
    version: string,
    condition: Record<string, string>
  ): Promise<EventSubSubscription> {
    const response = await this.post<EventSubAPIResponse>('/eventsub/subscriptions', {
      type,
      version,
      condition,
      transport: {
        method: 'websocket',
        session_id: sessionId,
      },
    });
    
    const sub = response.data[0];
    if (!sub) {
      throw new Error('Failed to create EventSub subscription');
    }
    
    this.log(`Created EventSub subscription: ${type}`);
    return sub;
  }

  async deleteEventSubSubscription(id: string): Promise<void> {
    await this.delete(`/eventsub/subscriptions?id=${id}`);
    this.log(`Deleted EventSub subscription: ${id}`);
  }

  async getEventSubSubscriptions(): Promise<{
    subscriptions: EventSubSubscription[];
    total: number;
    totalCost: number;
    maxTotalCost: number;
  }> {
    const response = await this.get<EventSubAPIResponse>('/eventsub/subscriptions');
    
    return {
      subscriptions: response.data,
      total: response.total,
      totalCost: response.total_cost,
      maxTotalCost: response.max_total_cost,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Chat
  // ─────────────────────────────────────────────────────────────────────────

  async getChatters(broadcasterId: string, moderatorId: string): Promise<{
    users: Array<{ userId: string; userLogin: string; userName: string }>;
    total: number;
  }> {
    const response = await this.get<APIResponse<{
      user_id: string;
      user_login: string;
      user_name: string;
    }>>(`/chat/chatters?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`);
    
    return {
      users: response.data.map(u => ({
        userId: u.user_id,
        userLogin: u.user_login,
        userName: u.user_name,
      })),
      total: response.total || response.data.length,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Moderation
  // ─────────────────────────────────────────────────────────────────────────

  async banUser(
    broadcasterId: string,
    moderatorId: string,
    userId: string,
    reason?: string,
    duration?: number
  ): Promise<void> {
    await this.post('/moderation/bans', {
      broadcaster_id: broadcasterId,
      moderator_id: moderatorId,
      data: {
        user_id: userId,
        reason: reason || '',
        duration: duration, // undefined = permanent ban
      },
    });
  }

  async unbanUser(
    broadcasterId: string,
    moderatorId: string,
    userId: string
  ): Promise<void> {
    await this.delete(
      `/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}&user_id=${userId}`
    );
  }

  async deleteMessage(
    broadcasterId: string,
    moderatorId: string,
    messageId: string
  ): Promise<void> {
    await this.delete(
      `/moderation/chat?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}&message_id=${messageId}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Token Validation
  // ─────────────────────────────────────────────────────────────────────────

  async validateToken(): Promise<{
    clientId: string;
    login: string;
    userId: string;
    scopes: string[];
    expiresIn: number;
  } | null> {
    try {
      const response = await fetch('https://id.twitch.tv/oauth2/validate', {
        headers: {
          'Authorization': `OAuth ${this.accessToken}`,
        },
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json() as {
        client_id: string;
        login: string;
        user_id: string;
        scopes: string[];
        expires_in: number;
      };
      
      return {
        clientId: data.client_id,
        login: data.login,
        userId: data.user_id,
        scopes: data.scopes,
        expiresIn: data.expires_in,
      };
    } catch {
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────

  setToken(accessToken: string): void {
    this.accessToken = accessToken.replace('oauth:', '');
  }

  private log(msg: string): void {
    if (this.debug) {
      console.log(`[ComfyJS API] ${msg}`);
    }
  }
}
