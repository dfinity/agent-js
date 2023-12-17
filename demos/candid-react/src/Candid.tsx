import { IDL } from '@dfinity/candid';
import { ExtractFieldResult, Type } from '@dfinity/candid/lib/cjs/idl';
import { useState } from 'react';

interface CandidProps {
  methods: [string, IDL.FuncClass][];
}

const Candid: React.FC<CandidProps> = ({ methods }) => {
  return (
    <div>
      {methods.map(([method, types]: any) => {
        const type: ExtractFieldResult[] = types.argTypes.map((type: Type) => {
          return type.extractFields();
        });

        console.log({ method, type });

        return (
          <div key={method}>
            <h3>{method}</h3>
            {CompileInput(type)}
          </div>
        );
      })}
    </div>
  );
};

export default Candid;

function CompileInput(input: any) {
  if (!input) {
    return null;
  }

  if (input instanceof Array) {
    return input.map(input => {
      return RenderInput(input);
    });
  }

  return RenderInput(input);
}

const RenderInput = (input: ExtractFieldResult) => {
  if (!input) {
    return null;
  }

  const {
    children,
    label,
    options,
    toggleHandler,
    clickHandler,
    recursive,
    component: Comp,
    type,
  } = input;

  if (type === 'checkbox' && toggleHandler) {
    console.log(children);
    return <CheckBox key={label} name={label} toggleHandler={toggleHandler} />;
  }

  if (Comp === 'button' && clickHandler) {
    return <Button key={label} label={label} clickHandler={clickHandler} />;
  }

  if (Comp === 'input') {
    return <input key={label} type={type} placeholder={label} />;
  } else if (Comp === 'select') {
    return (
      <Select key={label} label={label} options={options}>
        {children}
      </Select>
    );
  } else if (Comp === 'form') {
    return (
      <form
        key={label}
        style={{
          border: '1px solid black',
        }}
      >
        <label>{label}</label>
        {CompileInput(children)}
      </form>
    );
  }

  return <Comp key={label}>{CompileInput(children)}</Comp>;
};

const CheckBox = ({ name, toggleHandler }: any) => {
  const [element, setElement] = useState<ExtractFieldResult>();

  const changeHandler = (e: any) => {
    const elements = toggleHandler && toggleHandler(e.target.checked);
    console.log({ elements });
    setElement(elements);
  };

  return (
    <div>
      <label>{name}</label>
      <input type="checkbox" name={name} onChange={changeHandler} />
      {CompileInput(element)}
    </div>
  );
};

const Button = ({ label, clickHandler }: any) => {
  const [element, setElement] = useState<ExtractFieldResult>();

  const handler = (e: any) => {
    const elements = clickHandler && clickHandler(e.target.checked);
    console.log({ elements });
    setElement(elements);
  };

  return (
    <div>
      <label>{label}</label>
      <button onClick={handler}>{label}</button>
      {CompileInput(element)}
    </div>
  );
};

const Select = ({ label, options, children }: any) => {
  const [selected, setSelected] = useState<number>(0);

  const changeHandler = (e: any) => {
    setSelected(e.target.value);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        border: '1px solid black',
      }}
    >
      <label>{label}</label>
      <select onChange={changeHandler}>
        {options?.map((option: string, index: number) => (
          <option key={option} value={index}>
            {option}
          </option>
        ))}
      </select>
      {CompileInput(children[selected])}
    </div>
  );
};
