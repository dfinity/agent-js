import * as playwright from "playwright";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

/**
 * Test the end-to-end RelyingPartyDemo + IdentityProvider authentication flow.
 * Take screenshots of each screen.
 */
async function testIdentityProviderRelyingPartyDemo(options: {
  page: playwright.Page,
  screenshotsDirectory: string,
}) {
  const { page, screenshotsDirectory } = options;
  const initialUrl = page.url()
  // Go to /relying-party-demo
  await page.goto(new URL('/relying-party-demo', initialUrl).toString());
  await page.screenshot({ path: path.join(screenshotsDirectory, `0-rp-start.png`) });
  // click 'authenticate' button
  await page.click('text="Authenticate"')
  // wait to see 'Identity Provider' (waiting for @dfinity/bootstrap to fetch from asset canister)
  await page.waitForSelector('text="Identity Provider"')

  // Mnemonic import. Skip it
  await page.screenshot({ path: path.join(screenshotsDirectory, `1-idp.png`) });
  await page.click('text="Skip"')
  await page.screenshot({ path: path.join(screenshotsDirectory, `2-idp.png`) });
  await page.click('text="Generate Master Key"')
  // @TODO(bengo) Make work with less specific selector
  await page.screenshot({ path: path.join(screenshotsDirectory, `3-idp.png`) });
  await page.click('//button[2]/span[1][normalize-space(.)=\'Authorize Device\']');
  // @TODO(bengo) Make work with less specific selector
  await page.screenshot({ path: path.join(screenshotsDirectory, `4-idp.png`) });
  await page.click('//button[2]/span[1][normalize-space(.)=\'Authorize Session\']');
  /** user will be redirected back to /relying-party-demo redirect_uri */
  await page.waitForSelector('text="AuthenticationResponse"')
  await page.screenshot({ path: path.join(screenshotsDirectory, `5-rp-redirect-uri.png`) });
}

// main module
(() => {
  const identityProviderUrl = process.argv[2];
  console.debug({ identityProviderUrl })
  if (typeof identityProviderUrl !== 'string') {
    throw new Error('Provide identityProviderUrl as first argument.')
  }
  const screenshotsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'screenshots-'));
  (async () => {
    const browser = await playwright.webkit.launch();
    const page = await browser.newPage({
      viewport: {
        width: 1920,
        height: 1080,
      }
    });
    await page.goto(identityProviderUrl);
    await testIdentityProviderRelyingPartyDemo({
      page,
      screenshotsDirectory,
    })
    await browser.close();
    console.log({
      identityProviderUrl,
      screenshotsDirectory,
    })
  })();
})();
