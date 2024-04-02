import { delayWithStrategy, exponentialBackoff } from './strategy';

describe('delayWithStrategy', () => {
  it('should do exponential backoff', async () => {
    const iterations = 0;
    expect(exponentialBackoff(iterations)).toBe(0);
    expect(exponentialBackoff(1)).toBe(300);
    expect(exponentialBackoff(2)).toBe(600);
    expect(exponentialBackoff(3)).toBe(1200);
  });

  it('should delay the execution of the function by a certain amount of time', async () => {
    jest.useRealTimers();
    const iterations = 0;
    const strategy = jest.fn().mockReturnValue(0);
    await delayWithStrategy(iterations, strategy);
    expect(strategy).toHaveBeenCalledWith(iterations);

    const iterations2 = 1;
    const strategy2 = jest.fn().mockReturnValue(400);
    await delayWithStrategy(iterations2, strategy2);
    expect(strategy2).toHaveBeenCalledWith(iterations2);
  });
});
