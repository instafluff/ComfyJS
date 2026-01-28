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

  // Resub USERNOTICE - REAL from hasanabi (60 month sub!)
  RESUB: '@badge-info=subscriber/60;badges=subscriber/60;color=#8A2BE2;display-name=GlassThalassas;emotes=;flags=;id=f8dc5701-a794-4941-9ece-5d0d505e59e8;login=glassthalassas;mod=0;msg-id=resub;msg-param-cumulative-months=60;msg-param-months=0;msg-param-multimonth-duration=33;msg-param-multimonth-tenure=33;msg-param-should-share-streak=0;msg-param-sub-plan-name=Woke\\sBeys\\s(hasanpiker):\\s$4.99\\sSub;msg-param-sub-plan=1000;msg-param-was-gifted=false;room-id=207813352;subscriber=1;system-msg=GlassThalassas\\ssubscribed\\sat\\sTier\\s1.\\sThey\'ve\\ssubscribed\\sfor\\s60\\smonths!;tmi-sent-ts=1769564587419;user-id=122594664;user-type=;vip=0 :tmi.twitch.tv USERNOTICE #hasanabi :60 months pog',

  // Prime Resub USERNOTICE - REAL from summit1g (25 month Prime sub!)
  RESUB_PRIME: '@badge-info=subscriber/25;badges=subscriber/24,premium/1;color=#8A2BE2;display-name=MaxDomination;emotes=80958:0-6,8-14,16-22;flags=;id=2c804daa-9b6c-4f27-8eeb-2b81f80e1deb;login=maxdomination;mod=0;msg-id=resub;msg-param-cumulative-months=25;msg-param-months=0;msg-param-multimonth-duration=1;msg-param-multimonth-tenure=0;msg-param-should-share-streak=0;msg-param-sub-plan-name=Channel\\sSubscription\\s(summit1g);msg-param-sub-plan=Prime;msg-param-was-gifted=false;room-id=26490481;subscriber=1;system-msg=MaxDomination\\ssubscribed\\swith\\sPrime.\\sThey\'ve\\ssubscribed\\sfor\\s25\\smonths!;tmi-sent-ts=1769565053325;user-id=46966022;user-type=;vip=0 :tmi.twitch.tv USERNOTICE #summit1g :sumLove sumLove sumLove',

  // First-time SUB USERNOTICE - REAL from summit1g (Prime sub)
  SUB: '@badge-info=subscriber/1;badges=subscriber/0,premium/1;color=;display-name=igreener1;emotes=;flags=;id=fe23faaf-928a-4368-aacd-663289a54106;login=igreener1;mod=0;msg-id=sub;msg-param-cumulative-months=1;msg-param-months=0;msg-param-multimonth-duration=1;msg-param-multimonth-tenure=0;msg-param-should-share-streak=0;msg-param-sub-plan-name=Channel\\sSubscription\\s(summit1g);msg-param-sub-plan=Prime;msg-param-was-gifted=false;room-id=26490481;subscriber=1;system-msg=igreener1\\ssubscribed\\swith\\sPrime.;tmi-sent-ts=1769565297466;user-id=264230827;user-type=;vip=0 :tmi.twitch.tv USERNOTICE #summit1g',

  // Sub gift USERNOTICE - REAL from summit1g channel
  SUBGIFT: '@badge-info=subscriber/41;badges=subscriber/36;color=#DAA520;display-name=ff_deathshot;emotes=;flags=;id=7a7e59b1-61d0-45b1-bac5-fdc06c4a28a7;login=ff_deathshot;mod=0;msg-id=subgift;msg-param-gift-months=1;msg-param-months=1;msg-param-origin-id=1761723279133432003;msg-param-recipient-display-name=syren;msg-param-recipient-id=45969669;msg-param-recipient-user-name=syren;msg-param-sender-count=24;msg-param-sub-plan-name=Channel\\sSubscription\\s(summit1g);msg-param-sub-plan=1000;room-id=26490481;subscriber=1;system-msg=ff_deathshot\\sgifted\\sa\\sTier\\s1\\ssub\\sto\\ssyren!\\sThey\\shave\\sgiven\\s24\\sGift\\sSubs\\sin\\sthe\\schannel!;tmi-sent-ts=1769564836206;user-id=121535345;user-type=;vip=0 :tmi.twitch.tv USERNOTICE #summit1g',

  // Mystery gift USERNOTICE (simulated based on structure)
  MYSTERYGIFT: '@badge-info=subscriber/24;badges=subscriber/24;color=#FF0000;display-name=BigSpender;emotes=;id=def456;login=bigspender;mod=0;msg-id=submysterygift;msg-param-mass-gift-count=5;msg-param-sender-count=100;msg-param-sub-plan=1000;room-id=12345;subscriber=1;system-msg=BigSpender\\sis\\sgifting\\s5\\sTier\\s1\\sSubs!;tmi-sent-ts=1769563460182;user-id=11111;user-type= :tmi.twitch.tv USERNOTICE #channel',

  // Raid USERNOTICE (simulated based on structure)
  RAID: '@badge-info=;badges=broadcaster/1;color=#00FFFF;display-name=RaidingStreamer;emotes=;id=raid123;login=raidingstreamer;mod=0;msg-id=raid;msg-param-displayName=RaidingStreamer;msg-param-login=raidingstreamer;msg-param-viewerCount=500;room-id=12345;subscriber=0;system-msg=500\\sraiders\\sfrom\\sRaidingStreamer\\shave\\sjoined!;tmi-sent-ts=1769563460182;user-id=22222;user-type= :tmi.twitch.tv USERNOTICE #channel',

  // Cheer message with bits
  CHEER: '@badge-info=subscriber/12;badges=subscriber/12,bits/1000;bits=100;color=#FF69B4;display-name=Cheerful;emotes=;first-msg=0;id=cheer123;mod=0;room-id=12345;subscriber=1;tmi-sent-ts=1769563460182;turbo=0;user-id=33333;user-type= :cheerful!cheerful@cheerful.tmi.twitch.tv PRIVMSG #channel :Cheer100 Great stream!',

  // CLEARCHAT (timeout) - REAL from hasanabi channel
  TIMEOUT: '@ban-duration=30;room-id=207813352;target-user-id=261074120;tmi-sent-ts=1769564600000 :tmi.twitch.tv CLEARCHAT #hasanabi :therebelmindd',

  // CLEARCHAT (ban) - REAL from hasanabi channel
  BAN: '@room-id=207813352;target-user-id=1187164731;tmi-sent-ts=1769565400000 :tmi.twitch.tv CLEARCHAT #hasanabi :donaldtrumpisgoatted',

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
      expect(msg.channel).toBe('hasanabi');
      expect(msg.tags['msg-id']).toBe('resub');
      expect(msg.tags['msg-param-cumulative-months']).toBe('60');
      expect(msg.tags['msg-param-sub-plan']).toBe('1000');
      expect(msg.tags['display-name']).toBe('GlassThalassas');
      expect(msg.message).toBe('60 months pog');
    });

    it('parses Prime resub USERNOTICE correctly', () => {
      const msg = parseIRCMessage(REAL_MESSAGES.RESUB_PRIME);
      
      expect(msg.command).toBe('USERNOTICE');
      expect(msg.channel).toBe('summit1g');
      expect(msg.tags['msg-id']).toBe('resub');
      expect(msg.tags['msg-param-cumulative-months']).toBe('25');
      expect(msg.tags['msg-param-sub-plan']).toBe('Prime');
      expect(msg.tags['display-name']).toBe('MaxDomination');
      expect(msg.message).toBe('sumLove sumLove sumLove');
      expect(msg.tags.emotes).toBe('80958:0-6,8-14,16-22');
    });

    it('parses subgift USERNOTICE correctly', () => {
      const msg = parseIRCMessage(REAL_MESSAGES.SUBGIFT);
      
      expect(msg.command).toBe('USERNOTICE');
      expect(msg.tags['msg-id']).toBe('subgift');
      expect(msg.tags['msg-param-recipient-display-name']).toBe('syren');
      expect(msg.tags['msg-param-recipient-user-name']).toBe('syren');
      expect(msg.tags['msg-param-sender-count']).toBe('24');
      expect(msg.channel).toBe('summit1g');
    });

    it('parses first-time SUB USERNOTICE correctly', () => {
      const msg = parseIRCMessage(REAL_MESSAGES.SUB);
      
      expect(msg.command).toBe('USERNOTICE');
      expect(msg.channel).toBe('summit1g');
      expect(msg.tags['msg-id']).toBe('sub');
      expect(msg.tags['msg-param-cumulative-months']).toBe('1');
      expect(msg.tags['msg-param-sub-plan']).toBe('Prime');
      expect(msg.tags['display-name']).toBe('igreener1');
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
      expect(msg.tags['ban-duration']).toBe('30');
      expect(msg.tags['target-user-id']).toBe('261074120');
      expect(msg.tags['room-id']).toBe('207813352');
      expect(msg.message).toBe('therebelmindd');
    });

    it('parses ban CLEARCHAT correctly', () => {
      const msg = parseIRCMessage(REAL_MESSAGES.BAN);
      
      expect(msg.command).toBe('CLEARCHAT');
      expect(msg.tags['ban-duration']).toBeUndefined();
      expect(msg.tags['target-user-id']).toBe('1187164731');
      expect(msg.tags['room-id']).toBe('207813352');
      expect(msg.message).toBe('donaldtrumpisgoatted');
      expect(msg.channel).toBe('hasanabi');
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

  it('parses subgift recipient fields correctly', () => {
    const msg = parseIRCMessage(REAL_MESSAGES.SUBGIFT);
    
    // Real SubGift from summit1g channel
    expect(msg.tags['msg-param-recipient-display-name']).toBe('syren');
    expect(msg.tags['msg-param-recipient-user-name']).toBe('syren');
    expect(msg.tags['msg-param-recipient-id']).toBe('45969669');
    expect(msg.tags['msg-param-sender-count']).toBe('24');
    expect(msg.tags['msg-param-gift-months']).toBe('1');
    expect(msg.tags['display-name']).toBe('ff_deathshot');
    expect(msg.tags['user-id']).toBe('121535345');
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
