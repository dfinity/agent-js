'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.decode = exports.encode = exports.CborTag = void 0;
// tslint:disable:max-classes-per-file
// This file is based on:
// tslint:disable-next-line: max-line-length
// https://github.com/dfinity-lab/dfinity/blob/9bca65f8edd65701ea6bdb00e0752f9186bbc893/docs/spec/public/index.adoc#cbor-encoding-of-requests-and-responses
const borc_1 = __importDefault(require('borc'));
const cbor = __importStar(require('simple-cbor'));
const simple_cbor_1 = require('simple-cbor');
const buffer_js_1 = require('./utils/buffer.js');
// We are using hansl/simple-cbor for CBOR serialization, to avoid issues with
// encoding the uint64 values that the HTTP handler of the client expects for
// canister IDs. However, simple-cbor does not yet provide deserialization so
// we are using `Uint8Array` so that we can use the dignifiedquire/borc CBOR
// decoder.
class PrincipalEncoder {
  get name() {
    return 'Principal';
  }
  get priority() {
    return 0;
  }
  match(value) {
    return value && value._isPrincipal === true;
  }
  encode(v) {
    return cbor.value.bytes(v.toUint8Array());
  }
}
class BufferEncoder {
  get name() {
    return 'Buffer';
  }
  get priority() {
    return 1;
  }
  match(value) {
    return value instanceof ArrayBuffer || ArrayBuffer.isView(value);
  }
  encode(v) {
    return cbor.value.bytes(new Uint8Array(v));
  }
}
class BigIntEncoder {
  get name() {
    return 'BigInt';
  }
  get priority() {
    return 1;
  }
  match(value) {
    return typeof value === `bigint`;
  }
  encode(v) {
    // Always use a bigint encoding.
    if (v > BigInt(0)) {
      return cbor.value.tagged(2, cbor.value.bytes((0, buffer_js_1.fromHex)(v.toString(16))));
    } else {
      return cbor.value.tagged(
        3,
        cbor.value.bytes((0, buffer_js_1.fromHex)((BigInt('-1') * v).toString(16))),
      );
    }
  }
}
const serializer = simple_cbor_1.SelfDescribeCborSerializer.withDefaultEncoders(true);
serializer.addEncoder(new PrincipalEncoder());
serializer.addEncoder(new BufferEncoder());
serializer.addEncoder(new BigIntEncoder());
var CborTag;
(function (CborTag) {
  CborTag[(CborTag['Uint64LittleEndian'] = 71)] = 'Uint64LittleEndian';
  CborTag[(CborTag['Semantic'] = 55799)] = 'Semantic';
})((CborTag = exports.CborTag || (exports.CborTag = {})));
/**
 * Encode a JavaScript value into CBOR.
 */
function encode(value) {
  return serializer.serialize(value);
}
exports.encode = encode;
function decodePositiveBigInt(buf) {
  const len = buf.byteLength;
  let res = BigInt(0);
  for (let i = 0; i < len; i++) {
    // tslint:disable-next-line:no-bitwise
    res = res * BigInt(0x100) + BigInt(buf[i]);
  }
  return res;
}
// A BORC subclass that decodes byte strings to ArrayBuffer instead of the Buffer class.
class Uint8ArrayDecoder extends borc_1.default.Decoder {
  createByteString(raw) {
    return (0, buffer_js_1.concat)(...raw);
  }
  createByteStringFromHeap(start, end) {
    if (start === end) {
      return new ArrayBuffer(0);
    }
    return new Uint8Array(this._heap.slice(start, end));
  }
}
function decode(input) {
  const buffer = new Uint8Array(input);
  const decoder = new Uint8ArrayDecoder({
    size: buffer.byteLength,
    tags: {
      // Override tags 2 and 3 for BigInt support (borc supports only BigNumber).
      2: val => decodePositiveBigInt(val),
      3: val => -decodePositiveBigInt(val),
      [CborTag.Semantic]: value => value,
    },
  });
  return decoder.decodeFirst(buffer);
}
exports.decode = decode;
//# sourceMappingURL=cbor.js.map
