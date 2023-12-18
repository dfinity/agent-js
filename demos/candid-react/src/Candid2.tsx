import { ExtractFields } from '@dfinity/candid/lib/cjs/idl';
import { Actor } from '@dfinity/agent';
import { createActor } from './small';
import { UseFormRegister, useFieldArray, useForm } from 'react-hook-form';
import React from 'react';

const actor = createActor('xeka7-ryaaa-aaaal-qb57a-cai', {
  agentOptions: {
    host: 'https://ic0.app',
  },
});

const methods: ExtractFields[] = Actor.interfaceOf(actor as Actor).extractFields().fields;

interface CandidProps {}

const Candid2: React.FC<CandidProps> = () => {
  return (
    <div>
      {methods.map(({ label, fields }) => {
        console.log(label, fields);
        return (
          <div key={label}>
            <h3>{label}</h3>
            {fields.map((field, index) =>
              field.parent === 'vector' ? (
                <RenderVector fields={field} key={index} />
              ) : (
                <RenderInput fields={field} key={index} />
              ),
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Candid2;

let renderCount = 0;

const RenderVector = ({ fields: values }: { fields: ExtractFields }) => {
  const { register, formState, control, handleSubmit } = useForm({
    shouldUseNativeValidation: true,
    values,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'values',
  });

  const onSubmit = (data: any) => console.log('data', data);

  renderCount++;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h1>{values.type}</h1>
      <span className="counter">Render Count: {renderCount}</span>
      <ul>
        {fields.map((item, index) => (
          <li key={item.id} style={{ display: 'flex' }}>
            <Input
              register={register}
              index={index}
              fields={values}
              onRemove={() => remove(index)}
              isError={!!formState.errors.root?.[index]?.message}
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => {
          append(values, { shouldFocus: true });
        }}
      >
        Append
      </button>
      <input type="submit" />
    </form>
  );
};

const RenderInput = ({ fields }: { fields: ExtractFields }) => {
  const { register, formState, handleSubmit } = useForm({
    shouldUseNativeValidation: true,
  });

  const onSubmit = async (data: any) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h1>single {fields.component}</h1>
      <ul>
        <li>
          <Input
            register={register}
            index={0}
            fields={fields}
            isError={!!formState.errors[fields.type]?.message}
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
  fields: ExtractFields;
  isError?: boolean;
  error?: string;
  index?: number;
}

const Input: React.FC<MyComponentProps> = ({
  register,
  onRemove,
  index,
  fields,
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
          {...register(`values[${index}].value`, { ...fields })}
          defaultValue={fields.value}
          placeholder={fields.type}
          type={fields.type}
          style={{
            margin: 0,
            border: !!isError ? '1px solid red' : '1px solid black',
          }}
        />
        {fields.required && <p style={{ color: 'red', marginTop: 0, fontSize: 8 }}>Required</p>}
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
