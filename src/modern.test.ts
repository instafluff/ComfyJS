import { afterEach, describe, expect, it, vi } from 'vitest';
import ComfyJS from './compat';

const comfy = ComfyJS as any;
const defaultOnEventSub = ComfyJS.onEventSub;

afterEach(() => {
  ComfyJS.onEventSub = defaultOnEventSub;
  comfy.eventSub = null;
  comfy.api = null;
});

describe('modern EventSub surface', () => {
  it('forwards unknown EventSub types through onEventSub', () => {
    const handler = vi.fn();
    ComfyJS.onEventSub = handler;

    comfy.handleEventSubNotification({
      subscriptionType: 'channel.future_event.add',
      subscriptionVersion: '7',
      event: { id: 'future-1', useful: true },
    });

    expect(handler).toHaveBeenCalledWith(
      'channel.future_event.add',
      { id: 'future-1', useful: true },
      '7'
    );
  });

  it('can subscribe to arbitrary EventSub types', async () => {
    const subscribe = vi.fn().mockResolvedValue({ id: 'sub-1' });
    comfy.eventSub = { subscribe };

    await expect(
      ComfyJS.SubscribeEventSub('channel.future_event.add', '7', {
        broadcaster_user_id: '123',
      })
    ).resolves.toEqual({ id: 'sub-1' });

    expect(subscribe).toHaveBeenCalledWith('channel.future_event.add', '7', {
      broadcaster_user_id: '123',
    });
  });

  it('can unsubscribe without leaking the internal clients', async () => {
    const deleteEventSubSubscription = vi.fn().mockResolvedValue(undefined);
    const unregisterSubscription = vi.fn();
    comfy.api = { deleteEventSubSubscription };
    comfy.eventSub = { unregisterSubscription };

    await ComfyJS.UnsubscribeEventSub('sub-1');

    expect(deleteEventSubSubscription).toHaveBeenCalledWith('sub-1');
    expect(unregisterSubscription).toHaveBeenCalledWith('sub-1');
  });
});
