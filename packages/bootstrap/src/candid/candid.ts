import { Actor, IDL, InputBox, Principal, UI } from '@dfinity/agent';
import './candid.css';

class CanisterActor extends Actor {
  [x: string]: (...args: unknown[]) => Promise<unknown>;
}

export function render(id: Principal, canister: CanisterActor) {
  document.getElementById('canisterId')!.innerText = `${id}`;
  for (const [name, func] of Actor.interfaceOf(canister)._fields) {
    renderMethod(canister, name, func);
  }
}

function renderMethod(canister: CanisterActor, name: string, idlFunc: IDL.FuncClass) {
  const item = document.createElement('li');

  const sig = document.createElement('div');
  sig.className = 'signature';
  sig.innerHTML = `${name}: ${idlFunc.display()}`;
  item.appendChild(sig);

  const inputContainer = document.createElement('div');
  inputContainer.className = 'input-container';
  item.appendChild(inputContainer);

  const inputs: InputBox[] = [];
  idlFunc.argTypes.forEach((arg, i) => {
    const inputbox = UI.renderInput(arg);
    inputs.push(inputbox);
    inputbox.render(inputContainer);
  });

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'button-container';

  const button = document.createElement('button');
  button.className = 'btn';
  if (idlFunc.annotations.includes('query')) {
    button.innerText = 'Query';
  } else {
    button.innerText = 'Call';
  }
  buttonContainer.appendChild(button);

  const random = document.createElement('button');
  random.className = 'btn random';
  random.innerText = 'Random';
  buttonContainer.appendChild(random);
  item.appendChild(buttonContainer);

  const resultDiv = document.createElement('div');
  resultDiv.className = 'result';
  const left = document.createElement('div');
  left.className = 'left';
  const right = document.createElement('div');
  right.className = 'right';
  resultDiv.appendChild(left);
  resultDiv.appendChild(right);
  item.appendChild(resultDiv);

  const list = document.getElementById('methods')!;
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

  function callAndRender(args: any[]) {
    (async () => {
      const callResult = await call(args);
      let result: any;
      if (idlFunc.retTypes.length === 0) {
        result = [];
      } else if (idlFunc.retTypes.length === 1) {
        result = [callResult];
      } else {
        result = callResult;
      }
      left.innerHTML = '';

      const containers: HTMLDivElement[] = [];
      const textContainer = document.createElement('div');
      containers.push(textContainer);
      left.appendChild(textContainer);
      const text = encodeStr(IDL.FuncClass.argsToString(idlFunc.retTypes, result));
      textContainer.innerHTML = text;
      const showArgs = encodeStr(IDL.FuncClass.argsToString(idlFunc.argTypes, args));
      log(`› ${name}${showArgs}`);
      log(text);

      const uiContainer = document.createElement('div');
      containers.push(uiContainer);
      uiContainer.style.display = 'none';
      left.appendChild(uiContainer);
      idlFunc.retTypes.forEach((arg, ind) => {
        const box = UI.renderInput(arg);
        box.render(uiContainer);
        UI.renderValue(arg, box, result[ind]);
      });

      const jsonContainer = document.createElement('div');
      containers.push(jsonContainer);
      jsonContainer.style.display = 'none';
      left.appendChild(jsonContainer);
      jsonContainer.innerText = JSON.stringify(callResult);

      let i = 0;
      left.addEventListener('click', () => {
        containers[i].style.display = 'none';
        i = (i + 1) % 3;
        containers[i].style.display = 'flex';
      });
    })().catch(err => {
      left.className += ' error';
      left.innerText = err.message;
      throw err;
    });
  }

  random.addEventListener('click', () => {
    const args = inputs.map(arg => arg.parse({ random: true }));
    const isReject = inputs.some(arg => arg.isRejected());
    if (isReject) {
      return;
    }
    callAndRender(args);
  });

  button.addEventListener('click', () => {
    const args = inputs.map(arg => arg.parse());
    const isReject = inputs.some(arg => arg.isRejected());
    if (isReject) {
      return;
    }
    callAndRender(args);
  });
}

function encodeStr(str: string) {
  const escapeChars: Record<string, string> = {
    '<': '&lt;',
    '>': '&gt;',
    '\n': '<br>',
  };
  const regex = new RegExp('[<>\n]', 'g');
  return str.replace(regex, m => {
    return escapeChars[m];
  });
}

function log(content: Element | string) {
  const consoleEl = document.getElementById('console-output');
  const line = document.createElement('div');
  line.className = 'console-line';
  if (content instanceof Element) {
    line.appendChild(content);
  } else {
    line.innerHTML = content;
  }
  // @ts-ignore
  consoleEl.appendChild(line);
}
