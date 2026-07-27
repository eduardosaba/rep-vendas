export interface DomainEvent<T = any> {
  name: string;
  payload: T;
  occurredOn: Date;
}
