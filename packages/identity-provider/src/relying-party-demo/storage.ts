export interface IStorage<T> {
  get(): T | undefined;
  set(input: T): void;
}
