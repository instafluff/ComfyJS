// ═══════════════════════════════════════════════════════════════════════════
// COMFY.JS v2 - Parser Tests
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  parseIRCTags,
  parseIRCMessage,
  parseUserFlags,
  parseEmotes,
  parseBadges,
  buildUserExtra,
  parseSubTier,
  parseCommand,
  parseP2PSignal,
} from './parsers';

// ─────────────────────────────────────────────────────────────────────────────
// IRC Tag Parser Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('parseIRCTags', () => {
  it('should parse simple tags', () => {
    const tags = parseIRCTags('color=#FF0000;display-name=TestUser');
    expect(tags).toEqual({
      'color': '#FF0000',
      'display-name': 'TestUser',
    });
  });

  it('should handle empty tag values', () => {
    const tags = parseIRCTags('emotes=;color=#FF0000');
    expect(tags).toEqual({
      'emotes': '',
      'color': '#FF0000',
    });
  });

  it('should unescape special characters', () => {
    const tags = parseIRCTags('message=hello\\sworld\\:\\n');
    expect(tags.message).toBe('hello world;\n');
  });

  it('should return empty object for empty string', () => {
    expect(parseIRCTags('')).toEqual({});
  });

  it('should parse complex badge-info', () => {
    const tags = parseIRCTags('badge-info=subscriber/36;badges=broadcaster/1,subscriber/3012');
    expect(tags['badge-info']).toBe('subscriber/36');
    expect(tags.badges).toBe('broadcaster/1,subscriber/3012');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IRC Message Parser Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('parseIRCMessage', () => {
  it('should parse a PRIVMSG with tags', () => {
    const raw = '@badge-info=subscriber/1;badges=subscriber/0;color=#FF0000;display-name=TestUser;emotes=;flags=;id=abc123;mod=0;room-id=12345;subscriber=1;tmi-sent-ts=1234567890;user-id=67890;user-type= :testuser!testuser@testuser.tmi.twitch.tv PRIVMSG #channel :Hello World!';
    const msg = parseIRCMessage(raw);

    expect(msg.command).toBe('PRIVMSG');
    expect(msg.channel).toBe('channel');
    expect(msg.message).toBe('Hello World!');
    expect(msg.nick).toBe('testuser');
    expect(msg.tags['display-name']).toBe('TestUser');
    expect(msg.tags['subscriber']).toBe('1');
  });

  it('should parse PING message', () => {
    const msg = parseIRCMessage('PING :tmi.twitch.tv');
    expect(msg.command).toBe('PING');
    expect(msg.params[0]).toBe('tmi.twitch.tv');
  });

  it('should parse JOIN message', () => {
    const msg = parseIRCMessage(':testuser!testuser@testuser.tmi.twitch.tv JOIN #channel');
    expect(msg.command).toBe('JOIN');
    expect(msg.channel).toBe('channel');
    expect(msg.nick).toBe('testuser');
  });

  it('should parse PART message', () => {
    const msg = parseIRCMessage(':testuser!testuser@testuser.tmi.twitch.tv PART #channel');
    expect(msg.command).toBe('PART');
    expect(msg.channel).toBe('channel');
  });

  it('should parse numeric commands (001 welcome)', () => {
    const msg = parseIRCMessage(':tmi.twitch.tv 001 testuser :Welcome, GLHF!');
    expect(msg.command).toBe('001');
    expect(msg.params).toContain('testuser');
  });

  it('should parse USERNOTICE (sub)', () => {
    const raw = '@badge-info=subscriber/0;badges=subscriber/0;color=#FF0000;display-name=TestUser;emotes=;flags=;id=abc123;login=testuser;mod=0;msg-id=sub;msg-param-cumulative-months=1;msg-param-months=0;msg-param-multimonth-duration=1;msg-param-multimonth-tenure=0;msg-param-should-share-streak=0;msg-param-sub-plan-name=Channel\\sSubscription;msg-param-sub-plan=1000;msg-param-was-gifted=false;room-id=12345;subscriber=1;system-msg=TestUser\\ssubscribed\\sat\\sTier\\s1.;tmi-sent-ts=1234567890;user-id=67890;user-type= :tmi.twitch.tv USERNOTICE #channel';
    const msg = parseIRCMessage(raw);

    expect(msg.command).toBe('USERNOTICE');
    expect(msg.tags['msg-id']).toBe('sub');
    expect(msg.tags['msg-param-sub-plan']).toBe('1000');
    expect(msg.channel).toBe('channel');
  });

  it('should handle action messages (/me)', () => {
    const raw = '@badges=subscriber/0 :testuser!testuser@testuser.tmi.twitch.tv PRIVMSG #channel :\x01ACTION does something\x01';
    const msg = parseIRCMessage(raw);
    expect(msg.message).toBe('\x01ACTION does something\x01');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// User Flags Parser Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('parseUserFlags', () => {
  it('should detect broadcaster', () => {
    const flags = parseUserFlags({ badges: 'broadcaster/1' }, 'channel');
    expect(flags.broadcaster).toBe(true);
  });

  it('should detect moderator', () => {
    const flags = parseUserFlags({ mod: '1', badges: 'moderator/1' }, 'channel');
    expect(flags.mod).toBe(true);
  });

  it('should detect VIP', () => {
    const flags = parseUserFlags({ badges: 'vip/1' }, 'channel');
    expect(flags.vip).toBe(true);
  });

  it('should detect subscriber', () => {
    const flags = parseUserFlags({ subscriber: '1', badges: 'subscriber/12' }, 'channel');
    expect(flags.subscriber).toBe(true);
  });

  it('should detect founder (as subscriber too)', () => {
    const flags = parseUserFlags({ badges: 'founder/0' }, 'channel');
    expect(flags.founder).toBe(true);
    expect(flags.subscriber).toBe(true);
  });

  it('should detect highlighted message', () => {
    const flags = parseUserFlags({ 'msg-id': 'highlighted-message' }, 'channel');
    expect(flags.highlighted).toBe(true);
  });

  it('should detect custom reward', () => {
    const flags = parseUserFlags({ 'custom-reward-id': 'abc-123' }, 'channel');
    expect(flags.customReward).toBe(true);
  });

  it('should return all false for empty tags', () => {
    const flags = parseUserFlags({}, 'channel');
    expect(flags.broadcaster).toBe(false);
    expect(flags.mod).toBe(false);
    expect(flags.vip).toBe(false);
    expect(flags.subscriber).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Emotes Parser Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('parseEmotes', () => {
  it('should parse single emote', () => {
    const emotes = parseEmotes('25:0-4');
    expect(emotes).toEqual({ '25': ['0-4'] });
  });

  it('should parse multiple emotes', () => {
    const emotes = parseEmotes('25:0-4,6-10/1902:12-16');
    expect(emotes).toEqual({
      '25': ['0-4', '6-10'],
      '1902': ['12-16'],
    });
  });

  it('should return undefined for empty string', () => {
    expect(parseEmotes('')).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Badges Parser Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('parseBadges', () => {
  it('should parse multiple badges', () => {
    const badges = parseBadges('broadcaster/1,subscriber/12,premium/1');
    expect(badges).toEqual({
      'broadcaster': '1',
      'subscriber': '12',
      'premium': '1',
    });
  });

  it('should handle empty badge string', () => {
    expect(parseBadges('')).toEqual({});
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sub Tier Parser Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('parseSubTier', () => {
  it('should parse Tier 1 (1000)', () => {
    const tier = parseSubTier('1000');
    expect(tier).toEqual({ prime: false, plan: '1000', planName: 'Tier 1' });
  });

  it('should parse Tier 2 (2000)', () => {
    const tier = parseSubTier('2000');
    expect(tier).toEqual({ prime: false, plan: '2000', planName: 'Tier 2' });
  });

  it('should parse Tier 3 (3000)', () => {
    const tier = parseSubTier('3000');
    expect(tier).toEqual({ prime: false, plan: '3000', planName: 'Tier 3' });
  });

  it('should parse Prime', () => {
    const tier = parseSubTier('Prime');
    expect(tier).toEqual({ prime: true, plan: 'Prime', planName: 'Prime' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Command Parser Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('parseCommand', () => {
  it('should parse command without arguments', () => {
    const result = parseCommand('!hello');
    expect(result).toEqual({ command: 'hello', args: '' });
  });

  it('should parse command with arguments', () => {
    const result = parseCommand('!greet everyone here');
    expect(result).toEqual({ command: 'greet', args: 'everyone here' });
  });

  it('should return null for non-commands', () => {
    expect(parseCommand('hello world')).toBeNull();
  });

  it('should handle custom prefix', () => {
    const result = parseCommand('?help me', '?');
    expect(result).toEqual({ command: 'help', args: 'me' });
  });

  it('should lowercase command', () => {
    const result = parseCommand('!SHOUT');
    expect(result?.command).toBe('shout');
  });

  it('should parse @user !command format', () => {
    const result = parseCommand('@SomeUser !hello world');
    expect(result).toEqual({ command: 'hello', args: 'world' });
  });

  it('should parse @user !command without args', () => {
    const result = parseCommand('@SomeUser !ping');
    expect(result).toEqual({ command: 'ping', args: '' });
  });

  it('should return null for @ mention without command', () => {
    expect(parseCommand('@SomeUser hello world')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P2P Signal Parser Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('parseP2PSignal', () => {
  it('should parse discover signal', () => {
    const signal = parseP2PSignal({
      'comfyjs-signal': 'discover',
      'instance-id': 'abc123',
    });
    expect(signal).toEqual({
      type: 'discover',
      instanceId: 'abc123',
      replyTo: undefined,
      sdp: undefined,
      candidate: undefined,
    });
  });

  it('should parse leader signal with replyTo', () => {
    const signal = parseP2PSignal({
      'comfyjs-signal': 'leader',
      'instance-id': 'leader1',
      'reply-to': 'abc123',
    });
    expect(signal?.type).toBe('leader');
    expect(signal?.instanceId).toBe('leader1');
    expect(signal?.replyTo).toBe('abc123');
  });

  it('should return null for non-signal messages', () => {
    const signal = parseP2PSignal({ 'display-name': 'TestUser' });
    expect(signal).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildUserExtra Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('buildUserExtra', () => {
  it('should build complete extra object (v1 parity)', () => {
    const msg = parseIRCMessage('@color=#FF0000;display-name=TestUser;user-id=12345;id=msg-abc;room-id=67890;tmi-sent-ts=1234567890123;badges=subscriber/12 :testuser!testuser@testuser.tmi.twitch.tv PRIVMSG #channel :Hello');
    const extra = buildUserExtra(msg);

    // v1 parity: `id` is the message ID, not user ID
    expect(extra.id).toBe('msg-abc');
    expect(extra.userId).toBe('12345');
    expect(extra.username).toBe('testuser');
    expect(extra.displayName).toBe('TestUser');
    expect(extra.userColor).toBe('#FF0000');
    expect(extra.channel).toBe('channel');
    expect(extra.roomId).toBe('67890');
    expect(extra.userBadges.subscriber).toBe('12');
    expect(extra.timestamp).toBe('1234567890123');
    expect(extra.userState['user-id']).toBe('12345');
  });
});
