import { describe, it, beforeEach, expect, vi } from 'vitest';
import { IdleManager } from './idleManager';

vi.useFakeTimers();

const { location } = window;

beforeEach(() => {
  delete (window as any).location;
  (window as any).location = { reload: vi.fn() };
});

describe('IdleManager tests', () => {
  it('should call its callback after time spent inactive', () => {
    const cb = vi.fn();
    const manager = IdleManager.create({ onIdle: cb, captureScroll: true });
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 10 minutes
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(cb).toHaveBeenCalled();
    manager.exit();
  });
  it('should replace the default callback if a callback is passed during creation', () => {
    const idleFn = vi.fn();
    IdleManager.create({ onIdle: idleFn });

    expect(window.location.reload).not.toHaveBeenCalled();
    // simulate user being inactive for 10 minutes
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(window.location.reload).not.toHaveBeenCalled();
    expect(idleFn).toBeCalled();
  });
  it('should replace the default callback if a callback is registered', () => {
    const manager = IdleManager.create();

    manager.registerCallback(vi.fn());

    expect(window.location.reload).not.toHaveBeenCalled();
    // simulate user being inactive for 10 minutes
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(window.location.reload).not.toHaveBeenCalled();
  });
  it('should delay allow configuration of the timeout', () => {
    const cb = vi.fn();
    const extraDelay = 100;
    IdleManager.create({ onIdle: cb, idleTimeout: 10 * 60 * 1000 + extraDelay });
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 10 minutes
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(extraDelay);
    expect(cb).toHaveBeenCalled();
  });
  it('should delay its callback on keyboard events', () => {
    const cb = vi.fn();
    const manager = IdleManager.create({ onIdle: cb });
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 9 minutes
    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(cb).not.toHaveBeenCalled();
    document.dispatchEvent(new KeyboardEvent('keydown'));

    // wait 5 minutes
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 9 minutes
    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(cb).toHaveBeenCalled();
  });
  it('should delay its callback on mouse events', () => {
    const cb = vi.fn();
    const manager = IdleManager.create({ onIdle: cb });
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 9 minutes
    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(cb).not.toHaveBeenCalled();
    // simulate user moving the mouse
    document.dispatchEvent(new MouseEvent('mousemove'));

    // wait 5 minutes
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 9 minutes
    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(cb).toHaveBeenCalled();
  });

  it('should delay its callback on touch events', () => {
    const cb = vi.fn();
    const manager = IdleManager.create({ onIdle: cb });
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 9 minutes
    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(cb).not.toHaveBeenCalled();
    // simulate user touching the screen
    document.dispatchEvent(new TouchEvent('touchstart'));

    // wait 5 minutes
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 9 minutes
    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(cb).toHaveBeenCalled();
  });
  it('should delay its callback on scroll events', () => {
    const cb = vi.fn();

    const scrollDebounce = 100;

    const manager = IdleManager.create({ onIdle: cb, captureScroll: true, scrollDebounce });
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 9 minutes
    vi.advanceTimersByTime(9 * 60 * 1000);
    expect(cb).not.toHaveBeenCalled();
    // simulate user scrolling
    document.dispatchEvent(new WheelEvent('scroll'));

    // wait 5 minutes
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(cb).not.toHaveBeenCalled();
    // simulate user being inactive for 9 minutes, plus the debounce
    vi.advanceTimersByTime(9 * 60 * 1000 + scrollDebounce);
    expect(cb).toHaveBeenCalled();
  });
});
