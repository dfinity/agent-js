import { makeLog } from '@dfinity/agent';

type Renderer = (el: Element) => void;

/**
 * Renderer that will render the provided element as the child of a reusable parent Node.
 * @param parentNode - Node to use as common parent across all renders
 */
function ParentRenderer(parentNode: Pick<Node, 'lastChild' | 'appendChild'>): Renderer {
  return (el: Element) => {
    while (parentNode.lastChild) {
      parentNode.lastChild.remove();
    }
    parentNode.appendChild(el);
  };
}

/**
 * Renderer for the requirements of `@dfinity/bootstrap`.
 * Determine the parent element:
 * * If the nonstandard 'app' tagged element is present, use it.
 * * Else use 'ic-bootstrap' valid tagged element
 * @param document - document to query for selectors of elements in which to render UI
 */
export function BootstrapRenderer(document: Document): Renderer {
  const selectors = [
    'ic-bootstrap' /** this is a valid HTML element tag */,
    'app' /** this is not a valid HTML element tag, but is used since pre-sodium */,
  ];
  const parentNode: Node = (() => {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) { return el; }
    }
    throw new Error(`tried to render, but couldn't find bootstrap parent node`);
  })();
  const render = ParentRenderer(parentNode);
  return render;
}
