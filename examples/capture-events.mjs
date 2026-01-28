#!/usr/bin/env node
/**
 * ComfyJS Event Capture Script
 * 
 * Captures real Twitch IRC events for documentation and test generation.
 * Uses authenticated connection to capture more event types.
 * 
 * Usage: node capture-events.mjs [channels...]
 * 
 * Events are saved to ../docs/IRC_EVENTS.md
 */

import { config } from 'dotenv';
import ComfyJS from '../dist/comfy.js';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

// Configuration
const username = process.env.TWITCHUSER || 'justinfan' + Math.floor(Math.random() * 99999);
const oauth = process.env.OAUTH ? `oauth:${process.env.OAUTH}` : undefined;
const channels = process.argv.slice(2).length > 0 
  ? process.argv.slice(2) 
  : ['instafluff']; // Default to instafluff channel

// Event storage
const capturedEvents = {
  PRIVMSG: [],
  USERNOTICE: [],
  CLEARCHAT: [],
  CLEARMSG: [],
  ROOMSTATE: [],
  USERSTATE: [],
  GLOBALUSERSTATE: [],
  NOTICE: [],
  WHISPER: [],
  JOIN: [],
  PART: [],
};

const eventSamples = new Map();
const outputPath = join(__dirname, '..', 'docs', 'IRC_EVENTS.md');

// Load existing samples if available
function loadExistingSamples() {
  if (existsSync(outputPath)) {
    console.log('📂 Found existing IRC_EVENTS.md');
  }
}

// Save samples to markdown
function saveSamples() {
  let md = `# Twitch IRC Event Samples

> **Purpose:** Real IRC event samples for testing and documentation
> **Last Updated:** ${new Date().toISOString().split('T')[0]}
> **Captured from:** ${channels.join(', ')}

These are real IRC messages captured from Twitch chat. Use them for:
- Unit test inputs
- Documentation examples
- Parser verification

---

`;

  for (const [eventType, samples] of eventSamples) {
    if (samples.length === 0) continue;
    
    md += `## ${eventType}\n\n`;
    
    for (const sample of samples.slice(0, 5)) { // Keep max 5 samples per type
      md += `### ${sample.subtype || 'Standard'}\n\n`;
      md += `**Raw IRC:**\n\`\`\`\n${sample.raw}\n\`\`\`\n\n`;
      md += `**Parsed Tags:**\n\`\`\`json\n${JSON.stringify(sample.tags, null, 2)}\n\`\`\`\n\n`;
      if (sample.parsed) {
        md += `**Handler Args:**\n\`\`\`json\n${JSON.stringify(sample.parsed, null, 2)}\n\`\`\`\n\n`;
      }
      md += `---\n\n`;
    }
  }

  writeFileSync(outputPath, md);
  console.log(`\n💾 Saved ${eventSamples.size} event types to ${outputPath}`);
}

// Add sample if unique
function addSample(eventType, subtype, raw, tags, parsed = null) {
  const key = eventType;
  if (!eventSamples.has(key)) {
    eventSamples.set(key, []);
  }
  
  const samples = eventSamples.get(key);
  
  // Check if we already have this subtype
  const existingSubtype = samples.find(s => s.subtype === subtype);
  if (!existingSubtype) {
    samples.push({ subtype, raw, tags, parsed });
    console.log(`✨ New ${eventType}${subtype ? '/' + subtype : ''} sample captured!`);
    saveSamples();
  }
}

// Create ComfyJS instance with debug to capture raw messages
const comfy = ComfyJS;

// Track raw messages by intercepting console
const originalConsoleLog = console.log;
let lastRawMessage = '';

console.log = (...args) => {
  const msg = args.join(' ');
  if (msg.includes('[ComfyJS IRC] ←')) {
    lastRawMessage = msg.replace('[ComfyJS IRC] ← ', '');
  }
  originalConsoleLog.apply(console, args);
};

// Event handlers
comfy.onConnected = (address, port, isFirst) => {
  console.log(`\n🔌 Connected to ${address}:${port} (authenticated: ${!!oauth})`);
  console.log(`📺 Watching channels: ${channels.join(', ')}`);
  console.log(`\n⏳ Waiting for events... (Ctrl+C to save and exit)\n`);
};

comfy.onChat = (user, message, flags, self, extra) => {
  const flagList = Object.entries(flags).filter(([_, v]) => v).map(([k]) => k);
  const subtype = flagList.length > 0 ? flagList.join(',') : 'regular';
  
  addSample('PRIVMSG', subtype, lastRawMessage, extra.userState, {
    handler: 'onChat',
    args: { user, message: message.substring(0, 50), flags, self },
    extra: {
      id: extra.id,
      channel: extra.channel,
      roomId: extra.roomId,
      userId: extra.userId,
      displayName: extra.displayName,
    }
  });
};

comfy.onCommand = (user, command, message, flags, extra) => {
  addSample('PRIVMSG', 'command', lastRawMessage, extra.userState, {
    handler: 'onCommand',
    args: { user, command, message: message.substring(0, 30), flags },
    extra: { sinceLastCommand: extra.sinceLastCommand }
  });
};

comfy.onSub = (user, message, subTierInfo, extra) => {
  addSample('USERNOTICE', 'sub', lastRawMessage, extra.userState, {
    handler: 'onSub',
    args: { user, message, subTierInfo }
  });
};

comfy.onResub = (user, message, streakMonths, cumulativeMonths, subTierInfo, extra) => {
  addSample('USERNOTICE', 'resub', lastRawMessage, extra.userState, {
    handler: 'onResub',
    args: { user, message, streakMonths, cumulativeMonths, subTierInfo }
  });
};

