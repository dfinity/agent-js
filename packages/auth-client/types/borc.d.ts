// TODO: remove in #1015
declare module 'borc' {
  export class Decoder {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(opts: { size: number; tags: Record<number, (val: any) => any> });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    decodeFirst(input: ArrayBuffer): any;
  }

  export class Tagged {
    tag: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(tag: number, value: any);
  }

  interface BorcModule {
    Decoder: typeof Decoder;
    Tagged: typeof Tagged;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    decodeFirst(input: ArrayBuffer): any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    encode(o: any): Uint8Array;
  }

  const borc: BorcModule;
  export = borc;
}
