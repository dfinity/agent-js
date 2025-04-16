declare module 'borc' {
  class Decoder {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(opts: { size: number; tags: Record<number, (val: any) => any> });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    decodeFirst(input: ArrayBuffer): any;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function decodeFirst(input: ArrayBuffer): any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function encode(o: any): Uint8Array;

  class Tagged {
    tag: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(tag: number, value: any);
  }
}