comfy.onSubGift = (gifterUser, streakMonths, recipientUser, senderCount, subTierInfo, extra) => {
  addSample('USERNOTICE', 'subgift', lastRawMessage, extra.userState, {
    handler: 'onSubGift',
    args: { gifterUser, streakMonths, recipientUser, senderCount, subTierInfo }
  });
};

comfy.onSubMysteryGift = (gifterUser, numbOfSubs, senderCount, subTierInfo, extra) => {
  addSample('USERNOTICE', 'submysterygift', lastRawMessage, extra.userState, {
    handler: 'onSubMysteryGift',
    args: { gifterUser, numbOfSubs, senderCount, subTierInfo }
  });
};

comfy.onGiftSubContinue = (user, sender, extra) => {
  addSample('USERNOTICE', 'giftpaidupgrade', lastRawMessage, extra.userState, {
    handler: 'onGiftSubContinue',
    args: { user, sender }
  });
};

comfy.onCheer = (user, message, bits, flags, extra) => {
  addSample('PRIVMSG', 'cheer', lastRawMessage, extra.userState, {
    handler: 'onCheer',
    args: { user, message: message.substring(0, 30), bits, flags }
  });
};

comfy.onRaid = (user, viewers, extra) => {
  addSample('USERNOTICE', 'raid', lastRawMessage, extra.userState, {
    handler: 'onRaid',
    args: { user, viewers }
  });
};

comfy.onBan = (bannedUsername, extra) => {
  addSample('CLEARCHAT', 'ban', lastRawMessage, {}, {
    handler: 'onBan',
    args: { bannedUsername },
    extra
  });
};

comfy.onTimeout = (timedOutUsername, durationInSeconds, extra) => {
  addSample('CLEARCHAT', 'timeout', lastRawMessage, {}, {
    handler: 'onTimeout',
    args: { timedOutUsername, durationInSeconds },
    extra
  });
};

comfy.onMessageDeleted = (id, extra) => {
  addSample('CLEARMSG', 'delete', lastRawMessage, {}, {
    handler: 'onMessageDeleted',
    args: { id },
    extra
  });
};

comfy.onChatMode = (modes, channel) => {
  addSample('ROOMSTATE', 'modes', lastRawMessage, {}, {
    handler: 'onChatMode',
    args: { modes, channel }
  });
};

comfy.onJoin = (user, self, extra) => {
  if (self) {
    addSample('JOIN', 'self', lastRawMessage, {}, {
      handler: 'onJoin',
      args: { user, self },
      extra
    });
  }
};

comfy.onWhisper = (user, message, flags, self, extra) => {
  addSample('WHISPER', 'standard', lastRawMessage, extra.userState, {
    handler: 'onWhisper',
    args: { user, message: message.substring(0, 30), flags, self }
  });
};

// Track which commands we've handled - catch unknown ones
const handledCommands = new Set(['PRIVMSG', 'WHISPER', 'USERNOTICE', 'CLEARCHAT', 'CLEARMSG', 'ROOMSTATE', 'JOIN', 'PART']);

comfy.onRawMessage = (command, raw, parsed) => {
  // Log unknown IRC commands we don't have handlers for
  if (!handledCommands.has(command) && command !== 'PING' && !command.match(/^\d{3}$/)) {
    const subtype = parsed.tags?.['msg-id'] || 'unknown';
    addSample(`UNKNOWN/${command}`, subtype, raw, parsed.tags || {}, {
      handler: 'none',
      note: 'No handler for this IRC command',
      parsed: {
        command,
        prefix: parsed.prefix,
        channel: parsed.channel,
        message: parsed.message?.substring(0, 50),
        params: parsed.params
      }
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EventSub Event Handlers (require authenticated connection to own channel)
// ─────────────────────────────────────────────────────────────────────────────

comfy.onReward = (user, reward, cost, message, extra) => {
  addSample('EVENTSUB', 'reward', '', {}, {
    handler: 'onReward',
    args: { user, reward, cost, message: message?.substring(0, 30) || '' },
    extra: { rewardId: extra?.rewardId, status: extra?.status }
  });
};

comfy.onShoutout = (channelDisplayName, viewerCount, timeRemaining, extra) => {
  addSample('EVENTSUB', 'shoutout', '', {}, {
    handler: 'onShoutout',
    args: { channelDisplayName, viewerCount, timeRemaining },
    extra
  });
};

comfy.onHypeTrain = (type, level, progress, goal, total, timeRemaining, extra) => {
  addSample('EVENTSUB', `hypetrain-${type}`, '', {}, {
    handler: 'onHypeTrain',
    args: { type, level, progress, goal, total, timeRemaining },
    extra
  });
};

comfy.onPoll = (type, title, choices, votes, timeRemaining, extra) => {
  addSample('EVENTSUB', `poll-${type}`, '', {}, {
    handler: 'onPoll',
    args: { type, title, choices, votes, timeRemaining },
    extra
  });
};

comfy.onPrediction = (type, title, outcomes, topPredictors, timeRemaining, extra) => {
  addSample('EVENTSUB', `prediction-${type}`, '', {}, {
    handler: 'onPrediction',
    args: { type, title, outcomes: outcomes?.length, topPredictors: topPredictors?.length, timeRemaining },
    extra
  });
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n📊 Capture Summary:');
  for (const [type, samples] of eventSamples) {
    console.log(`   ${type}: ${samples.length} unique subtypes`);
  }
  saveSamples();
  process.exit(0);
});

// Start
loadExistingSamples();

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           ComfyJS Event Capture - ${comfy.version()}                ║
║                                                               ║
║  Capturing real IRC events for testing & documentation       ║
╚═══════════════════════════════════════════════════════════════╝
`);

// Connect
comfy.Init(username, oauth, channels, false).catch(err => {
  console.error('Failed to connect:', err.message);
  process.exit(1);
});
