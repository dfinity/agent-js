export type CustomEventWithDetail<T, D> = CustomEvent<D> & { type: T };

/**
 * Create a CustomEvent with proper typescript awareness of .type
 * @param type - Event Type as a string
 * @param options - Normal CustomEvent option
 */
export function createCustomEvent<T extends string, D>(
  type: T,
  options: CustomEventInit<D>,
): CustomEventWithDetail<T, D> {
  const event = new CustomEvent(type, options) as CustomEventWithDetail<T, D>;
  return event;
}
