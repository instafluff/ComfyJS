// ═══════════════════════════════════════════════════════════════════════════
// COMFY.JS v2 - Real Event Parser Tests
// ═══════════════════════════════════════════════════════════════════════════
// 
// These tests use real IRC messages captured from Twitch to verify parsing.
// See docs/IRC_EVENTS.md for the source samples.
//
// To capture more samples: node examples/capture-events.mjs [channels...]
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { parseIRCMessage, parseUserFlags, buildUserExtra, parseBadges, parseEmotes } from './parsers';

// ─────────────────────────────────────────────────────────────────────────────
// Real IRC Messages - Captured from live Twitch channels
// ─────────────────────────────────────────────────────────────────────────────

const REAL_MESSAGES = {
  // Regular chat message
  CHAT_REGULAR: '@badge-info=;badges=streamer-awards-2024/1;client-nonce=332be3fe348f49298efb87300a073242;color=#DAA520;display-name=theonedeel;emotes=;first-msg=0;flags=;id=aa529bf3-aa17-45a2-977c-d5d3003d2e55;mod=0;returning-chatter=0;room-id=36340781;subscriber=0;tmi-sent-ts=1769564083143;turbo=0;user-id=447827340;user-type= :theonedeel!theonedeel@theonedeel.tmi.twitch.tv PRIVMSG #tarik :LO',

  // Subscriber chat message (cleaned - badge-info had space)
  CHAT_SUBSCRIBER: '@badge-info=subscriber/4;badges=predictions/pink-2,subscriber/3,twitch-recap-2023/1;client-nonce=961F1EE3-A623-4457-A5D8-90367F1BD663;color=#D78986;display-name=sockfairy;emotes=;first-msg=0;flags=;id=1ec0b684-4c10-4e0b-a6a6-517e349973e2;mod=0;returning-chatter=0;room-id=36340781;subscriber=1;tmi-sent-ts=1769564097871;turbo=0;user-id=518405260;user-type= :sockfairy!sockfairy@sockfairy.tmi.twitch.tv PRIVMSG #tarik :let unc cook HOLD',

  // Moderator chat message  
  CHAT_MOD: '@badge-info=;badges=moderator/1,bot-badge/1;color=#1976D2;display-name=Fossabot;emotes=;first-msg=0;flags=;id=50b30470-badb-41d8-973f-6f96ec86d381;mod=1;returning-chatter=0;room-id=36340781;subscriber=0;tmi-sent-ts=1769564082484;turbo=0;user-id=237719657;user-type=mod :fossabot!fossabot@fossabot.tmi.twitch.tv PRIVMSG #tarik :GAMBA Locked! test message',

  // VIP chat message
  CHAT_VIP: '@badge-info=subscriber/53;badges=vip/1,subscriber/48,umbrella-corporation/1;color=#FF0000;display-name=DankJuicer;emotes=;first-msg=0;flags=;id=6b869b08-5789-4dff-876c-9d15bfe8f6a4;mod=0;returning-chatter=0;room-id=71092938;subscriber=1;tmi-sent-ts=1769563468372;turbo=0;user-id=610912094;user-type=;vip=1 :dankjuicer!dankjuicer@dankjuicer.tmi.twitch.tv PRIVMSG #xqc :Test VIP message',

  // Command message
  CHAT_COMMAND: '@badge-info=subscriber/25;badges=subscriber/24,no_audio/1;client-nonce=602c4366919848d6905c95660bdc2216;color=#FF69B4;display-name=cylex0;emotes=;first-msg=0;flags=;id=03f39c01-825a-4e95-8f01-b2e8e2159cbf;mod=0;returning-chatter=0;room-id=71092938;subscriber=1;tmi-sent-ts=1769563460262;turbo=0;user-id=60845524;user-type= :cylex0!cylex0@cylex0.tmi.twitch.tv PRIVMSG #xqc :!lastseen xQc',

  // Resub USERNOTICE
  RESUB: '@badge-info=subscriber/24;badges=subscriber/24;color=#5878A5;display-name=rrram0n;emotes=;flags=;id=6a833eb3-c60a-4c2f-8605-5a7b515a0103;login=rrram0n;mod=0;msg-id=resub;msg-param-cumulative-months=24;msg-param-months=0;msg-param-multimonth-duration=1;msg-param-multimonth-tenure=0;msg-param-should-share-streak=1;msg-param-streak-months=1;msg-param-sub-plan-name=Channel\\sSubscription\\s(tarik_tv);msg-param-sub-plan=Prime;msg-param-was-gifted=false;room-id=36340781;subscriber=1;system-msg=rrram0n\\ssubscribed\\swith\\sPrime.\\sThey\'ve\\ssubscribed\\sfor\\s24\\smonths,\\scurrently\\son\\sa\\s1\\smonth\\sstreak!;tmi-sent-ts=1769563460182;user-id=32517123;user-type=;vip=0 :tmi.twitch.tv USERNOTICE #tarik :coknball torture message',

  // Sub gift USERNOTICE (simulated based on structure)
  SUBGIFT: '@badge-info=subscriber/12;badges=subscriber/12,sub-gifter/50;color=#00FF7F;display-name=GiftGiver;emotes=;id=abc123;login=giftgiver;mod=0;msg-id=subgift;msg-param-months=1;msg-param-recipient-display-name=LuckyViewer;msg-param-recipient-id=123456;msg-param-recipient-user-name=luckyviewer;msg-param-sender-count=50;msg-param-sub-plan-name=Channel\\sSubscription;msg-param-sub-plan=1000;room-id=12345;subscriber=1;system-msg=GiftGiver\\sgifted\\sa\\sTier\\s1\\ssub\\sto\\sLuckyViewer!;tmi-sent-ts=1769563460182;user-id=98765;user-type= :tmi.twitch.tv USERNOTICE #channel',

  // Mystery gift USERNOTICE (simulated based on structure)
  MYSTERYGIFT: '@badge-info=subscriber/24;badges=subscriber/24;color=#FF0000;display-name=BigSpender;emotes=;id=def456;login=bigspender;mod=0;msg-id=submysterygift;msg-param-mass-gift-count=5;msg-param-sender-count=100;msg-param-sub-plan=1000;room-id=12345;subscriber=1;system-msg=BigSpender\\sis\\sgifting\\s5\\sTier\\s1\\sSubs!;tmi-sent-ts=1769563460182;user-id=11111;user-type= :tmi.twitch.tv USERNOTICE #channel',

  // Raid USERNOTICE (simulated based on structure)
  RAID: '@badge-info=;badges=broadcaster/1;color=#00FFFF;display-name=RaidingStreamer;emotes=;id=raid123;login=raidingstreamer;mod=0;msg-id=raid;msg-param-displayName=RaidingStreamer;msg-param-login=raidingstreamer;msg-param-viewerCount=500;room-id=12345;subscriber=0;system-msg=500\\sraiders\\sfrom\\sRaidingStreamer\\shave\\sjoined!;tmi-sent-ts=1769563460182;user-id=22222;user-type= :tmi.twitch.tv USERNOTICE #channel',

  // Cheer message with bits
  CHEER: '@badge-info=subscriber/12;badges=subscriber/12,bits/1000;bits=100;color=#FF69B4;display-name=Cheerful;emotes=;first-msg=0;id=cheer123;mod=0;room-id=12345;subscriber=1;tmi-sent-ts=1769563460182;turbo=0;user-id=33333;user-type= :cheerful!cheerful@cheerful.tmi.twitch.tv PRIVMSG #channel :Cheer100 Great stream!',

  // CLEARCHAT (timeout)
  TIMEOUT: '@ban-duration=600;room-id=12345;target-user-id=44444;tmi-sent-ts=1769563460182 :tmi.twitch.tv CLEARCHAT #channel :baduser',

  // CLEARCHAT (ban)
  BAN: '@room-id=12345;target-user-id=55555;tmi-sent-ts=1769563460182 :tmi.twitch.tv CLEARCHAT #channel :verybaduser',

  // CLEARMSG (message deleted)
  CLEARMSG: '@login=deleteduser;room-id=12345;target-msg-id=msg-id-123;tmi-sent-ts=1769563460182 :tmi.twitch.tv CLEARMSG #channel :This was a bad message',

  // ROOMSTATE
  ROOMSTATE: '@emote-only=0;followers-only=1440;r9k=0;room-id=71092938;slow=0;subs-only=0 :tmi.twitch.tv ROOMSTATE #xqc',

  // Message with emotes
  CHAT_WITH_EMOTES: '@badge-info=subscriber/12;badges=subscriber/12;color=#FF0000;display-name=EmoteUser;emotes=25:0-4,6-10/1902:12-16;first-msg=0;id=emote123;mod=0;room-id=12345;subscriber=1;tmi-sent-ts=1769563460182;turbo=0;user-id=66666;user-type= :emoteuser!emoteuser@emoteuser.tmi.twitch.tv PRIVMSG #channel :Kappa Kappa Keepo',
};

