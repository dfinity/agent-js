import AuthenticationDemo from "./ic-authentication-demo";
import AuthenticationSubjectPublicKeyElement from "./ic-id-public-key";
import AuthenticationButton from "./ic-id-button";

if (!(globalThis as any)?.ic?.features?.authentication) {
  // There is either no version of @dfinity/bootstrap on the page, OR
  // there is an older version that doesn't know about @dfinity/authentication.
  // Either way, import the version from this package, which should trigger a re-load of the whole canister js.
  console.debug(
    "no ic.features.authentication. Importing custom @dfinity/bootstrap"
  );
  import("@dfinity/bootstrap").then(() => {
    console.debug("imported custom @dfinity/bootstrap");
  });
}

/**
 * Main entrypoint for this authentication-demo frontend.
 * * define the other custom html elements with window.customElements.define
 * * add an AuthenticationDemo to the page (which will trigger its constructor, connectedCallback, etc)
 * @param parent - element in which to render the AuthenticationDemo
 */
async function main(parent: Element) {
  if (globalThis.customElements) {
    const elements: Array<[
      string,
      CustomElementConstructor,
      ElementDefinitionOptions?
    ]> = [
      [
        "ic-authentication-subject-public-key" as const,
        AuthenticationSubjectPublicKeyElement,
        {},
      ],
      ["ic-authentication-demo" as const, AuthenticationDemo, {}],
      ["ic-authentication-button" as const, AuthenticationButton, {}],
    ];
    for (const [tagName, ElementConstructor, opts] of elements) {
      if (customElements.get(tagName)) {
        console.debug("customElement already defined. skipping.", tagName);
      } else {
        console.debug(
          "defining customElement",
          tagName,
          ElementConstructor,
          opts
        );
        customElements.define(tagName, ElementConstructor, opts);
      }
    }
    await Promise.all(
      elements.map(async ([tagName]) => {
        await customElements.whenDefined(tagName);
      })
    );
  } else {
    console.warn(
      "globalThis.customElements not supported. ic-authentiction-demo will not load"
    );
    return;
  }
  parent.innerHTML = `
    <ic-authentication-demo />
  `;
}

(async () => {
  main(
    (() => {
      // IIFE to find a good element to render in
      for (const selector of [
        /* prefer this as its a valid HTML5 element tag ('app' is not) */
        "ic-bootstrap",
        "app",
      ]) {
        const el = document.querySelector(selector);
        if (el) return el;
      }
      throw new Error(
        "Failed to find app element. Can't render @dfinity/authentication-demo"
      );
    })()
  );
})();
