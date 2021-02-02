import { makeLog } from "@dfinity/agent";

type Renderer = (el: Element) => void;

export function ParentRenderer(parentNode: Pick<Node, 'lastChild' | 'appendChild'>): Renderer {
  return (el: Element) => {
    while (parentNode.lastChild) {
      parentNode.lastChild.remove();
    }
    parentNode.appendChild(el);
  };
}

export function BootstrapRenderer(document: Document): Renderer {
  const log = makeLog('BootstrapRenderer');
  const parentNode = [
    'ic-bootstrap' /** this is a valid HTML element tag */,
    'app' /** this is not a valid HTML element tag, but is used since pre-sodium */,
  ].reduce((acc: Element | undefined, s, i, array) => {
    const el = document.querySelector(s);
    if (el) {
      // clear the array to break from reduce early
      array.splice(0, array.length);
      return el;
    }
  }, undefined);

  const render = parentNode
    ? ParentRenderer(parentNode)
    : (el: Element) => {
        log('warn', 'tried to render, but couldnt bootstrap parentNode', el);
      };
  return render;
}
