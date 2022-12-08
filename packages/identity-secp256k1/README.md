# @dfinity/identity-secp256k1

The Secp256k1KeyIdentity package provides an implementation of the SignIdentity interface for the secp256k1 elliptic curve. It allows you to create and manage key pairs for signing and verification of messages.

Example
Here's an example of how to use the Secp256k1KeyIdentity class to generate a new key pair and sign and verify a message:

```ts
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';

// Generate a new key pair
const identity = Secp256k1KeyIdentity.generate();

// Sign a message
const message = 'Hello, world!';
const signature = identity.sign(message);

// Verify the signature
const isValid = identity.verify(message, signature);

console.log(`Signature is ${isValid ? 'valid' : 'invalid'}`);
```

You can also use a seed to generate deterministic key pairs:

```ts
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';

const seed = Buffer.from('my-secret-seed', 'utf8');
const identity = Secp256k1KeyIdentity.generate(seed);
```

The Secp256k1KeyIdentity class also provides methods for converting the key pair to and from JSON-serializable objects:

```ts
import { Secp256k1KeyIdentity } from '@dfinity/agent';

// Generate a new key pair
const identity = Secp256k1KeyIdentity.generate();

// Convert the key pair to a JSON-serializable object
const json = identity.toJson();

// Convert the JSON-serializable object back to a key pair
const restoredIdentity = Secp256k1KeyIdentity.fromJson(json);
```

References
The Secp256k1KeyIdentity class extends the SignIdentity interface from the @dfinity/agent package. For more information about the SignIdentity interface and how to use it, see the [@dfinity/agent documentation](https://agent-js.icp.xyz/agent/classes/SignIdentity.html)
