import IdleManager from './idleManager';

jest.useFakeTimers();

describe('IdleManager tests', () => {
  it('should call its callback after time spent inactive', () => {
    const cb = jest.fn();
    const manager = IdleManager.create({ onIdle: cb, captureScroll: true });
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 10 minutes
    jest.advanceTimersByTime(10 * 60 * 1000);
    expect(cb).toHaveBeenCalled();
    manager.exit();
  });
  it('should delay allow configuration of the timeout', () => {
    const cb = jest.fn();
    const extraDelay = 100;
    IdleManager.create({ onIdle: cb, idleTimeout: 10 * 60 * 1000 + extraDelay });
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 10 minutes
    jest.advanceTimersByTime(10 * 60 * 1000);
    expect(cb).not.toHaveBeenCalled();
    jest.advanceTimersByTime(extraDelay);
    expect(cb).toHaveBeenCalled();
  });
  it('should delay its callback on keyboard events', () => {
    const cb = jest.fn();
    const manager = IdleManager.create({ onIdle: cb });
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 9 minutes
    jest.advanceTimersByTime(9 * 60 * 1000);
    expect(cb).not.toHaveBeenCalled();
    document.dispatchEvent(new KeyboardEvent('keydown'));

    // wait 5 minutes
    jest.advanceTimersByTime(5 * 60 * 1000);
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 9 minutes
    jest.advanceTimersByTime(9 * 60 * 1000);
    expect(cb).toHaveBeenCalled();
  });
  it('should delay its callback on mouse events', () => {
    const cb = jest.fn();
    const manager = IdleManager.create({ onIdle: cb });
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 9 minutes
    jest.advanceTimersByTime(9 * 60 * 1000);
    expect(cb).not.toHaveBeenCalled();
    // simulate user moving the mouse
    document.dispatchEvent(new MouseEvent('mousemove'));

    // wait 5 minutes
    jest.advanceTimersByTime(5 * 60 * 1000);
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 9 minutes
    jest.advanceTimersByTime(9 * 60 * 1000);
    expect(cb).toHaveBeenCalled();
  });

  it('should delay its callback on touch events', () => {
    const cb = jest.fn();
    const manager = IdleManager.create({ onIdle: cb });
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 9 minutes
    jest.advanceTimersByTime(9 * 60 * 1000);
    expect(cb).not.toHaveBeenCalled();
    // simulate user touching the screen
    document.dispatchEvent(new TouchEvent('touchstart'));

    // wait 5 minutes
    jest.advanceTimersByTime(5 * 60 * 1000);
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 9 minutes
    jest.advanceTimersByTime(9 * 60 * 1000);
    expect(cb).toHaveBeenCalled();
  });
  it('should delay its callback on scroll events', () => {
    const cb = jest.fn();

    const scrollDebounce = 100;

    const manager = IdleManager.create({ onIdle: cb, captureScroll: true, scrollDebounce });
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 9 minutes
    jest.advanceTimersByTime(9 * 60 * 1000);
    expect(cb).not.toHaveBeenCalled();
    // simulate user scrolling
    document.dispatchEvent(new WheelEvent('scroll'));

    // wait 5 minutes
    jest.advanceTimersByTime(5 * 60 * 1000);
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 9 minutes, plus the debounce
    jest.advanceTimersByTime(9 * 60 * 1000 + scrollDebounce);
    expect(cb).toHaveBeenCalled();
  });
});
