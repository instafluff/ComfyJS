import { afterEach, describe, expect, it, vi } from 'vitest';
import ComfyJS from './compat';
import { parseIRCMessage } from './parsers';

const comfy = ComfyJS as any;

function dispatch(raw: string): void {
  comfy.handleIRCMessage(parseIRCMessage(raw));
}

const defaults = {
  onError: ComfyJS.onError,
  onChat: ComfyJS.onChat,
  onCommand: ComfyJS.onCommand,
  onJoin: ComfyJS.onJoin,
  onPart: ComfyJS.onPart,
  onRaid: ComfyJS.onRaid,
  onCheer: ComfyJS.onCheer,
};

afterEach(() => {
  Object.assign(ComfyJS, defaults);
});

describe('v1 callback compatibility contract', () => {
  it('delivers highlighted messages through onChat as messageType=chat', () => {
    const onChat = vi.fn();
    ComfyJS.onChat = onChat;

    dispatch('@badges=;color=#123456;display-name=Viewer;emotes=;id=msg-1;mod=0;msg-id=highlighted-message;room-id=123;subscriber=0;tmi-sent-ts=1000;user-id=42 :viewer!viewer@viewer.tmi.twitch.tv PRIVMSG #channel :hello');

    expect(onChat).toHaveBeenCalledOnce();
    const [user, message, flags, self, extra] = onChat.mock.calls[0];
    expect(user).toBe('Viewer');
    expect(message).toBe('hello');
    expect(flags.highlighted).toBe(true);
    expect(self).toBe(false);
    expect(extra.messageType).toBe('chat');
  });

  it('delivers custom reward messages through onChat', () => {
    const onChat = vi.fn();
    ComfyJS.onChat = onChat;

    dispatch('@badges=;custom-reward-id=reward-1;display-name=Viewer;emotes=;id=msg-2;mod=0;msg-id=channel_points_reward;room-id=123;subscriber=0;tmi-sent-ts=1001;user-id=42 :viewer!viewer@viewer.tmi.twitch.tv PRIVMSG #channel :reward text');

    expect(onChat).toHaveBeenCalledOnce();
    const [, message, flags, , extra] = onChat.mock.calls[0];
    expect(message).toBe('reward text');
    expect(flags.customReward).toBe(true);
    expect(extra.customRewardId).toBe('reward-1');
    expect(extra.messageType).toBe('chat');
  });

  it('preserves /me ACTION semantics', () => {
    const onChat = vi.fn();
    ComfyJS.onChat = onChat;

    dispatch('@badges=;display-name=Viewer;emotes=;id=msg-3;mod=0;room-id=123;subscriber=0;tmi-sent-ts=1002;user-id=42 :viewer!viewer@viewer.tmi.twitch.tv PRIVMSG #channel :\u0001ACTION waves hello\u0001');

    expect(onChat).toHaveBeenCalledOnce();
    const [, message, , , extra] = onChat.mock.calls[0];
    expect(message).toBe('waves hello');
    expect(extra.messageType).toBe('action');
  });

  it('preserves the @mention !command form', () => {
    const onCommand = vi.fn();
    ComfyJS.onCommand = onCommand;

    dispatch('@badges=;display-name=Viewer;emotes=;id=msg-4;mod=0;room-id=123;subscriber=0;tmi-sent-ts=1003;user-id=42 :viewer!viewer@viewer.tmi.twitch.tv PRIVMSG #channel :@bot !hello one two');

    expect(onCommand).toHaveBeenCalledOnce();
    const [user, command, message, , extra] = onCommand.mock.calls[0];
    expect(user).toBe('Viewer');
    expect(command).toBe('hello');
    expect(message).toBe('one two');
    expect(extra.messageType).toBe('chat');
  });

  it('keeps onJoin legacy extra shape', () => {
    const onJoin = vi.fn();
    ComfyJS.onJoin = onJoin;

    dispatch(':viewer!viewer@viewer.tmi.twitch.tv JOIN #channel');

    expect(onJoin).toHaveBeenCalledWith('viewer', false, { channel: 'channel' });
  });

  it('keeps onPart legacy extra shape', () => {
    const onPart = vi.fn();
    ComfyJS.onPart = onPart;

    dispatch(':viewer!viewer@viewer.tmi.twitch.tv PART #channel');

    expect(onPart).toHaveBeenCalledWith('viewer', false, { channel: 'channel' });
  });

  it('keeps onRaid legacy extra shape', () => {
    const onRaid = vi.fn();
    ComfyJS.onRaid = onRaid;

    dispatch('@badge-info=;badges=broadcaster/1;color=#00FFFF;display-name=RaidingStreamer;emotes=;id=raid123;login=raidingstreamer;mod=0;msg-id=raid;msg-param-displayName=RaidingStreamer;msg-param-login=raidingstreamer;msg-param-viewerCount=500;room-id=12345;subscriber=0;tmi-sent-ts=1004;user-id=22222 :tmi.twitch.tv USERNOTICE #channel');

    expect(onRaid).toHaveBeenCalledWith('RaidingStreamer', 500, { channel: 'channel' });
  });

  it('does not turn a cheer into a second onChat event', () => {
    const onCheer = vi.fn();
    const onChat = vi.fn();
    ComfyJS.onCheer = onCheer;
    ComfyJS.onChat = onChat;

    dispatch('@badges=subscriber/12;bits=100;color=#FF69B4;display-name=Cheerful;emotes=;id=cheer123;mod=0;room-id=12345;subscriber=1;tmi-sent-ts=1005;user-id=33333 :cheerful!cheerful@cheerful.tmi.twitch.tv PRIVMSG #channel :Cheer100 Great stream!');

    expect(onCheer).toHaveBeenCalledOnce();
    expect(onChat).not.toHaveBeenCalled();
  });
});
