import { Observable } from './observable';

describe('Observable', () => {
  it('should notify all observers', () => {
    const observable = new Observable<number>();
    const observer1 = jest.fn();
    const observer2 = jest.fn();
    observable.subscribe(observer1);
    observable.subscribe(observer2);
    observable.notify(42);
    expect(observer1).toHaveBeenCalledWith(42);
    expect(observer2).toHaveBeenCalledWith(42);
  });

  it('should notify only subscribed observers', () => {
    const observable = new Observable<number>();
    const observer1 = jest.fn();
    const observer2 = jest.fn();
    observable.subscribe(observer1);
    observable.notify(42);
    expect(observer1).toHaveBeenCalledWith(42);
    expect(observer2).not.toHaveBeenCalled();
  });

  it('should not notify unsubscribed observers', () => {
    const observable = new Observable<number>();
    const observer1 = jest.fn();
    const observer2 = jest.fn();
    observable.subscribe(observer1);
    observable.subscribe(observer2);
    observable.unsubscribe(observer2);
    observable.notify(42);
    expect(observer1).toHaveBeenCalledWith(42);
    expect(observer2).not.toHaveBeenCalled();
  });
});