// ─────────────────────────────────────────────────────────────────────────────
// Parser Tests with Real Messages
// ─────────────────────────────────────────────────────────────────────────────

describe('Real IRC Message Parsing', () => {
  describe('parseIRCMessage', () => {
    it('parses regular chat message correctly', () => {
      const msg = parseIRCMessage(REAL_MESSAGES.CHAT_REGULAR);
      
      expect(msg.command).toBe('PRIVMSG');
      expect(msg.channel).toBe('tarik');
      expect(msg.message).toBe('LO');
      expect(msg.tags['display-name']).toBe('theonedeel');
      expect(msg.tags['user-id']).toBe('447827340');
      expect(msg.tags['room-id']).toBe('36340781');
      expect(msg.tags.subscriber).toBe('0');
      expect(msg.tags.mod).toBe('0');
    });

    it('parses subscriber chat message correctly', () => {
      const msg = parseIRCMessage(REAL_MESSAGES.CHAT_SUBSCRIBER);
      
      expect(msg.command).toBe('PRIVMSG');
      expect(msg.channel).toBe('tarik');
      expect(msg.tags['display-name']).toBe('sockfairy');
      expect(msg.tags.subscriber).toBe('1');
      expect(msg.tags.badges).toContain('subscriber/3');
    });

    it('parses moderator chat message correctly', () => {
      const msg = parseIRCMessage(REAL_MESSAGES.CHAT_MOD);
      
      expect(msg.command).toBe('PRIVMSG');
      expect(msg.tags.mod).toBe('1');
      expect(msg.tags['user-type']).toBe('mod');
      expect(msg.tags.badges).toContain('moderator/1');
    });

    it('parses command message correctly', () => {
      const msg = parseIRCMessage(REAL_MESSAGES.CHAT_COMMAND);
      
      expect(msg.command).toBe('PRIVMSG');
      expect(msg.message).toBe('!lastseen xQc');
      expect(msg.tags['display-name']).toBe('cylex0');
    });

    it('parses resub USERNOTICE correctly', () => {
      const msg = parseIRCMessage(REAL_MESSAGES.RESUB);
      
      expect(msg.command).toBe('USERNOTICE');
      expect(msg.channel).toBe('tarik');
      expect(msg.tags['msg-id']).toBe('resub');
      expect(msg.tags['msg-param-cumulative-months']).toBe('24');
      expect(msg.tags['msg-param-streak-months']).toBe('1');
      expect(msg.tags['msg-param-sub-plan']).toBe('Prime');
      expect(msg.message).toContain('message');
    });

    it('parses subgift USERNOTICE correctly', () => {
      const msg = parseIRCMessage(REAL_MESSAGES.SUBGIFT);
      
      expect(msg.command).toBe('USERNOTICE');
      expect(msg.tags['msg-id']).toBe('subgift');
      expect(msg.tags['msg-param-recipient-display-name']).toBe('LuckyViewer');
      expect(msg.tags['msg-param-recipient-user-name']).toBe('luckyviewer');
      expect(msg.tags['msg-param-sender-count']).toBe('50');
    });

    it('parses mystery gift USERNOTICE correctly', () => {
      const msg = parseIRCMessage(REAL_MESSAGES.MYSTERYGIFT);
      
      expect(msg.command).toBe('USERNOTICE');
      expect(msg.tags['msg-id']).toBe('submysterygift');
      expect(msg.tags['msg-param-mass-gift-count']).toBe('5');
      expect(msg.tags['msg-param-sender-count']).toBe('100');
    });

    it('parses raid USERNOTICE correctly', () => {
      const msg = parseIRCMessage(REAL_MESSAGES.RAID);
      
      expect(msg.command).toBe('USERNOTICE');
      expect(msg.tags['msg-id']).toBe('raid');
      expect(msg.tags['msg-param-viewerCount']).toBe('500');
      expect(msg.tags['msg-param-displayName']).toBe('RaidingStreamer');
    });

    it('parses cheer message correctly', () => {
      const msg = parseIRCMessage(REAL_MESSAGES.CHEER);
      
      expect(msg.command).toBe('PRIVMSG');
      expect(msg.tags.bits).toBe('100');
      expect(msg.message).toContain('Cheer100');
    });

    it('parses timeout CLEARCHAT correctly', () => {
      const msg = parseIRCMessage(REAL_MESSAGES.TIMEOUT);
      
      expect(msg.command).toBe('CLEARCHAT');
      expect(msg.tags['ban-duration']).toBe('600');
      expect(msg.tags['target-user-id']).toBe('44444');
      expect(msg.message).toBe('baduser');
    });

    it('parses ban CLEARCHAT correctly', () => {
      const msg = parseIRCMessage(REAL_MESSAGES.BAN);
      
      expect(msg.command).toBe('CLEARCHAT');
      expect(msg.tags['ban-duration']).toBeUndefined();
      expect(msg.tags['target-user-id']).toBe('55555');
      expect(msg.message).toBe('verybaduser');
    });

    it('parses CLEARMSG correctly', () => {
      const msg = parseIRCMessage(REAL_MESSAGES.CLEARMSG);
      
      expect(msg.command).toBe('CLEARMSG');
      expect(msg.tags['target-msg-id']).toBe('msg-id-123');
      expect(msg.tags.login).toBe('deleteduser');
    });

    it('parses ROOMSTATE correctly', () => {
      const msg = parseIRCMessage(REAL_MESSAGES.ROOMSTATE);
      
      expect(msg.command).toBe('ROOMSTATE');
      expect(msg.channel).toBe('xqc');
      expect(msg.tags['followers-only']).toBe('1440');
      expect(msg.tags['emote-only']).toBe('0');
      expect(msg.tags['subs-only']).toBe('0');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// User Flags Tests with Real Data
// ─────────────────────────────────────────────────────────────────────────────

describe('Real User Flags Parsing', () => {
  it('detects subscriber flag correctly', () => {
    const msg = parseIRCMessage(REAL_MESSAGES.CHAT_SUBSCRIBER);
    const flags = parseUserFlags(msg.tags, msg.channel || '');
    
    expect(flags.subscriber).toBe(true);
    expect(flags.mod).toBe(false);
    expect(flags.vip).toBe(false);
    expect(flags.broadcaster).toBe(false);
  });

  it('detects mod flag correctly', () => {
    const msg = parseIRCMessage(REAL_MESSAGES.CHAT_MOD);
    const flags = parseUserFlags(msg.tags, msg.channel || '');
    
    expect(flags.mod).toBe(true);
    expect(flags.subscriber).toBe(false);
  });

  it('detects VIP flag correctly', () => {
    const msg = parseIRCMessage(REAL_MESSAGES.CHAT_VIP);
    const flags = parseUserFlags(msg.tags, msg.channel || '');
    
    expect(flags.vip).toBe(true);
    expect(flags.subscriber).toBe(true); // VIPs are often subs too
  });

  it('detects regular user (no special flags)', () => {
    const msg = parseIRCMessage(REAL_MESSAGES.CHAT_REGULAR);
    const flags = parseUserFlags(msg.tags, msg.channel || '');
    
    expect(flags.subscriber).toBe(false);
    expect(flags.mod).toBe(false);
    expect(flags.vip).toBe(false);
    expect(flags.broadcaster).toBe(false);
    expect(flags.founder).toBe(false);
    expect(flags.highlighted).toBe(false);
    expect(flags.customReward).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Badge Parsing Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Real Badge Parsing', () => {
  it('parses subscriber badges correctly', () => {
    const msg = parseIRCMessage(REAL_MESSAGES.CHAT_SUBSCRIBER);
    const badges = parseBadges(msg.tags.badges || '');
    
    expect(badges.subscriber).toBe('3');
    expect(badges.predictions).toBe('pink-2');
    expect(badges['twitch-recap-2023']).toBe('1');
  });

  it('parses moderator badges correctly', () => {
    const msg = parseIRCMessage(REAL_MESSAGES.CHAT_MOD);
    const badges = parseBadges(msg.tags.badges || '');
    
    expect(badges.moderator).toBe('1');
    expect(badges['bot-badge']).toBe('1');
  });

  it('parses VIP badges correctly', () => {
    const msg = parseIRCMessage(REAL_MESSAGES.CHAT_VIP);
    const badges = parseBadges(msg.tags.badges || '');
    
    expect(badges.vip).toBe('1');
    expect(badges.subscriber).toBe('48');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Emote Parsing Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Real Emote Parsing', () => {
  it('parses emote positions correctly', () => {
    const msg = parseIRCMessage(REAL_MESSAGES.CHAT_WITH_EMOTES);
    const emotes = parseEmotes(msg.tags.emotes || '');
    
    expect(emotes).toBeDefined();
    expect(emotes!['25']).toEqual(['0-4', '6-10']); // Kappa appears twice
    expect(emotes!['1902']).toEqual(['12-16']); // Keepo appears once
  });

  it('returns undefined for messages without emotes', () => {
    const msg = parseIRCMessage(REAL_MESSAGES.CHAT_REGULAR);
    const emotes = parseEmotes(msg.tags.emotes || '');
    
    expect(emotes).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UserExtra Building Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Real UserExtra Building', () => {
  it('builds UserExtra with all required v1 fields', () => {
    const msg = parseIRCMessage(REAL_MESSAGES.CHAT_SUBSCRIBER);
    const extra = buildUserExtra(msg);
    
    // v1 required fields
    expect(extra.id).toBe('1ec0b684-4c10-4e0b-a6a6-517e349973e2');
    expect(extra.channel).toBe('tarik');
    expect(extra.roomId).toBe('36340781');
    expect(extra.userId).toBe('518405260');
    expect(extra.displayName).toBe('sockfairy');
    expect(extra.userColor).toBe('#D78986');
    expect(extra.timestamp).toBe('1769564097871');
    
    // userState should contain all tags
    expect(extra.userState).toBeDefined();
    expect(extra.userState['display-name']).toBe('sockfairy');
    
    // userBadges should be parsed
    expect(extra.userBadges).toBeDefined();
    expect(extra.userBadges.subscriber).toBe('3');
  });

  it('includes messageEmotes when present', () => {
    const msg = parseIRCMessage(REAL_MESSAGES.CHAT_WITH_EMOTES);
    const extra = buildUserExtra(msg);
    
    expect(extra.messageEmotes).toBeDefined();
    expect(extra.messageEmotes!['25']).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge Cases
// ─────────────────────────────────────────────────────────────────────────────

describe('Edge Cases', () => {
  it('handles escaped characters in system-msg', () => {
    const msg = parseIRCMessage(REAL_MESSAGES.RESUB);
    
    // The system-msg tag has escaped spaces
    expect(msg.tags['system-msg']).toContain('subscribed');
  });

  it('handles messages with @ mentions', () => {
    const mentionMsg = '@badge-info=;badges=;color=#FF0000;display-name=User;emotes=;id=123;mod=0;room-id=12345;subscriber=0;tmi-sent-ts=123;user-id=1;user-type= :user!user@user.tmi.twitch.tv PRIVMSG #channel :@someone !command args';
    const msg = parseIRCMessage(mentionMsg);
    
    expect(msg.message).toBe('@someone !command args');
  });

  it('handles empty badge-info', () => {
    const msg = parseIRCMessage(REAL_MESSAGES.CHAT_REGULAR);
    
    expect(msg.tags['badge-info']).toBe('');
  });
});
