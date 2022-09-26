export type LimitFn = <T>(fn: () => Promise<T>) => Promise<T>;

/**
 * Minimal promise executor with concurrency limit implementation
 * @param concurrency Maximum number of promises executed concurrently
 */
export const limit = (concurrency: number): LimitFn => {
  const queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (value: any) => void;
  }> = [];
  let active = 0;
  const next = () => {
    if (active < concurrency && queue.length > 0) {
      active++;
      const { fn, resolve, reject } = queue.shift()!;
      fn()
        .then(resolve)
        .catch(reject)
        .then(() => {
          active--;
          next();
        });
    }
  };
  return fn =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
};
