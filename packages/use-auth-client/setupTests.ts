import 'fake-indexeddb/auto';
import { TextEncoder } from 'util';
import '@testing-library/jest-dom';

import { Crypto } from '@peculiar/webcrypto';
const crypto = new Crypto();

Object.defineProperty(globalThis, 'crypto', {
  value: crypto,
});

Object.defineProperty(global, 'console', {
  writable: true,
  value: { ...global.console, log: jest.fn(), warn: jest.fn(), error: jest.fn() },
});

  
global.TextEncoder = TextEncoder;
