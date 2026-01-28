#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// COMFY.JS v2 - Node.js Test Script
// ═══════════════════════════════════════════════════════════════════════════
//
// Usage:
//   node test-node.mjs <channel> [oauth_token]
//
// Examples:
//   node test-node.mjs instafluff                    # Anonymous (read-only)
//   node test-node.mjs instafluff oauth:abc123...    # Authenticated
//
// ═══════════════════════════════════════════════════════════════════════════

import ComfyJS from '../dist/comfy.js';

const channel = process.argv[2];
const oauth = process.argv[3];

if (!channel) {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           ComfyJS v2 - Node.js Test Script                    ║
╠═══════════════════════════════════════════════════════════════╣
║ Usage:                                                        ║
║   node test-node.mjs <channel> [oauth_token]                  ║
║                                                               ║
║ Examples:                                                     ║
║   node test-node.mjs instafluff                               ║
║   node test-node.mjs instafluff oauth:abc123...               ║
╚═══════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           ComfyJS v2 Test - Version ${ComfyJS.version().padEnd(24)}║
╚═══════════════════════════════════════════════════════════════╝
`);

// ─────────────────────────────────────────────────────────────────────────────
// Event Handlers
// ─────────────────────────────────────────────────────────────────────────────

ComfyJS.onConnected = (address, port, isFirst) => {
  console.log(`✅ Connected to ${address}:${port}`);
  console.log(`   First connect: ${isFirst}`);
  console.log(`   Listening on #${channel}\n`);
  console.log('─'.repeat(60));
  console.log('Waiting for events... (Ctrl+C to exit)\n');
};

ComfyJS.onReconnect = (count) => {
  console.log(`🔄 Reconnecting... attempt ${count}`);
};

ComfyJS.onError = (error) => {
  console.error(`❌ Error: ${error.message || error}`);
};

ComfyJS.onChat = (user, message, flags, self, extra) => {
  const badges = [];
  if (flags.broadcaster) badges.push('📺');
  if (flags.mod) badges.push('⚔️');
  if (flags.vip) badges.push('💎');
  if (flags.subscriber) badges.push('⭐');
  
  const badgeStr = badges.length ? badges.join('') + ' ' : '';
  console.log(`💬 ${badgeStr}${user}: ${message}`);
};

ComfyJS.onCommand = (user, command, message, flags, extra) => {
  console.log(`🎮 COMMAND: ${user} used !${command}${message ? ` with: ${message}` : ''}`);
  
  // Log cooldown info
  if (extra.sinceLastCommand) {
    console.log(`   └─ Time since last !${command}: ${extra.sinceLastCommand.any}ms (global), ${extra.sinceLastCommand.user}ms (user)`);
  }
};

ComfyJS.onReward = (user, reward, cost, message, extra) => {
  console.log(`🎁 REWARD: ${user} redeemed "${reward}" for ${cost} points`);
  if (message) {
    console.log(`   └─ Message: ${message}`);
  }
};

ComfyJS.onSub = (user, message, subTierInfo, extra) => {
  console.log(`🎉 SUB: ${user} subscribed! (${subTierInfo.planName})`);
  if (message) {
    console.log(`   └─ ${message}`);
  }
};

ComfyJS.onResub = (user, message, streakMonths, cumulativeMonths, subTierInfo, extra) => {
  console.log(`🎉 RESUB: ${user} resubbed for ${cumulativeMonths} months! (${subTierInfo.planName})`);
  if (streakMonths > 0) {
    console.log(`   └─ ${streakMonths} month streak!`);
  }
  if (message) {
    console.log(`   └─ ${message}`);
  }
};

ComfyJS.onSubGift = (gifter, streakMonths, recipient, senderCount, subTierInfo, extra) => {
  console.log(`🎁 GIFT SUB: ${gifter} gifted a ${subTierInfo.planName} sub to ${recipient}!`);
  if (senderCount > 0) {
    console.log(`   └─ ${gifter} has gifted ${senderCount} subs in this channel`);
  }
};

ComfyJS.onSubMysteryGift = (gifter, numSubs, senderCount, subTierInfo, extra) => {
  console.log(`🎁 MYSTERY GIFT: ${gifter} gifted ${numSubs} ${subTierInfo.planName} subs!`);
};

ComfyJS.onCheer = (user, message, bits, flags, extra) => {
  console.log(`💎 CHEER: ${user} cheered ${bits} bits!`);
  if (message) {
    console.log(`   └─ ${message}`);
  }
};

ComfyJS.onRaid = (user, viewers, extra) => {
  console.log(`🚀 RAID: ${user} is raiding with ${viewers} viewers!`);
};

ComfyJS.onJoin = (user, self, extra) => {
  if (!self) {
    console.log(`➡️ JOIN: ${user} joined #${extra.channel}`);
  }
};

ComfyJS.onPart = (user, self, extra) => {
  if (!self) {
    console.log(`⬅️ PART: ${user} left #${extra.channel}`);
  }
};

ComfyJS.onBan = (user, extra) => {
  console.log(`🔨 BAN: ${user} was banned`);
};

ComfyJS.onTimeout = (user, duration, extra) => {
  console.log(`⏱️ TIMEOUT: ${user} was timed out for ${duration}s`);
};

ComfyJS.onMessageDeleted = (id, extra) => {
  console.log(`🗑️ MESSAGE DELETED: ${extra.message} (by ${extra.username})`);
};

ComfyJS.onHypeTrain = (type, level, progress, goal, total, timeRemaining, extra) => {
  console.log(`🚂 HYPE TRAIN ${type.toUpperCase()}: Level ${level}, ${progress}/${goal} (${total} total)`);
};

ComfyJS.onPoll = (type, title, choices, votes, timeRemaining, extra) => {
  console.log(`📊 POLL ${type.toUpperCase()}: "${title}"`);
  choices.forEach((choice, i) => {
    console.log(`   ${i + 1}. ${choice}: ${votes[i]} votes`);
  });
};

ComfyJS.onPrediction = (type, title, outcomes, topPredictors, timeRemaining, extra) => {
  console.log(`🔮 PREDICTION ${type.toUpperCase()}: "${title}"`);
  outcomes.forEach((outcome, i) => {
    console.log(`   ${i + 1}. ${outcome}`);
  });
};

ComfyJS.onShoutout = (channelName, viewerCount, timeRemaining, extra) => {
  console.log(`📢 SHOUTOUT: ${channelName} (${viewerCount} viewers)`);
};

// ─────────────────────────────────────────────────────────────────────────────
// Connect
// ─────────────────────────────────────────────────────────────────────────────

console.log(`Connecting to #${channel}...`);
console.log(`Mode: ${oauth ? 'Authenticated' : 'Anonymous (read-only)'}\n`);

// For anonymous, use justinfan username
const username = oauth ? channel : 'justinfan' + Math.floor(Math.random() * 100000);

try {
  await ComfyJS.Init(username, oauth, channel, true);
} catch (error) {
  console.error(`Failed to connect: ${error.message}`);
  process.exit(1);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nDisconnecting...');
  ComfyJS.Disconnect();
  console.log('Goodbye! 👋');
  process.exit(0);
});
