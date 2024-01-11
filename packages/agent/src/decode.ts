import * as cbor from './cbor.ts';
const base64 =
  'owBjMS4wAYIB2BhYS6QBAiABIVgg9mAYr7gvS1_HoS6jCYHeU5CsIXm9WIKdDYO_K40TcpAiWCBS71FJ5Dqpen-RGx7B9myPf4KdLrgkt2iUfnjVBnXaCAKBgwIBowD0AfULUEpqDHHSUUKfgCqA9h8vDqs';

function convert(string) {
  const byteArray = new Uint8Array(string.length);
  for (let i = 0; i < string.length; i++) {
    byteArray[i] = string.charCodeAt(i);
  }
  return byteArray;
}
convert(base64); //?

// turn uint8array into string of bytes
function toHex(buffer) {
  return Array.prototype.map
    .call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2))
    .join('');
}
toHex(convert(base64)); //?
