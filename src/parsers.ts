// ═══════════════════════════════════════════════════════════════════════════
// COMFY.JS v2 - IRC Message Parsers
// ═══════════════════════════════════════════════════════════════════════════

import type { IRCMessage, UserFlags, UserExtra, ChatModeFlags, P2PSignal } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// IRC Tag Parser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse IRC tags string into a key-value object
 * @example "@badge-info=subscriber/3;badges=subscriber/3,premium/1" -> { "badge-info": "subscriber/3", ... }
 */
export function parseIRCTags(tagString: string): Record<string, string> {
  const tags: Record<string, string> = {};
  if (!tagString || tagString === '') return tags;

  const parts = tagString.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) {
      tags[part] = '';
    } else {
      const key = part.slice(0, idx);
      const value = part.slice(idx + 1)
        // Unescape IRC tag values
        .replace(/\\s/g, ' ')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\:/g, ';')
        .replace(/\\\\/g, '\\');
      tags[key] = value;
    }
  }
  return tags;
}

// ─────────────────────────────────────────────────────────────────────────────
// IRC Message Parser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a raw IRC message into structured format
 * @example "@tags :nick!user@host COMMAND #channel :message"
 */
export function parseIRCMessage(raw: string): IRCMessage {
  const result: IRCMessage = {
    raw,
    tags: {},
    prefix: null,
    nick: null,
    user: null,
    host: null,
    command: '',
    params: [],
    channel: null,
    message: null,
  };

  let pos = 0;
  const len = raw.length;

  // Parse tags (starts with @)
  if (raw[pos] === '@') {
    const spaceIdx = raw.indexOf(' ', pos);
    if (spaceIdx === -1) return result;
    result.tags = parseIRCTags(raw.slice(1, spaceIdx));
    pos = spaceIdx + 1;
  }

  // Skip leading spaces
  while (pos < len && raw[pos] === ' ') pos++;

  // Parse prefix (starts with :)
  if (raw[pos] === ':') {
    const spaceIdx = raw.indexOf(' ', pos);
    if (spaceIdx === -1) return result;
    result.prefix = raw.slice(pos + 1, spaceIdx);
    pos = spaceIdx + 1;

    // Parse nick!user@host from prefix
    const prefix = result.prefix;
    const bangIdx = prefix.indexOf('!');
    const atIdx = prefix.indexOf('@');
    
    if (bangIdx !== -1 && atIdx !== -1) {
      result.nick = prefix.slice(0, bangIdx);
      result.user = prefix.slice(bangIdx + 1, atIdx);
      result.host = prefix.slice(atIdx + 1);
    } else if (atIdx !== -1) {
      result.nick = prefix.slice(0, atIdx);
      result.host = prefix.slice(atIdx + 1);
    } else {
      result.nick = prefix;
    }
  }

  // Skip spaces
  while (pos < len && raw[pos] === ' ') pos++;

  // Parse command
  const cmdSpaceIdx = raw.indexOf(' ', pos);
  if (cmdSpaceIdx === -1) {
    result.command = raw.slice(pos).toUpperCase();
    return result;
  }
  result.command = raw.slice(pos, cmdSpaceIdx).toUpperCase();
  pos = cmdSpaceIdx + 1;

  // Parse params
  while (pos < len) {
    // Skip spaces
    while (pos < len && raw[pos] === ' ') pos++;
    if (pos >= len) break;

    // Trailing param (starts with :)
    if (raw[pos] === ':') {
      result.params.push(raw.slice(pos + 1));
      break;
    }

    // Regular param
    const nextSpace = raw.indexOf(' ', pos);
    if (nextSpace === -1) {
      result.params.push(raw.slice(pos));
      break;
    }
    result.params.push(raw.slice(pos, nextSpace));
    pos = nextSpace + 1;
  }

  // Extract channel and message for common commands
  if (result.params.length > 0) {
    const firstParam = result.params[0];
    if (firstParam.startsWith('#')) {
      result.channel = firstParam.slice(1).toLowerCase();
    }
  }
  if (result.params.length > 1) {
    result.message = result.params[result.params.length - 1];
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// User Flags Parser
// ─────────────────────────────────────────────────────────────────────────────

export function parseUserFlags(tags: Record<string, string>, channel: string): UserFlags {
  const badges = tags.badges || '';
  const nick = tags['display-name']?.toLowerCase() || '';
  
  return {
    broadcaster: badges.includes('broadcaster/') || nick === channel.toLowerCase(),
    mod: tags.mod === '1' || badges.includes('moderator/'),
    vip: badges.includes('vip/'),
    subscriber: tags.subscriber === '1' || badges.includes('subscriber/') || badges.includes('founder/'),
    founder: badges.includes('founder/'),
    highlighted: tags['msg-id'] === 'highlighted-message',
    customReward: !!tags['custom-reward-id'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Emotes Parser
// ─────────────────────────────────────────────────────────────────────────────

export function parseEmotes(emoteTag: string): Record<string, string[]> | undefined {
  if (!emoteTag || emoteTag === '') return undefined;
  
  const emotes: Record<string, string[]> = {};
  const emoteParts = emoteTag.split('/');
  
  for (const part of emoteParts) {
    const [emoteId, positions] = part.split(':');
    if (emoteId && positions) {
      emotes[emoteId] = positions.split(',');
    }
  }
  
  return Object.keys(emotes).length > 0 ? emotes : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Badges Parser
// ─────────────────────────────────────────────────────────────────────────────

export function parseBadges(badgeTag: string): Record<string, string> {
  const badges: Record<string, string> = {};
  if (!badgeTag || badgeTag === '') return badges;
  
  const parts = badgeTag.split(',');
  for (const part of parts) {
    const [name, version] = part.split('/');
    if (name) {
      badges[name] = version || '';
    }
  }
  return badges;
}

// ─────────────────────────────────────────────────────────────────────────────
// Build UserExtra from IRC message
// ─────────────────────────────────────────────────────────────────────────────

export function buildUserExtra(msg: IRCMessage): UserExtra {
  const tags = msg.tags;
  const channel = msg.channel || '';
  
  return {
    id: tags['user-id'] || '',
    username: msg.nick || tags.login || '',
    displayName: tags['display-name'] || msg.nick || '',
    userColor: tags.color || '',
    channel,
    roomId: tags['room-id'] || '',
    messageId: tags.id || '',
    timestamp: parseInt(tags['tmi-sent-ts'] || '0', 10) || Date.now(),
    isEmoteOnly: tags['emote-only'] === '1',
    messageType: tags['msg-id'] || 'chat',
    messageEmotes: parseEmotes(tags.emotes),
    badges: parseBadges(tags.badges),
    badgeInfo: parseBadges(tags['badge-info']),
    flags: parseUserFlags(tags, channel),
    customRewardId: tags['custom-reward-id'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat Mode Flags Parser
// ─────────────────────────────────────────────────────────────────────────────

export function parseChatModeFlags(tags: Record<string, string>): ChatModeFlags {
  return {
    emoteOnly: tags['emote-only'] === '1',
    followersOnly: tags['followers-only'] !== '-1',
    followersOnlyMinutes: parseInt(tags['followers-only'] || '-1', 10),
    slowMode: tags.slow !== '0' && tags.slow !== undefined,
    slowModeSeconds: parseInt(tags.slow || '0', 10),
    subsOnly: tags['subs-only'] === '1',
    r9k: tags.r9k === '1',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// P2P Signal Parser (from IRC tags)
// ─────────────────────────────────────────────────────────────────────────────

export function parseP2PSignal(tags: Record<string, string>): P2PSignal | null {
  const signalType = tags['comfyjs-signal'] as P2PSignal['type'];
  if (!signalType) return null;

  return {
    type: signalType,
    instanceId: tags['instance-id'] || '',
    replyTo: tags['reply-to'],
    sdp: tags.sdp,
    candidate: tags.candidate,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub Tier Parser
// ─────────────────────────────────────────────────────────────────────────────

export function parseSubTier(plan: string): { prime: boolean; plan: string; planName: string } {
  const isPrime = plan === 'Prime';
  let tier = '1000';
  let planName = 'Tier 1';

  if (plan === '2000') {
    tier = '2000';
    planName = 'Tier 2';
  } else if (plan === '3000') {
    tier = '3000';
    planName = 'Tier 3';
  } else if (isPrime) {
    tier = 'Prime';
    planName = 'Prime';
  }

  return { prime: isPrime, plan: tier, planName };
}

// ─────────────────────────────────────────────────────────────────────────────
// Command Parser
// ─────────────────────────────────────────────────────────────────────────────

export function parseCommand(message: string, prefix = '!'): { command: string; args: string } | null {
  // Standard command: !command args
  if (message.startsWith(prefix)) {
    const spaceIdx = message.indexOf(' ');
    if (spaceIdx === -1) {
      return { command: message.slice(prefix.length).toLowerCase(), args: '' };
    }
    return {
      command: message.slice(prefix.length, spaceIdx).toLowerCase(),
      args: message.slice(spaceIdx + 1),
    };
  }
  
  // Alternative format: @user !command args (common in replies)
  const parts = message.split(' ');
  if (parts.length >= 2 && parts[0].startsWith('@') && parts[1].startsWith(prefix)) {
    const command = parts[1].slice(prefix.length).toLowerCase();
    const args = parts.slice(2).join(' ');
    return { command, args };
  }
  
  return null;
}
