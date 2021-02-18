/**
 * Combine multiple iterAsyncIterablesables, interleaving the emits
 * @param iterable - iterable of AsyncIterables
 * @yields - any item yielded from iterable
 */
export async function* combine<T, TReturn>(
  iterable: Iterable<AsyncIterable<T>>,
): AsyncIterableIterator<T> {
  const asyncIterators = Array.from(iterable, o => o[Symbol.asyncIterator]());
  const results: TReturn[] = [];
  let count = asyncIterators.length;
  const never = new Promise(() => {
    /*noop*/
  });
  function getNext(asyncIterator: AsyncIterator<T>, index: number) {
    return asyncIterator.next().then(result => ({
      index,
      result,
    }));
  }
  const nextPromises: Array<Promise<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | any
    | {
        index: number;
        result: IteratorResult<T, TReturn>;
      }
  >> = asyncIterators.map(getNext);
  try {
    while (count) {
      const { index, result } = await Promise.race(nextPromises);
      if (result.done) {
        nextPromises[index] = never;
        results[index] = result.value;
        count--;
      } else {
        nextPromises[index] = getNext(asyncIterators[index], index);
        yield result.value;
      }
    }
  } finally {
    for (const [index, iterator] of asyncIterators.entries()) {
      if (nextPromises[index] !== never && typeof iterator.return === 'function') {
        iterator.return();
      }
    }
    // no await here - see https://github.com/tc39/proposal-async-iteration/issues/126
  }
  return results;
}
