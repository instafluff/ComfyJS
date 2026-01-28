// ═══════════════════════════════════════════════════════════════════════════
// COMFY.JS v2 - IRC Client Tests
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IRCClient } from './irc';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: ((event: { reason: string }) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;

  sent: string[] = [];

  constructor(public url: string) {
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    }, 10);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close(_code?: number, _reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ reason: 'closed' });
  }

  // Test helpers
  simulateMessage(data: string) {
    this.onmessage?.({ data });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('IRCClient', () => {
  let originalWebSocket: typeof globalThis.WebSocket;
  let mockWS: MockWebSocket;

  beforeEach(() => {
    originalWebSocket = globalThis.WebSocket;
    (globalThis as unknown as { WebSocket: typeof MockWebSocket }).WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        mockWS = this;
      }
    } as unknown as typeof WebSocket;
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
  });

  describe('constructor', () => {
    it('should create client with default options', () => {
      const client = new IRCClient();
      expect(client.connected).toBe(false);
    });

    it('should accept debug option', () => {
      const client = new IRCClient({ debug: true });
      expect(client).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should connect to IRC WebSocket', async () => {
      const client = new IRCClient();
      
      const connectPromise = client.connect('oauth:test123', 'testuser');
      
      // Wait for WebSocket to "connect"
      await new Promise(r => setTimeout(r, 15));
      
      // Simulate successful auth
      mockWS.simulateMessage(':tmi.twitch.tv 001 testuser :Welcome, GLHF!');
      
      await connectPromise;
      
      expect(client.connected).toBe(true);
      expect(client.username).toBe('testuser');
    });

    it('should send CAP REQ, PASS, and NICK on connect', async () => {
      const client = new IRCClient();
      
      const connectPromise = client.connect('oauth:test123', 'testuser');
      await new Promise(r => setTimeout(r, 15));
      mockWS.simulateMessage(':tmi.twitch.tv 001 testuser :Welcome, GLHF!');
      await connectPromise;

      expect(mockWS.sent.some(s => s.includes('CAP REQ'))).toBe(true);
      expect(mockWS.sent.some(s => s.includes('PASS oauth:test123'))).toBe(true);
      expect(mockWS.sent.some(s => s.includes('NICK testuser'))).toBe(true);
    });

    it('should add oauth: prefix if missing', async () => {
      const client = new IRCClient();
      
      const connectPromise = client.connect('test123', 'testuser');
      await new Promise(r => setTimeout(r, 15));
      mockWS.simulateMessage(':tmi.twitch.tv 001 testuser :Welcome, GLHF!');
      await connectPromise;

      expect(mockWS.sent.some(s => s.includes('PASS oauth:test123'))).toBe(true);
    });
  });

  describe('PING/PONG', () => {
    it('should respond to PING with PONG', async () => {
      const client = new IRCClient();
      
      const connectPromise = client.connect('oauth:test', 'user');
      await new Promise(r => setTimeout(r, 15));
      mockWS.simulateMessage(':tmi.twitch.tv 001 user :Welcome, GLHF!');
      await connectPromise;

      // Clear sent messages
      mockWS.sent = [];

      // Simulate PING
      mockWS.simulateMessage('PING :tmi.twitch.tv');

      expect(mockWS.sent.some(s => s.includes('PONG'))).toBe(true);
    });
  });

  describe('join/part', () => {
    it('should send JOIN command', async () => {
      const client = new IRCClient();
      
      const connectPromise = client.connect('oauth:test', 'user');
      await new Promise(r => setTimeout(r, 15));
      mockWS.simulateMessage(':tmi.twitch.tv 001 user :Welcome, GLHF!');
      await connectPromise;

      mockWS.sent = [];
      await client.join('testchannel');

      expect(mockWS.sent).toContain('JOIN #testchannel');
    });

    it('should normalize channel name (remove # prefix)', async () => {
      const client = new IRCClient();
      
      const connectPromise = client.connect('oauth:test', 'user');
      await new Promise(r => setTimeout(r, 15));
      mockWS.simulateMessage(':tmi.twitch.tv 001 user :Welcome, GLHF!');
      await connectPromise;

      mockWS.sent = [];
      await client.join('#testchannel');

      expect(mockWS.sent).toContain('JOIN #testchannel');
    });

    it('should send PART command', async () => {
      const client = new IRCClient();
      
      const connectPromise = client.connect('oauth:test', 'user');
      await new Promise(r => setTimeout(r, 15));
      mockWS.simulateMessage(':tmi.twitch.tv 001 user :Welcome, GLHF!');
      await connectPromise;

      await client.join('channel');
      mockWS.sent = [];
      
      client.part('channel');

      expect(mockWS.sent).toContain('PART #channel');
    });
  });

  describe('say', () => {
    it('should send PRIVMSG', async () => {
      const client = new IRCClient();
      
      const connectPromise = client.connect('oauth:test', 'user');
      await new Promise(r => setTimeout(r, 15));
      mockWS.simulateMessage(':tmi.twitch.tv 001 user :Welcome, GLHF!');
      await connectPromise;

      mockWS.sent = [];
      await client.say('channel', 'Hello World!');

      expect(mockWS.sent).toContain('PRIVMSG #channel :Hello World!');
    });
  });

  describe('reply', () => {
    it('should send reply with parent message ID', async () => {
      const client = new IRCClient();
      
      const connectPromise = client.connect('oauth:test', 'user');
      await new Promise(r => setTimeout(r, 15));
      mockWS.simulateMessage(':tmi.twitch.tv 001 user :Welcome, GLHF!');
      await connectPromise;

      mockWS.sent = [];
      await client.reply('channel', 'abc-123', 'My reply');

      expect(mockWS.sent.some(s => 
        s.includes('@reply-parent-msg-id=abc-123') && s.includes('My reply')
      )).toBe(true);
    });
  });

  describe('message handling', () => {
    it('should call onMessage handler for PRIVMSG', async () => {
      const client = new IRCClient();
      const handler = vi.fn();
      client.onMessage = handler;
      
      const connectPromise = client.connect('oauth:test', 'user');
      await new Promise(r => setTimeout(r, 15));
      mockWS.simulateMessage(':tmi.twitch.tv 001 user :Welcome, GLHF!');
      await connectPromise;

      mockWS.simulateMessage('@display-name=TestUser :testuser!testuser@testuser.tmi.twitch.tv PRIVMSG #channel :Hello');

      expect(handler).toHaveBeenCalled();
      const msg = handler.mock.calls[0][0];
      expect(msg.command).toBe('PRIVMSG');
      expect(msg.message).toBe('Hello');
    });
  });

  describe('disconnect', () => {
    it('should close WebSocket and reset state', async () => {
      const client = new IRCClient();
      
      const connectPromise = client.connect('oauth:test', 'user');
      await new Promise(r => setTimeout(r, 15));
      mockWS.simulateMessage(':tmi.twitch.tv 001 user :Welcome, GLHF!');
      await connectPromise;

      expect(client.connected).toBe(true);
      
      client.disconnect();
      
      expect(client.connected).toBe(false);
    });
  });
});
