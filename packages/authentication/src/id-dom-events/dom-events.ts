/**
 * Create an AsyncIterable from a callback.
 * via https://bit.ly/3aD3uD1
 * @param emitter - called with cb to register cb with event source
 */
export function CallbackIterable<V>(emitter: (cb: (value: V) => void) => void): AsyncIterable<V> {
  let values: V[];
  let resolve: (values: V[]) => void;
  const init = (r: (values: V[]) => void) => ([values, resolve] = [[], r]);
  let valuesAvailable = new Promise(init);
  emitter(value => {
    values.push(value);
    resolve(values);
  });
  return {
    async *[Symbol.asyncIterator]() {
      for (;;) {
        const vs = await valuesAvailable;
        valuesAvailable = new Promise(init);
        yield* vs;
      }
    },
  };
}

/**
 * Create an AsyncIterable of DOM Events. This can be more composable that the EventTarget
 * interface itself.
 * @param listenable - EvenTarget to monitor for events
 * @param eventName - string name of event to listen for
 * @param options - AddEventListenerOptions just like EventTarget.addEventListener.
 */
export function EventIterable(
  listenable: Pick<EventTarget, 'addEventListener'>,
  eventName: string,
  options?: boolean | AddEventListenerOptions,
): AsyncIterable<Event> {
  return CallbackIterable(listener => {
    listenable.addEventListener(eventName, listener, options);
  });
}
