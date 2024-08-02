import 'fake-indexeddb/auto';
import { TextEncoder } from 'util';
import '@testing-library/jest-dom';

global.TextEncoder = TextEncoder;
