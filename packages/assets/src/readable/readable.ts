export interface Readable {
  fileName: string;
  contentType: string;
  length: number;
  open: () => Promise<void>;
  close: () => Promise<void>;
  slice: (start: number, end: number) => Promise<Uint8Array>;
}

export const isReadable = (value: any): value is Readable =>
  typeof value === 'object' &&
  typeof value.fileName === 'string' &&
  typeof value.contentType === 'string' &&
  typeof value.length === 'number' &&
  typeof value.open === 'function' &&
  typeof value.close === 'function' &&
  typeof value.slice === 'function';
