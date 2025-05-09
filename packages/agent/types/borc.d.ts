declare module 'borc' {
  import { Buffer } from 'buffer/';

  class Decoder {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(opts: { size: number; tags: Record<number, (val: any) => any> });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    decodeFirst(input: Uint8Array): any;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function decodeFirst(input: Uint8Array): any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function encode(o: any): Buffer;

  class Tagged {
    tag: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(tag: number, value: any);
  }
}
