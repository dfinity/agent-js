const base64 =
  'owBjMS4wAYIB2BhYS6QBAiABIVgg9mAYr7gvS1_HoS6jCYHeU5CsIXm9WIKdDYO_K40TcpAiWCBS71FJ5Dqpen-RGx7B9myPf4KdLrgkt2iUfnjVBnXaCAKBgwIBowD0AfULUEpqDHHSUUKfgCqA9h8vDqs';

function convert(str: string) {
  const byteArray = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    byteArray[i] = str.charCodeAt(i);
  }
  return byteArray;
}
convert(base64); //?

// turn uint8array into string of bytes
function toHex(buffer: ArrayBuffer | Uint8Array) {
  return Array.prototype.map
    .call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2))
    .join('');
}
toHex(convert(base64)); //?
