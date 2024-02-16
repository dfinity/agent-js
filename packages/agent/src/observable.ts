import { AgentError } from './errors';

export type ObserveFunction<T> = (data: T) => void;

export class Observable<T> extends Function {
  observers: ObserveFunction<T>[];

  constructor() {
    super();
    this.observers = [];
    return new Proxy(this, {
      apply: (target, _, args) => target.#call(args[0]),
    });
  }

  #call(message: T) {
    this.notify(message);
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

export type AgentLog =
  | {
      message: string;
      level: 'warn' | 'info';
    }
  | {
      message: string;
      level: 'error';
      error: AgentError;
    };

export class ObservableLog extends Observable<AgentLog> {
  constructor() {
    super();
    return new Proxy(this, {
      apply: (target, _, args) => target.#call(args[0]),
    });
  }
  log(message: string) {
    this.notify({ message, level: 'info' });
  }
  warn(message: string) {
    this.notify({ message, level: 'warn' });
  }
  error(message: string, error: AgentError) {
    this.notify({ message, level: 'error', error });
  }
  #call(message: string) {
    this.log(message);
  }
}
