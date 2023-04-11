import { Actor, ActorSubclass } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { InputBox } from './candid-core';
import { renderInput, renderValue } from './candid-ui';
import { Principal } from '@dfinity/principal';

const names: Record<number, string> = {};

declare global {
  interface Window {
    d3: any;
    flamegraph: any;
  }
}

/**
 * Render a method of a canister.
 * @param canister  ActorSubclass
 * @param name  string
 * @param idlFunc  IDL.FuncClass
 * @param root  ShadowRoot
 * @param profiler  any
 */
export function renderMethod(
  canister: ActorSubclass,
  name: string,
  idlFunc: IDL.FuncClass,
  root: ShadowRoot,
  profiler: any,
) {
  const item = document.createElement('li');
  item.id = name;

  const sig = document.createElement('div');
  sig.className = 'signature';
  sig.innerHTML = `<b>${name}</b>: ${idlFunc.display()}`;
  item.appendChild(sig);

  const methodListItem = document.createElement('li');
  const methodLink = document.createElement('a');
  methodLink.innerText = name;
  methodLink.href = `#${name}`;
  methodListItem.appendChild(methodLink);
  root.getElementById('methods-list')!.appendChild(methodListItem);

  const methodForm = document.createElement('form');
  methodForm.id = `form-${name}`;

  methodListItem.appendChild(methodForm);

  const inputContainer = document.createElement('div');
  inputContainer.className = 'input-container';
  item.appendChild(methodForm);
  methodForm.appendChild(inputContainer);

  const inputs: InputBox[] = [];
  idlFunc.argTypes.forEach((arg, i) => {
    const inputbox = renderInput(arg);
    inputs.push(inputbox);
    inputbox.render(inputContainer);
  });

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'button-container';

  const buttonQuery = document.createElement('button');
  buttonQuery.type = 'submit';
  buttonQuery.className = 'btn';
  if (idlFunc.annotations.includes('query')) {
    buttonQuery.innerText = 'Query';
  } else {
    buttonQuery.innerText = 'Call';
  }
  buttonContainer.appendChild(buttonQuery);

  const buttonRandom = document.createElement('button');
  buttonRandom.type = 'button';
  buttonRandom.className = 'btn random';
  buttonRandom.innerText = 'Random';
  buttonContainer.appendChild(buttonRandom);
  methodForm.appendChild(buttonContainer);

  const resultDiv = document.createElement('div');
  resultDiv.className = 'result';
  const left = document.createElement('div');
  left.className = 'left';
  const right = document.createElement('div');
  right.className = 'right';

  const resultButtons = document.createElement('span');
  resultButtons.className = 'result-buttons';
  const buttonText = document.createElement('button');
  buttonText.className = 'btn text-btn active';
  buttonText.innerText = 'Text';
  const buttonUI = document.createElement('button');
  buttonUI.className = 'btn ui-btn';
  buttonUI.innerText = 'UI';
  const buttonJSON = document.createElement('button');
  buttonJSON.className = 'btn json-btn';
  buttonJSON.innerText = 'JSON';
  const buttonsArray = [buttonText, buttonUI, buttonJSON];

  resultDiv.appendChild(resultButtons);
  resultDiv.appendChild(left);
  resultDiv.appendChild(right);
  item.appendChild(resultDiv);

  const list = root.getElementById('methods')!;
  list.append(item);

  async function call(args: any[]) {
    left.className = 'left';
    left.innerText = 'Waiting...';
    right.innerText = '';
    resultDiv.style.display = 'flex';

    const tStart = Date.now();
    const result = await canister[name](...args);
    const duration = (Date.now() - tStart) / 1000;
    right.innerText = `(${duration}s)`;
    return result;
  }

  const containers: HTMLDivElement[] = [];
  function callAndRender(args: any[]) {
    (async () => {
      resultDiv.classList.remove('error');
      const callResult = (await call(args)) as any;
      let result: any;
      if (idlFunc.retTypes.length === 0) {
        result = [];
      } else if (idlFunc.retTypes.length === 1) {
        result = [callResult];
      } else {
        result = callResult;
      }
      left.innerHTML = '';

      let activeDisplayType = '';
      buttonsArray.forEach(button => {
        if (button.classList.contains('active')) {
          activeDisplayType = button.classList.value.replace(/btn (.*)-btn.*/g, '$1');
        }
      });
      function setContainerVisibility(displayType: string) {
        if (displayType === activeDisplayType) {
          return 'flex';
        }
        return 'none';
      }
      function decodeSpace(str: string) {
        return str.replace(/&nbsp;/g, ' ');
      }

      const textContainer = document.createElement('div');
      textContainer.className = 'text-result';
      containers.push(textContainer);
      textContainer.style.display = setContainerVisibility('text');
      left.appendChild(textContainer);
      const text = encodeStr(IDL.FuncClass.argsToString(idlFunc.retTypes, result));
      textContainer.innerHTML = decodeSpace(text);
      const showArgs = encodeStr(IDL.FuncClass.argsToString(idlFunc.argTypes, args));
      log(decodeSpace(`› ${name}${showArgs}`), root);
      if (profiler && !idlFunc.annotations.includes('query')) {
        await renderFlameGraph(profiler, root);
      }
      if (!idlFunc.annotations.includes('query')) {
        postToPlayground(Actor.canisterIdOf(canister));
      }
      log(decodeSpace(text), root);

      const uiContainer = document.createElement('div');
      uiContainer.className = 'ui-result';
      containers.push(uiContainer);
      uiContainer.style.display = setContainerVisibility('ui');
      left.appendChild(uiContainer);
      idlFunc.retTypes.forEach((arg, ind) => {
        const box = renderInput(arg);
        box.render(uiContainer);
        renderValue(arg, box, result[ind]);
      });

      const jsonContainer = document.createElement('div');
      jsonContainer.className = 'json-result';
      containers.push(jsonContainer);
      jsonContainer.style.display = setContainerVisibility('json');
      left.appendChild(jsonContainer);
      jsonContainer.innerText = JSON.stringify(callResult, (k, v) =>
        typeof v === 'bigint' ? v.toString() : v,
      );
    })().catch(err => {
      resultDiv.classList.add('error');
      left.innerText = err.message;
      if (profiler && !idlFunc.annotations.includes('query')) {
        const showArgs = encodeStr(IDL.FuncClass.argsToString(idlFunc.argTypes, args));
        log(`[Error] ${name}${showArgs}`, root);
        renderFlameGraph(profiler, root);
      }
      if (!idlFunc.annotations.includes('query')) {
        postToPlayground(Actor.canisterIdOf(canister));
      }
      throw err;
    });
  }

  function selectResultDisplay(event: MouseEvent) {
    const target = event.target as HTMLButtonElement;
    const displayType = target.classList.value.replace(/btn (.*)-btn.*/g, '$1');
    buttonsArray.forEach(button => button.classList.remove('active'));
    containers.forEach(container => (container.style.display = 'none'));
    target.classList.add('active');
    (left.querySelector(`.${displayType}-result`) as HTMLDivElement).style.display = 'flex';
  }
  buttonsArray.forEach(button => {
    button.addEventListener('click', selectResultDisplay);
    resultButtons.appendChild(button);
  });

  buttonRandom.addEventListener('click', () => {
    const args = inputs.map(arg => arg.parse({ random: true }));
    const isReject = inputs.some(arg => arg.isRejected());
    if (isReject) {
      return;
    }
    callAndRender(args);
  });
  methodForm.addEventListener('submit', e => {
    e.preventDefault();
    const args = inputs.map(arg => arg.parse());
    const isReject = inputs.some(arg => arg.isRejected());
    if (isReject) {
      return;
    }
    callAndRender(args);
    return false;
  });
}

