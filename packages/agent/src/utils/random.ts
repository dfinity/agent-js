export const randomNumber = () => {
  // determine whether browser crypto is available
  if (typeof window !== 'undefined' && !!window.crypto && !!window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] / 4294967295;
  }
  // A second check for webcrypto, in case it is loaded under global instead of window
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    array;
    array[0]; //?
    return array[0] / 4_294_967_295;
  }

  type nodeCrypto = {
    randomInt: (min: number, max: number) => number;
  };

  // determine whether node crypto is available
  if (typeof crypto !== 'undefined' && (crypto as unknown as nodeCrypto).randomInt) {
    return (crypto as unknown as nodeCrypto).randomInt(0, 1_000_000_000) / 4_294_967_295;
  }

  // fall back to Math.random
  return Math.random();
};
