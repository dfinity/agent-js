import { Actor } from '@dfinity/agent';
import { createActor } from './small';
import { UseFormRegister, useForm } from 'react-hook-form';
import React from 'react';
import { ExtractFields } from '@dfinity/candid';

const actor = createActor('xeka7-ryaaa-aaaal-qb57a-cai', {
  agentOptions: {
    host: 'https://ic0.app',
  },
});

const methods: ExtractFields[] = Actor.interfaceOf(actor as Actor).extractFields();

interface CandidProps {}

const Candid2: React.FC<CandidProps> = () => {
  console.log(methods);
  return (
    <div>
      {methods.map((field, index) => {
        console.log(field);
        return (
          <div key={field.label}>
            <h3>{field.label}</h3>
            {field.parent === 'vector' ? null : ( // <RenderVector field={field} key={index} />
              <RenderInput field={field} key={index} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Candid2;

// let renderCount = 0;

// const RenderVector = ({ field: values }: { field: ExtractFields }) => {
//   const { register, formState, control, handleSubmit } = useForm({
//     shouldUseNativeValidation: true,
//     values,
//   });

//   const { field, append, remove } = useFieldArray({
//     control,
//     name: 'values',
//   });

//   const onSubmit = (data: any) => console.log('data', data);

//   renderCount++;

//   return (
//     <form onSubmit={handleSubmit(onSubmit)}>
//       <h1>{values.type}</h1>
//       <span className="counter">Render Count: {renderCount}</span>
//       <ul>
//         {field.map((item, index) => (
//           <li key={item.id} style={{ display: 'flex' }}>
//             <Input
//               register={register}
//               index={index}
//               field={values}
//               onRemove={() => remove(index)}
//               isError={!!formState.errors.root?.[index]?.message}
//             />
//           </li>
//         ))}
//       </ul>
//       <button
//         type="button"
//         onClick={() => {
//           append(values, { shouldFocus: true });
//         }}
//       >
//         Append
//       </button>
//       <input type="submit" />
//     </form>
//   );
// };

const RenderInput = ({ field }: { field: ExtractFields }) => {
  console.log(field);
  const { register, formState, handleSubmit } = useForm({
    shouldUseNativeValidation: true,
  });

  const onSubmit = async (data: any) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h1>single {field.component}</h1>
      <ul>
        <li>
          <Input
            register={register}
            index={0}
            field={field}
            isError={!!formState.errors[field.type]?.message}
          />
        </li>
      </ul>
      <input type="submit" />
    </form>
  );
};

interface MyComponentProps {
  register: UseFormRegister<any>;
  onRemove?: () => void;
  field: ExtractFields;
  isError?: boolean;
  error?: string;
  index?: number;
}

const Input: React.FC<MyComponentProps> = ({
  register,
  onRemove,
  index,
  field,
  isError,
  error,
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'start' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'start',
        }}
      >
        <input
          {...register(`values[${index}].value`, field)}
          placeholder={field.type}
          type={field.type}
          style={{
            margin: 0,
            border: !!isError ? '1px solid red' : '1px solid black',
          }}
        />
        {field.required && <p style={{ color: 'red', marginTop: 0, fontSize: 8 }}>Required</p>}
        {error && <p style={{ color: 'red', marginTop: 0, fontSize: 8 }}>{error}</p>}
      </div>
      {onRemove && (
        <button type="button" onClick={onRemove}>
          x
        </button>
      )}
    </div>
  );
};
