
window.addEventListener('load', async () => {
  // Verify user's web browser has necessary support
  if (!window.navigator.serviceWorker) {
    // Nope, the user will need to upgrade or proceed without security
    alert('This web browser cannot interact with the Internet Computer securely. Please try new web browser software.');
    // TODO: add a "proceed without security link". We will need to create this on a some
    // special domain e.g. canister-id.icx.app
  } else {
    console.log("IC Bootstrap HTML installing a service worker to proxy and validate raw content into the browser...");
    // Ok, let's install the service worker...
    // note: if the service worker was already installed, when the browser requested <domain>/, it would have
    // proxied the response from <domain>/<canister-id>/, so this bootstrap file would never been
    // retrieved from the boundary nodes

    // Webpack recognizes this special syntax so it's okay to ignore that this isn't a string.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const reg = await navigator.serviceWorker.register(new URL("./sw/sw.ts", import.meta.url) as any);
    if (reg.installing) {
      const sw = reg.installing || reg.waiting;
      sw.onstatechange = () => {
        if (sw.state === 'installed') {
          window.location.reload();
        }
      };
    } else if (reg.active) {
      // Hmmm we're not sure what's happening here. If the service worker was running, usually it would have obtained
      // the underlying raw content from the canister, validated it, and proxied it to the browser. However some exceptions
      // are possible:
      // (1) The user did a hard page reload (eg Command-Shift-R, forcing this page to load without proxying)
      // To take account of the unknowns, we set the error messge to warn the user, then reload the page after a short delay...
      // status('<h1>Internet Computer Validating Service Worker</h1><p>-*- This is not a validated copy of the raw content -*-</p><p>Reloading the page to try again...</p>');
      setTimeout(function() { window.location.reload(); }, 800)
    }
  }
});
