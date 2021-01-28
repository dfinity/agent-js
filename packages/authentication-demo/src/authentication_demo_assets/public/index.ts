import AuthenticationDemo from "./ic-authentication-demo";
import AuthenticationSubjectPublicKeyElement from "./ic-id-public-key";
import AuthenticationButton from "./ic-id-button";
import "@dfinity/bootstrap";

async function main(el: Element) {
  if (globalThis.customElements) {
    const elements: Array<[string, CustomElementConstructor, ElementDefinitionOptions?]> = [
      ["ic-authentication-subject-public-key" as const, AuthenticationSubjectPublicKeyElement, {}],
      ["ic-authentication-demo" as const, AuthenticationDemo, {}],
      [
        "ic-authentication-button" as const,
        AuthenticationButton,
        { extends: "button" },
      ],
    ];
    for (const [tagName, ElementConstructor, opts] of elements) {
      if (customElements.get(tagName)) {
        console.debug("customElement already defined. skipping.", tagName);
      } else {
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
  el.innerHTML = `
    <ic-authentication-demo />
  `;
}

(async () => {
  const el =
    (/* prefer this as its a valid HTML5 element tag ('app' is not) */ document.querySelector("ic-bootstrap")) || document.querySelector("app");
  if (!el) {
    throw new Error("Failed to find app el");
  }
  main(el);
})();
