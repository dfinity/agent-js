import { getAssetFromKV, serveSinglePageApp } from '@cloudflare/kv-asset-handler';

addEventListener('fetch', event => {
  try {
    event.respondWith(handleEvent(event))
  } catch (e) {
    if (DEBUG) {
      return event.respondWith(
        new Response(e.message || e.toString(), {
          status: 500,
        }),
      )
    }
    event.respondWith(new Response('Internal Error', { status: 500 }))
  }
})

async function handleEvent(event) {
  /**
   * You can add custom logic to how we fetch your assets
   * by configuring the function `mapRequestToAsset`.
   * In this case, we serve a single page app from index.html.
   */

  const response = await getAssetFromKV(event, { mapRequestToAsset: serveSinglePageApp })
  return response
}
