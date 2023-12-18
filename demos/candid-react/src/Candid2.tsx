import { IDL } from '@dfinity/candid';
import { ExtractFieldResult, Type } from '@dfinity/candid/lib/cjs/idl';
import { useState } from 'react';
import { Actor } from '@dfinity/agent';
import { createActor } from './large';

const actor = createActor('xeka7-ryaaa-aaaal-qb57a-cai', {
  agentOptions: {
    host: 'https://ic0.app',
  },
});

const methods: [string, IDL.FuncClass][] = Actor.interfaceOf(actor as Actor)._fields;

interface CandidProps {}

const Candid2: React.FC<CandidProps> = () => {
  return (
    <div>
      {methods.map(([method, types]) => {
        console.log({ method }, types.argTypes);

        return (
          <div key={method}>
            <h3>{method}</h3>
            {types.argTypes.map((type: Type) => {
              const fields = type.extractFields();
              console.log({ fields });
              return (
                <div>
                  <CompileInput input={fields} />
                </div>
              );
            })}
            <button onClick={() => {}}>Call {method}</button>
          </div>
        );
      })}
    </div>
  );
};

export default Candid2;

function CompileInput({ input }: any) {
  if (!input) {
    return null;
  }

  if (input instanceof Array) {
    return (
      <div style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
        {input.map((input, index) => (
          <RenderInput input={input} key={index} />
        ))}
      </div>
    );
  }

  return <RenderInput input={input} />;
}

const RenderInput = ({ input }: { input: ExtractFieldResult }) => {
  if (!input) {
    return null;
  }

  const {
    children,
    label,
    options,
    toggleHandler,
    clickHandler,
    removeHandler,
    component: Comp,
    type,
  } = input;

  if (type === 'checkbox') {
    return <CheckBox key={label} label={label} toggleHandler={toggleHandler} />;
  }

  if (Comp === 'button' && clickHandler) {
    return (
      <Button key={label} label={label} removeHandler={removeHandler} clickHandler={clickHandler} />
    );
  }

  if (Comp === 'input') {
    return <input key={label} type={type} placeholder={label} />;
  } else if (Comp === 'select') {
    return (
      <Select key={label} label={label} options={options}>
        {children}
      </Select>
    );
  }

  return (
    <Comp key={label}>
      <CompileInput input={children} />
    </Comp>
  );
};

const CheckBox = ({ label, toggleHandler }: any) => {
  const [element, setElement] = useState<ExtractFieldResult>();

  const changeHandler = (e: any) => {
    const elements = toggleHandler && toggleHandler(e.target.checked);
    console.log({ elements });
    setElement(elements);
  };

  return (
    <div>
      <label>{label}</label>
      <input type="checkbox" name={label} onChange={changeHandler} />
      <CompileInput input={element} />
    </div>
  );
};

const Select = ({ label, options, children }: any) => {
  const [selected, setSelected] = useState<number>(0);

  const changeHandler = (e: any) => {
    setSelected(e.target.value);
  };

  return (
    <div>
      <label>{label}</label>
      <select onChange={changeHandler}>
        {options?.map((option: string, index: number) => (
          <option key={option} value={index}>
            {option}
          </option>
        ))}
      </select>
      <CompileInput input={children[selected]} />
    </div>
  );
};

const Button = ({ label, clickHandler, removeHandler }: any) => {
  const [elements, setElements] = useState<ExtractFieldResult[]>([]);

  const add = () => {
    const newElements = clickHandler && clickHandler('feature');
    console.log({ newElements });
    setElements([...newElements]);
  };

  const remove = () => {
    const newElements = removeHandler && removeHandler('feature');
    console.log({ newElements });
    setElements([...newElements]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div>
        <label>{label}</label>
        <button onClick={add}>+</button>
      </div>
      <div style={{ display: 'flex', width: '100%' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
          }}
        >
          {elements.map((element, index) => (
            <div
              style={{
                display: 'flex',
                width: '100%',
                justifyContent: 'space-between',
                border: '1px solid black',
                flexDirection: 'row',
              }}
              key={index}
            >
              <CompileInput input={element} />
              <button onClick={remove}>x</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
