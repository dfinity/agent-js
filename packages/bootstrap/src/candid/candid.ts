import { Actor, IDL, InputBox, Principal, UI } from '@dfinity/agent';
import './candid.css';

class CanisterActor extends Actor {
  [x: string]: (...args: unknown[]) => Promise<unknown>;
}

export function render(id: Principal, canister: CanisterActor) {
  document.getElementById('canisterId')!.innerText = `${id}`;
  const sortedMethods = Actor.interfaceOf(canister)._fields.sort(([a], [b]) => (a > b ? 1 : -1));
  for (const [name, func] of sortedMethods) {
    renderMethod(canister, name, func);
  }
}

function renderMethod(canister: CanisterActor, name: string, idlFunc: IDL.FuncClass) {
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
  document.getElementById('methods-list')!.appendChild(methodListItem);

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

  const buttonQuery = document.createElement('button');
  buttonQuery.className = 'btn';
  if (idlFunc.annotations.includes('query')) {
    buttonQuery.innerText = 'Query';
  } else {
    buttonQuery.innerText = 'Call';
  }
  buttonContainer.appendChild(buttonQuery);

  const buttonRandom = document.createElement('button');
  buttonRandom.className = 'btn random';
  buttonRandom.innerText = 'Random';
  buttonContainer.appendChild(buttonRandom);
  item.appendChild(buttonContainer);

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

  const containers: HTMLDivElement[] = [];
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
      log(decodeSpace(`› ${name}${showArgs}`));
      log(decodeSpace(text));

      const uiContainer = document.createElement('div');
      uiContainer.className = 'ui-result';
      containers.push(uiContainer);
      uiContainer.style.display = setContainerVisibility('ui');
      left.appendChild(uiContainer);
      idlFunc.retTypes.forEach((arg, ind) => {
        const box = UI.renderInput(arg);
        box.render(uiContainer);
        UI.renderValue(arg, box, result[ind]);
      });

      const jsonContainer = document.createElement('div');
      jsonContainer.className = 'json-result';
      containers.push(jsonContainer);
      jsonContainer.style.display = setContainerVisibility('json');
      left.appendChild(jsonContainer);
      jsonContainer.innerText = JSON.stringify(callResult);
    })().catch(err => {
      resultDiv.classList.add('error');
      left.innerText = err.message;
      throw err;
    });
  }

  function selectResultDisplay(event: MouseEvent) {
    const target = event.target as HTMLButtonElement;
    const displayType = target!.classList.value.replace(/btn (.*)-btn.*/g, '$1');
    buttonsArray.forEach(button => button.classList.remove('active'));
    containers.forEach(container => (container.style.display = 'none'));
    target!.classList.add('active');
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

  buttonQuery.addEventListener('click', () => {
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

function log(content: Element | string) {
  const outputEl = document.getElementById('output-list')!;
  const line = document.createElement('div');
  line.className = 'output-line';
  if (content instanceof Element) {
    line.appendChild(content);
  } else {
    line.innerHTML = content;
  }

  outputEl.appendChild(line);
  line.scrollIntoView();
}
