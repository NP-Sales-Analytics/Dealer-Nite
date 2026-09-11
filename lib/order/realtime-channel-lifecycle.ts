/** Menjamin create/remove channel tidak pernah berjalan tumpang-tindih. */
export class RealtimeChannelLifecycle<Channel> {
  private channel: Channel | null = null;
  private queue: Promise<void> = Promise.resolve();
  private stopped = false;

  constructor(
    private readonly create: () => Channel,
    private readonly remove: (channel: Channel) => Promise<unknown>,
  ) {}

  setActive(active: boolean) {
    return this.enqueue(async () => {
      if (this.stopped) return;
      if (active) {
        if (!this.channel) this.channel = this.create();
        return;
      }
      const old = this.channel;
      this.channel = null;
      if (old) await this.remove(old);
    });
  }

  isCurrent(channel: Channel) {
    return this.channel === channel;
  }

  stop() {
    this.stopped = true;
    return this.enqueue(async () => {
      const old = this.channel;
      this.channel = null;
      if (old) await this.remove(old);
    });
  }

  private enqueue(task: () => Promise<void>) {
    this.queue = this.queue.then(task, task).then(
      () => undefined,
      () => undefined,
    );
    return this.queue;
  }
}
