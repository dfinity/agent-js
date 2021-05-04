import { sha256 } from 'js-sha256';

// DEBUGGING TIPS
// 1. in your Chromium browser settings, set the option "Preserve log upon navigation" to true to prevent
// the console log and error messages disappearing on page reload.

// LIMITATIONS
// 1. you cannot intercept and proxy initial requests for favicon.ico. This is why the project include that file,
// otherwise you see an annoying red message in the JavaScript console log on every refresh!! Once the default
// file is loaded, it is then possible for the service worker to "rewrite" it, which means that canisters can
// define their own favicons. Try Command-Shift-R to watch the interesting behavior in action!

const LOG_PREFIX = "IC Service Worker:";
console.log(LOG_PREFIX, 'Script is running...');

declare const self: ServiceWorkerGlobalScope;

// Always install updated SW immediately
self.addEventListener('install', () => {
  self.skipWaiting();
  console.log(LOG_PREFIX, "Successfully installed! Secure in-browser proxying now active...");
})

// Intercept and proxy all fetch requests made by the browser or DOM on this scope.
self.addEventListener('fetch', (event: any) => {
  const url = new URL(event.request.url);
  const scope = "/"; //self.registration.scope;
  event.respondWith(
    // TODO: Do the thing!
    new Response("Hello World!"),
    // streamingResponseWithValidation(event, proxiedUrl)
  );
  //
  //
  // // Is the requested resource served by the front-end canister?
  // if (url.href.startsWith(scope) && isValidatedEndPointRoot(url) && isValidatedResourceType(url)) {
  //   // Yes, so we need to work out the proxied url
  //   const canisterId = url.href.slice(url.protocol.length+2).split(".")[0]; // subdomain is canister id
  //   const proxiedUrl = scope+'raw/'+url.href.slice(scope.length);
  //   // and then respond with a verified stream...
  //   event.respondWith(
  //     // TODO: Do the thing!
  //     new Response("Hello World!"),
  //     // streamingResponseWithValidation(event, proxiedUrl)
  //   );
  // } else {
  //   // Nope, the requested resource is outside the scope of this front-end canister.
  //   // Therefore we aim to blindly load and return the requested resource.
  //   // NOTE this will not work if the requested resource belongs to another front-end canister
  //   // for which this service worker has yet been installed, since the bootstrap html will be served.
  //   const outsideRequest = new Request(url.href, { mode: 'no-cors' });
  //   event.respondWith(fetch(outsideRequest));
  // }
})

// Create a new request, and return the new response stream, which we validate progressively
function streamingResponseWithValidation(event: any, url: string) {
  console.log(LOG_PREFIX, "Loading proxied raw url", url);
  return fetch( new Request(url, { mode: 'cors', credentials: 'omit' }) )
    .then(response => {
      return streamAndValidate(url, event, response);
    })
    .catch(error => {
      console.error(LOG_PREFIX, error+' for '+url);
    });
}

// Write response stream and validate. Note that if validation fails at the end, we throw an
// error through the browser
function streamAndValidate(url: string, event: any, response: any) {
  const hash = sha256.create();

  // We need a readable stream.
  if (!response.body) {
    console.warn(LOG_PREFIX, "ReadableStream is not yet supported in this browser.  See https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream")
    return response;
  }

  // We need the response to be ok.
  if (!response.ok) {
    console.error(LOG_PREFIX, 'HTTP '+response.status+' ('+response.statusText+')');
    return response;
  }

  // We need to the response to only contain headers that we allow. For example, a naughty
  // replica node might insert a header to do some mischief.
  if (!onlyAllowedResponseHeaders(response)) {
    throw new Error("Response from IC contains forbidden headers");
  }

  // We need to know the content length.
  // Server must send custom x-file-size header if gzip or other content-encoding is used.
  const contentEncoding = response.headers.get('content-encoding');
  const contentLength = response.headers.get(contentEncoding ? 'x-file-size' : 'content-length');
  if (contentLength === null) {
    console.warn(LOG_PREFIX, 'Response size header unavailable so cannot stream response and validate');
    // TODO: load all and validate anyway
    return response;
  }

  // What is total number of bytes to load?
  const total = parseInt(contentLength, 10);
  console.log(LOG_PREFIX, "Content length", total);

  // Track processed bytes, buffers etc
  let loaded = 0; // how many bytes are loaded
  let bufferCount = 0; // depends on response buffer size

  // Get the read stream from the response body
  const reader = response.body.getReader();

  // Create a streaming response for the browser to obtain the bytes
  return new Response( new ReadableStream({

    start(controller: any) {

      function read() {
        reader.read().then(({done, value}: any) => {

          // EOF
          if (done) {
            // All buffers read. What have we got?
            let digest = hash.hex();
            console.log(LOG_PREFIX, url, "read() in", bufferCount, "buffer(s).", "SHA-256 was", digest);

            // Ok, now we've read all the response data and streamed it to the browser, it's time to validate
            // the data by matching the response against the IC certified variable that should have been passed
            // in the header. If we find it's invalid we can make the stream throw an error rather than closing
            // it cleanly, which will cause the browser to reject the content (even if it has been
            // e.g. progressively displayed in an <img> tag).
            if (isResponseValid(response, hash)) {
              // Yay, was valid, so let's close the stream cleanly...
              controller.close();
            } else  {
              // Nope, was not valid, so let's blow this resource up!
              controller.error();
            }
            return;
          }

          // Report progress to client
          loaded += value ? value.byteLength : 0;
          // if (client) {
          //   const MsgType = "ICSW.LoadProgress";
          //   var msg = {MsgType, url, loaded, total};
          //   client.postMessage(msg);
          // }

          bufferCount++;

          // Update the hash digest with the data
          hash.update(value);

          // Send the data onwards, then read some more...
          controller.enqueue(value);
          read();
        })
          .catch((error: any) => {
            // Hmmm.. this might indicate that the network failed mid download
            console.error(LOG_PREFIX, url, 'read() error', error);
            controller.error(error)
          });
      }

      // Start reading...
      read();
    },
    // Firefox excutes this on page stop, Chrome does not
    cancel(reason: string) {
      console.log(LOG_PREFIX, 'cancel()', reason);
    }
  }));
}

// TODO:
// We do not need to validate all content served by the IC if we want more performance
function isValidatedResourceType(url: URL) {
  return true;
}

// TODO: consider moving verification of update and query calls into this service worker
// We do not need to validate all canister end-point roots e.g. don't validate responses from "raw"
function isValidatedEndPointRoot(url: URL) {
  // Ignore requests below "raw" root
  // Ignore requests below "api" root, for now..
  if (url.pathname.startsWith("/raw") || url.pathname.startsWith("/api")) {
    console.log(LOG_PREFIX, "ignoring", url.href);
    return false;
  }
  return true;
}

// TODO:
// We only allow certain headers to be included with responses
function onlyAllowedResponseHeaders(response: any) {
  return true;
}

//
// Cryptography
//

// TODO:
// We validate that the response name and body is a certified variable that belongs to the canister
function isResponseValid(response: any, hash: any) {
  let certifiedVar = response.headers.get('ic-variable-certification');
  // do validation
  // ...
  return true;
}
