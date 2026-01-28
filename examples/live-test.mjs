#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// COMFY.JS v2 - Live Parity Test
// ═══════════════════════════════════════════════════════════════════════════
//
// Connects to popular Twitch channels to observe and log all events.
// Useful for verifying IRC parsing parity with v1.
//
// Usage:
//   node live-test.mjs [channels...]
//
// Examples:
//   node live-test.mjs xqc                  # Single channel
//   node live-test.mjs xqc kai_cenat lirik  # Multiple channels
//
// ═══════════════════════════════════════════════════════════════════════════

import ComfyJS from '../dist/comfy.js';

const channels = process.argv.slice(2);

if (channels.length === 0) {
  // Default to some typically active channels
  channels.push('xqc', 'kai_cenat', 'tarik');
}

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║        ComfyJS v2 Live Parity Test - ${ComfyJS.version().padEnd(19)}║
║                                                               ║
║  Testing with channels: ${channels.join(', ').padEnd(36)}║
╚═══════════════════════════════════════════════════════════════╝
`);

// Track event counts for summary
const eventCounts = {
  chat: 0,
  command: 0,
  sub: 0,
  resub: 0,
  subGift: 0,
  subMysteryGift: 0,
  cheer: 0,
  raid: 0,
  join: 0,
  part: 0,
  ban: 0,
  timeout: 0,
  messageDeleted: 0,
  chatMode: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Event Handlers - Log everything for parity verification
// ─────────────────────────────────────────────────────────────────────────────

ComfyJS.onConnected = (address, port, isFirst) => {
  console.log(`✅ Connected to ${address}:${port} (first: ${isFirst})`);
  console.log('─'.repeat(60));
  console.log('Watching for events... (Ctrl+C to see summary)\n');
};

ComfyJS.onReconnect = (count) => {
  console.log(`🔄 Reconnecting... attempt ${count}`);
};

ComfyJS.onError = (error) => {
  console.error(`❌ Error:`, error);
};

ComfyJS.onChat = (user, message, flags, self, extra) => {
  eventCounts.chat++;
  // Only log every 10th message to avoid spam
  if (eventCounts.chat % 10 === 1) {
    const flagStr = Object.entries(flags).filter(([,v]) => v).map(([k]) => k).join(',') || 'none';
    console.log(`💬 [${extra.channel}] ${user}: ${message.slice(0, 50)}${message.length > 50 ? '...' : ''}`);
    console.log(`   flags: {${flagStr}}`);
    console.log(`   extra keys: [${Object.keys(extra).join(', ')}]`);
  }
};

ComfyJS.onCommand = (user, command, message, flags, extra) => {
  eventCounts.command++;
  console.log(`🎮 COMMAND [${extra.channel}] ${user}: !${command} ${message}`);
  console.log(`   sinceLastCommand: any=${extra.sinceLastCommand?.any}ms, user=${extra.sinceLastCommand?.user}ms`);
};

ComfyJS.onCheer = (user, message, bits, flags, extra) => {
  eventCounts.cheer++;
  console.log(`💎 CHEER [${extra.channel}] ${user} cheered ${bits} bits: ${message}`);
  console.log(`   extra keys: [${Object.keys(extra).join(', ')}]`);
};

ComfyJS.onSub = (user, message, subTierInfo, extra) => {
  eventCounts.sub++;
  console.log(`🎉 SUB [${extra.channel}] ${user} - ${subTierInfo.planName}`);
  console.log(`   subTierInfo:`, JSON.stringify(subTierInfo));
  console.log(`   extra keys: [${Object.keys(extra).join(', ')}]`);
};

ComfyJS.onResub = (user, message, streakMonths, cumulativeMonths, subTierInfo, extra) => {
  eventCounts.resub++;
  console.log(`🎉 RESUB [${extra.channel}] ${user} - ${cumulativeMonths} months (${streakMonths} streak)`);
  console.log(`   subTierInfo:`, JSON.stringify(subTierInfo));
};

ComfyJS.onSubGift = (gifter, streakMonths, recipient, senderCount, subTierInfo, extra) => {
  eventCounts.subGift++;
  console.log(`🎁 SUBGIFT [${extra.channel}] ${gifter} -> ${recipient} (${subTierInfo.planName})`);
  console.log(`   senderCount: ${senderCount}, streakMonths: ${streakMonths}`);
};

ComfyJS.onSubMysteryGift = (gifter, numSubs, senderCount, subTierInfo, extra) => {
  eventCounts.subMysteryGift++;
  console.log(`🎁 MYSTERY GIFT [${extra.channel}] ${gifter} gifted ${numSubs} subs!`);
  console.log(`   senderCount: ${senderCount}`);
};

ComfyJS.onGiftSubContinue = (user, sender, extra) => {
  console.log(`🎁 GIFT CONTINUE [${extra.channel}] ${user} continues gift from ${sender}`);
};

ComfyJS.onRaid = (user, viewers, extra) => {
  eventCounts.raid++;
  console.log(`🚀 RAID [${extra.channel}] ${user} raiding with ${viewers} viewers!`);
  console.log(`   extra keys: [${Object.keys(extra).join(', ')}]`);
};

ComfyJS.onJoin = (user, self, extra) => {
  eventCounts.join++;
  // Only log self joins to avoid spam
  if (self) {
    console.log(`➡️ JOIN [${extra.channel}] ${user} (self)`);
  }
};

ComfyJS.onPart = (user, self, extra) => {
  eventCounts.part++;
  if (self) {
    console.log(`⬅️ PART [${extra.channel}] ${user} (self)`);
  }
};

ComfyJS.onBan = (user, extra) => {
  eventCounts.ban++;
  console.log(`🔨 BAN [${extra.roomId}] ${user}`);
};

ComfyJS.onTimeout = (user, duration, extra) => {
  eventCounts.timeout++;
  console.log(`⏱️ TIMEOUT [${extra.roomId}] ${user} for ${duration}s`);
};

ComfyJS.onMessageDeleted = (id, extra) => {
  eventCounts.messageDeleted++;
  console.log(`🗑️ DELETED: ${id} (${extra.username}: ${extra.message?.slice(0, 30)}...)`);
};

ComfyJS.onChatMode = (modes, channel) => {
  eventCounts.chatMode++;
  console.log(`⚙️ CHATMODE [${channel}]:`, JSON.stringify(modes));
};

// ─────────────────────────────────────────────────────────────────────────────
// Summary on exit
// ─────────────────────────────────────────────────────────────────────────────

process.on('SIGINT', () => {
  console.log('\n' + '═'.repeat(60));
  console.log('EVENT SUMMARY');
  console.log('─'.repeat(60));
  Object.entries(eventCounts).forEach(([event, count]) => {
    if (count > 0) {
      console.log(`  ${event.padEnd(20)} ${count}`);
    }
  });
  console.log('═'.repeat(60));
  process.exit(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Connect
// ─────────────────────────────────────────────────────────────────────────────

console.log('Connecting...');

// Anonymous connection (justinfan)
const username = 'justinfan' + Math.floor(Math.random() * 100000);
ComfyJS.Init(username, undefined, channels, true);
