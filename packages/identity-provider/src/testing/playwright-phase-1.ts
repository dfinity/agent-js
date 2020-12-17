import * as playwright from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Test the end-to-end RelyingPartyDemo + IdentityProvider authentication flow.
 * Take screenshots of each screen.
 */
async function testIdentityProviderRelyingPartyDemo(options: {
  page: playwright.Page;
  screenshotsDirectory: string;
}) {
  const { page, screenshotsDirectory } = options;
  const initialUrl = page.url();
  const altAuthorizationUrl = new URL('/design-phase-1', initialUrl);
  const relyingPartyDemoUrl = new URL('/relying-party-demo', initialUrl);
  relyingPartyDemoUrl.searchParams.set('idp', altAuthorizationUrl.toString());
  // Go to /relying-party-demo
  await page.goto(relyingPartyDemoUrl.toString());
  await page.screenshot({ path: path.join(screenshotsDirectory, `0-rp-start.png`) });
  // click 'authenticate' button
  await page.click('data-test-id=authenticate');
  // wait for next screen
  await page.waitForSelector('text="Getting Started"');
  // This is now the 'WelcomeScreen'
  await page.screenshot({ path: path.join(screenshotsDirectory, `1-welcome.png`) });
  await page.click('data-test-id=next');

  // Should now get to IdentityConfirmationScreen
  await page.waitForSelector('data-test-id=identity-confirmation-screen');
  await page.screenshot({ path: path.join(screenshotsDirectory, `2-identity-confirmation.png`) });
  await page.click('data-test-id=next');

  await page.waitForSelector('data-test-id=session-consent-screen');
  await page.screenshot({ path: path.join(screenshotsDirectory, `3-session-consent.png`) });
  await page.click('data-test-id=allow-authorize-session');

  await page.waitForSelector('data-test-id=authentication-response-confirmation-screen');
  await page.screenshot({
    path: path.join(screenshotsDirectory, `4-authentication-response-confirmation.png`),
  });
}

// main module
(() => {
  const identityProviderUrl = process.argv[2];
  if (typeof identityProviderUrl !== 'string') {
    throw new Error('Provide identityProviderUrl as first argument.');
  }
  const screenshotsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'screenshots-'));
  (async () => {
    const browser = await playwright.webkit.launch();
    const page = await browser.newPage({
      viewport: {
        width: 1920,
        height: 1080,
      },
    });
    await page.goto(identityProviderUrl);
    await testIdentityProviderRelyingPartyDemo({
      page,
      screenshotsDirectory,
    });
    await browser.close();
    console.log(
      JSON.stringify({
        identityProviderUrl,
        screenshotsDirectory,
      }),
    );
  })();
})();
