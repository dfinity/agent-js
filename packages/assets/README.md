# @dfinity/assets

Manage assets on an Internet Computer assets canister.

Visit the [Dfinity Forum](https://forum.dfinity.org/) and [SDK Documentation](https://sdk.dfinity.org/docs/index.html)
for more information and support building on the Internet Computer.

Additional API Documentation can be found [here](https://agent-js.icp.xyz/assets/index.html).

---

## Installation

Using AssetManager:

```
npm i --save @dfinity/assets
```

### In the browser:

```
import { AssetManager } from "@dfinity/assets";
```

### In Node.js:

```
const { AssetManager } = require("@dfinity/assets");
```

## Using AssetManager

AssetManager supports the (chunked) upload of File, Blob, ArrayBuffer, Uint8Array and number[].

Create an asset manager instance

```js
const assetManager = new AssetManager({
    canisterId: ..., // Principal of assets canister
    agent: ..., // Identity in agent must be authorized by the assets canister to make any changes
});
```

AssetManager config extends Actor config with additional options

```ts
export interface AssetManagerConfig extends ActorConfig {
    /**
     * Max number of concurrent requests to the Internet Computer
     * @default 16
     */
    concurrency?: number;
    /**
     * Max file size in bytes that the asset manager shouldn't chunk
     * @default 1900000
     */
    maxSingleFileSize?: number;
    /**
     * Size of each chunk in bytes when the asset manager has to chunk a file
     * @default 1900000
     */
    maxChunkSize?: number;
}
```

Select file and upload to asset canister in browser

```js
const input = document.createElement('input');
input.type = 'file';
input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const key = await assetManager.store(file);
});
input.click();
```

Config can be optionally passed as second argument in the `store` method.
The `fileName` property is required when the data passed in the first argument 
is not a `File`, file path or custom `Readable` implementation

```ts
export interface StoreConfig {
    /**
     * File name
     * @default File object name or name in file path
     */
    fileName?: string;
    /**
     * File path that file will be uploaded to
     * @default '/'
     */
    path?: string;
    /**
     * File content type
     * @default File/Blob object type or type from file name extension
     */
    contentType?: string;
    /**
     * Content encoding
     * @default 'identity'
     */
    contentEncoding?: ContentEncoding;
    /**
     * File hash generation will be skipped if hash is provided
     */
    sha256?: Uint8Array;
    /**
     * Callback method to get upload progress in bytes (current / total)
     */
    onProgress?: (progress: Progress) => void;
}
```

Read file from disk and upload to asset canister in Node.js

```js
const file = fs.readFileSync('./example.csv');
const key = await assetManager.store(file, {fileName: 'example.csv'});
```

Delete file from asset canister

```js
const key = '/path/to/example.jpg'
await assetManager.delete(key);
```

List files in asset canister

```js
const files = await assetManager.list();
```

Upload multiple files and delete an existing file as batch in Node.js

```js
const fs = require('fs');

const banana = fs.readFileSync('./banana.png');
const apple = fs.readFileSync('./apple.png');
const strawberry = fs.readFileSync('./strawberry.png');
const batch = assetManager.batch();
const keys = [
    await batch.store(banana, {fileName: 'banana.png'}),
    await batch.store(apple, {fileName: 'apple.png', path: '/directory/with/apples'}),
    await batch.store(strawberry, {fileName: 'strawberry.png'}),
];
await batch.delete('/path/to/old/file.csv');
await batch.commit();
```

Read file from disk, compress with gzip and upload to asset canister in Node.js,
GZIP compression is recommended for HTML and JS files

```js
const fs = require('fs');
const pako = require('pako');

const file = fs.readFileSync('./index.html');
const gzippedFile = pako.gzip(file);
const key = await assetManager.insert(gzippedFile, {
    fileName: 'index.html',
    contentEncoding: 'gzip',
});
```

Download image asset to blob and open in new browser tab

```js
const asset = await assetManager.get('/path/to/file/on/asset/canister/motoko.png');
const blob = await asset.toBlob();
const url = URL.createObjectURL(blob);

window.open(URL.createObjectURL(blob, '_blank'));
```

Download and write asset to path in Node.js

```js
const asset = await assetManager.get('/large_dataset.csv');
asset.write('/large_dataset.csv');
```