function encodeStr(str: string) {
  const escapeChars: Record<string, string> = {
    ' ': '&nbsp;',
    '<': '&lt;',
    '>': '&gt;',
    '\n': '<br>',
  };
  const regex = new RegExp('[ <>\n]', 'g');
  return str.replace(regex, m => {
    return escapeChars[m];
  });
}

/**
 * Log content to output div
 * @param content - string or element
 * @param root  - shadow root
 */
export function log(content: Element | string, root: ShadowRoot) {
  const outputEl = root.getElementById('output-list')!;
  const line = document.createElement('div');
  line.className = 'output-line';
  if (content instanceof Element) {
    line.appendChild(content);
  } else {
    line.innerHTML = content;
  }

  outputEl.appendChild(line);

  // scroll into view if line is out of view
  const { top, bottom } = line.getBoundingClientRect();
  const { top: parentTop, bottom: parentBottom } = outputEl.getBoundingClientRect();
  if (top < parentTop || bottom > parentBottom) {
    line.scrollIntoView();
  }
}

function decodeProfiling(input: Array<[number, bigint]>) {
  //console.log(input);
  if (!input) {
    return [];
  }
  const stack: Array<[number, bigint, any[]]> = [[0, BigInt(0), []]];
  let prev_id = undefined;
  let i = 1;
  for (const [id, cycles] of input) {
    if (id >= 0) {
      stack.push([id, cycles, []]);
    } else {
      const pair = stack.pop();
      if (!pair) {
        console.log(i);
        throw new Error('cannot pop empty stack');
      }
      if (pair[0] !== -id) {
        throw new Error(`Exiting func ${-pair[0]}, but expect to exit func ${id}`);
      }
      const name = names[pair[0]] || `func_${pair[0]}`;
      const value = Number(cycles - pair[1]);
      let result = pair[2];
      const node = { name, value };
      if (typeof prev_id === 'number' && prev_id < 0) {
        result = [{ ...node, children: result }];
      } else {
        result.push(node);
      }
      stack[stack.length - 1][2].push(...result);
    }
    prev_id = id;
    i++;
  }
  if (stack.length !== 1) {
    console.log(stack);
    throw new Error('End of input, but stack is not empty');
  }
  if (stack[0][2].length === 1) {
    return stack[0][2][0];
  } else {
    const total_cycles = Number(input[input.length - 1][1] - input[0][1]);
    return { children: stack[0][2], name: 'Total', value: total_cycles };
  }
}
async function renderFlameGraph(profiler: any, root: ShadowRoot) {
  // Load only when needed
  const { select } = await import('d3');
  const { flamegraph } = await import('d3-flame-graph');
  // @ts-ignore
  const tooltip = await import('d3-flame-graph/dist/d3-flamegraph-tooltip.js');
  const profiling = decodeProfiling(await profiler());
  //console.log(profiling);
  if (typeof profiling !== 'undefined') {
    const div = document.createElement('div');
    div.id = 'chart';
    log(div, root);
    const chart = flamegraph().selfValue(false).sort(false).width(400);
    const tip = tooltip
      .defaultFlamegraphTooltip()
      .text((d: any) => `${d.data.name}: ${d.data.value} instrs`);
    chart.tooltip(tip);
    select('#chart').datum(profiling).call(chart);
    div.id = 'old-chart';
  }
}

function postToPlayground(id: Principal) {
  const message = {
    caller: id.toText(),
  };
  (window.parent || window.opener)?.postMessage(`CandidUI${JSON.stringify(message)}`, '*');
}
