export abstract class Repository<T, ID = string> {
  /**
   * Finds an entity by its ID.
   */
  abstract findById(id: ID): Promise<T | null>;

  /**
   * Finds all entities matching a query.
   */
  abstract findAll(query?: any): Promise<T[]>;

  /**
   * Saves an entity (create or update).
   */
  abstract save(entity: Partial<T>): Promise<T>;

  /**
   * Deletes an entity by its ID.
   */
  abstract delete(id: ID): Promise<void>;
}
