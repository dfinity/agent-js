export interface Readable {
  fileName: string;
  contentType: string;
  length: number;
  open: () => Promise<void>;
  close: () => Promise<void>;
  slice: (start: number, end: number) => Promise<Uint8Array>;
}

const isObjWithKeys = <K extends PropertyKey>(
  obj: unknown,
  ...keys: Array<K | null | undefined>
): obj is Record<K, unknown> =>
  obj !== null &&
  typeof obj === 'object' &&
  keys.every(key => key !== null && key !== undefined && key in obj);

export const isReadable = (value: unknown): value is Readable =>
  isObjWithKeys(value, 'fileName', 'contentType', 'length', 'open', 'close', 'slice') &&
  typeof value.fileName === 'string' &&
  typeof value.contentType === 'string' &&
  typeof value.length === 'number' &&
  typeof value.open === 'function' &&
  typeof value.close === 'function' &&
  typeof value.slice === 'function';
