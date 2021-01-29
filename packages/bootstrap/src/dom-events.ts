function fromCallback<V>(emitter: (cb: (value: V) => void) => void): AsyncIterable<V> {
  let values: V[];
  let resolve: (values: V[]) => void;
  const init = (r: (values: V[]) => void) => ([values, resolve] = [[], r]);
  let valuesAvailable = new Promise(init);
  emitter(value => {
    values.push(value);
    resolve(values);
  });
  return {
    [Symbol.asyncIterator]: async function* () {
      for (;;) {
        const vs = await valuesAvailable;
        valuesAvailable = new Promise(init);
        yield* vs;
      }
    },
  };
}

export function EventIterable(
  node: Pick<Node, 'addEventListener'>,
  eventName: string,
  options?: boolean | AddEventListenerOptions,
) {
  return fromCallback(listener => {
    node.addEventListener(eventName, listener, options);
  });
}

/**
 * Create a CustomEvent with proper typescript awareness of .type
 */
export function createCustomEvent<T extends string, D>(type: T, options: CustomEventInit<D>) {
  return new CustomEvent(type, options) as CustomEvent<D> & { type: T };
}
