function toHex(arr) {
  // Convert to hexadecimal
  // padd with leading 0 if <16
  function i2hex(i) {
    return ('0' + i.toString(16)).slice(-2);
  }

  return Array.from(arr).map(i2hex).join('');
}

async function loadProtobuf(schema, typeName) {
  const protobufjs = await import('protobufjs');
  const pbRoot = new protobufjs.Root();

  const oldFetch = protobufjs.Root.prototype.fetch;
  pbRoot.fetch = (path, cb) => {
    if (path !== 'schema.proto') {
      return oldFetch.call(this, path, cb);
    } else {
      cb(null, schema);
    }
  };

  const root = await protobufjs.load('schema.proto', pbRoot);
  return root.lookupType(typeName);
}

async function encodeProtobuf(schema, typeName, value) {
  const messageType = await loadProtobuf(schema, typeName);

  // Encode.
  const maybeError = messageType.verify(JSON.parse(value));

  if (maybeError) {
    throw maybeError;
  }

  const message = messageType.encode(JSON.parse(value)).finish();
  return new Uint8Array(message);
}

async function decodeProtobuf(schema, typeName, value) {
  const messageType = await loadProtobuf(schema, typeName);
  return await messageType.decode(value);
}

// Disable all buttons that should only be when connected.
for (const el of document.getElementsByClassName('connected-only')) {
  el.disabled = true;
}

let identity = undefined;

document.getElementById('connectLedgerBtn').addEventListener('click', async () => {
  const { LedgerIdentity } = await import('@dfinity/identity-ledgerhq');
  identity = await LedgerIdentity.create();

  document.getElementById('ledgerPrincipal').innerText = `${identity.getPrincipal().toText()}`;
  for (const el of document.getElementsByClassName('connected-only')) {
    el.disabled = false;
  }
});

document.getElementById('checkAddressBtn').addEventListener('click', async () => {
  await identity.showAddressAndPubKeyOnDevice();
});

document.getElementById('sendBtn').addEventListener('click', async () => {
  const { blobFromUint8Array, HttpAgent, makeNonceTransform, polling } = await import(
    '@dfinity/agent'
  );

  const schemaText = document.getElementById('schema').value;
  const valueText = document.getElementById('value').value;
  const messageTypeName = document.getElementById('requestType').value;

  const payload = await encodeProtobuf(schemaText, messageTypeName, valueText);
  console.log(toHex(payload));

  const host = document.getElementById('hostUrl').value;
  const canisterId = document.getElementById('canisterId').value;

  // Need to run a replica locally which has ledger canister running on it
  const agent = new HttpAgent({ host, identity });

  const resp = await agent.call(canisterId, {
    methodName: document.getElementById('methodName').value,
    arg: blobFromUint8Array(payload),
  });

  const result = await polling.pollForResponse(
    agent,
    canisterId,
    resp.requestId,
    polling.strategy.defaultStrategy(),
  );

  console.log(toHex(result));

  // const result = new Uint8Array([8, 8]);
  const responseTypeName = document.getElementById('responseType').value;
  const responsePayload = await decodeProtobuf(schemaText, responseTypeName, result);

  document.getElementById('responseJson').innerText = JSON.stringify(responsePayload);
});
