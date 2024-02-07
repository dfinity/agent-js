export type ObserveFunction<T> = (data: T) => void;

export class Observable<T> {
  observers: ObserveFunction<T>[];

  constructor() {
    this.observers = [];
  }

  subscribe(func: ObserveFunction<T>) {
    this.observers.push(func);
  }

  unsubscribe(func: ObserveFunction<T>) {
    this.observers = this.observers.filter(observer => observer !== func);
  }

  notify(data: T) {
    this.observers.forEach(observer => observer(data));
  }
}
