import { DomainEvent } from './DomainEvent';

export interface EventBus {
  /**
   * Publishes a single event to the bus to be handled asynchronously.
   */
  publish<T>(event: DomainEvent<T>): Promise<void>;
  
  /**
   * Publishes an event to the bus to be handled after a specific delay.
   */
  publishLater<T>(event: DomainEvent<T>, delayMs: number): Promise<void>;

  /**
   * Publishes multiple events to the bus in a single batch.
   */
  publishMany<T>(events: DomainEvent<T>[]): Promise<void>;
}
