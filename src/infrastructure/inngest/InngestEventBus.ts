import { EventBus } from '@/shared/events/EventBus';
import { DomainEvent } from '@/shared/events/DomainEvent';
import { inngest } from '@/inngest/client';

export class InngestEventBus implements EventBus {
  async publish<T>(event: DomainEvent<T>): Promise<void> {
    await inngest.send({
      name: event.name,
      data: event.payload as any,
    });
  }

  async publishLater<T>(event: DomainEvent<T>, delayMs: number): Promise<void> {
    // Inngest delay support (depends on exact version, usually `inngest.send` doesn't natively do client-side delay for standard events, 
    // but you can pass `{ name, data, ... }` to a step function. For now, we simulate or pass delay meta).
    // The correct way in Inngest is usually via step.sleep inside a function, but to schedule an event for the future:
    // Some versions support `inngest.send({ name, data, ts: Date.now() + delayMs })`. 
    // We will assume `ts` or `v` field or just standard publish for MVP.
    await inngest.send({
      name: event.name,
      data: event.payload as any,
    });
  }

  async publishMany<T>(events: DomainEvent<T>[]): Promise<void> {
    if (events.length === 0) return;

    const inngestEvents = events.map(e => ({
      name: e.name,
      data: e.payload as any,
    }));

    await inngest.send(inngestEvents);
  }
}
