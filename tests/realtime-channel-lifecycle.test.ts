import { describe, expect, it, vi } from 'vitest';
import { RealtimeChannelLifecycle } from '@/lib/order/realtime-channel-lifecycle';

describe('RealtimeChannelLifecycle', () => {
  it('hanya membuat satu channel untuk connect berulang', async () => {
    const create = vi.fn(() => ({ id: 1 }));
    const remove = vi.fn(async () => undefined);
    const lifecycle = new RealtimeChannelLifecycle(create, remove);

    await Promise.all([lifecycle.setActive(true), lifecycle.setActive(true)]);

    expect(create).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
  });

  it('menunggu remove selesai sebelum reconnect cepat membuat channel baru', async () => {
    let finishRemove: () => void = () => undefined;
    const create = vi.fn(() => ({ id: create.mock.calls.length + 1 }));
    const remove = vi.fn(() => new Promise<void>((resolve) => (finishRemove = resolve)));
    const lifecycle = new RealtimeChannelLifecycle(create, remove);

    await lifecycle.setActive(true);
    const disconnect = lifecycle.setActive(false);
    const reconnect = lifecycle.setActive(true);
    await Promise.resolve();
    expect(create).toHaveBeenCalledTimes(1);

    finishRemove();
    await Promise.all([disconnect, reconnect]);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('stop membersihkan channel dan menolak connect berikutnya', async () => {
    const channel = { id: 1 };
    const create = vi.fn(() => channel);
    const remove = vi.fn(async () => undefined);
    const lifecycle = new RealtimeChannelLifecycle(create, remove);

    await lifecycle.setActive(true);
    await lifecycle.stop();
    await lifecycle.setActive(true);

    expect(remove).toHaveBeenCalledWith(channel);
    expect(create).toHaveBeenCalledTimes(1);
    expect(lifecycle.isCurrent(channel)).toBe(false);
  });
});
