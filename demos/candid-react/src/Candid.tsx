import { IDL } from '@dfinity/candid';
import { ExtractFieldResult, Type } from '@dfinity/candid/lib/cjs/idl';

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

  const { children, name, options, clickHandler, recursive, component: Comp, type } = input;

  if (Comp === 'button' && clickHandler) {
    const handler = (e: any) => {
      console.log(clickHandler());
    };

    return (
      <button key={name} onClick={handler}>
        {name}
      </button>
    );
  }

  if (type === 'recursive' && recursive) {
    console.log('recursive');

    const handler = (e: any) => {
      console.log(recursive());
    };

    return (
      <button key={name} onClick={handler}>
        New
      </button>
    );
  }

  if (Comp === 'input') {
    return <input key={name} type={type} placeholder={name} />;
  } else if (Comp === 'select') {
    return (
      <select key={name}>
        {options?.map((option: string, index) => (
          <option key={option} value={index}>
            {option}
          </option>
        ))}
      </select>
    );
  } else if (Comp === 'form') {
    return (
      <form
        key={name}
        style={{
          border: '1px solid black',
        }}
      >
        <label>{name}</label>
        {CompileInput(children)}
      </form>
    );
  }

  return <Comp key={name}>{CompileInput(children)}</Comp>;
};
