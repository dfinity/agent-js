import { Actor } from '@dfinity/agent';
import { createActor } from './small';
import { useFieldArray, useForm } from 'react-hook-form';
import React from 'react';
import { ExtractFields } from '@dfinity/candid';

const actor = createActor('xeka7-ryaaa-aaaal-qb57a-cai', {
  agentOptions: {
    host: 'https://ic0.app',
  },
});

const fields = Actor.interfaceOf(actor as Actor).extractFields();

interface CandidProps {}

const Candid2: React.FC<CandidProps> = () => {
  return (
    <div>
      {fields.map(({ functionName, fields }) => {
        console.log({ functionName, fields });
        return (
          <div key={functionName}>
            <h3>{functionName}</h3>
            {fields.map((field, index) =>
              field.parent === 'vector' ? (
                <RenderVector field={field} key={index} />
              ) : (
                <RenderSimpleForm field={field} key={index} />
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

const RenderVector = ({ field }: { field: ExtractFields }) => {
  const { register, formState, control, handleSubmit } = useForm({
    shouldUseNativeValidation: true,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'root',
  });

  const onSubmit = (submitData: any) => console.log('submitData', submitData);

  renderCount++;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h1>{field.type}</h1>
      <span className="counter">Render Count: {renderCount}</span>
      <ul>
        {fields.map((item, index) => (
          <li key={item.id} style={{ display: 'flex' }}>
            <Input
              {...register(`root[${index}].value`, field)} // Adjust according to the structure of your data
              onRemove={() => remove(index)}
              isError={!!formState.errors.root?.[index]?.message}
              error={formState.errors.root?.[index]?.message}
              type={field.type}
              required={field.required}
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => {
          // Append with an object representing the default values for the new field
          append({ value: '' }); // Adjust 'value' to match the structure of your field
        }}
      >
        Append
      </button>
      <input type="submit" />
    </form>
  );
};

const RenderSimpleForm = ({ field }: { field: ExtractFields }) => {
  const { register, formState, handleSubmit } = useForm({
    shouldUseNativeValidation: true,
  });

  const onSubmit = async (submitData: any) => {
    console.log({ submitData });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h1>{field.name}</h1>
      <ul>
        <li>
          <Input
            {...register('value', field)}
            isError={!!formState.errors.value?.message}
            error={formState.errors.value?.message}
            type={field.type}
            required={field.required}
          />
        </li>
      </ul>
      <input type="submit" />
    </form>
  );
};

interface MyComponentProps extends ExtractFields {
  onRemove?: () => void;
  isError?: boolean;
  error?: string;
}

const Input: React.ForwardRefExoticComponent<
  React.PropsWithoutRef<MyComponentProps> & React.RefAttributes<HTMLInputElement>
> = React.forwardRef(({ onRemove, isError, name, type, required, error, ...rest }, ref) => {
  return (
    <div style={{ display: 'flex', alignItems: 'start' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'start',
        }}
      >
        {error && <p style={{ color: 'red', margin: 0, fontSize: 8 }}>{error}</p>}
        <input
          name={name}
          type={type}
          placeholder={type}
          ref={ref}
          style={{
            margin: 0,
            border: !!isError ? '1px solid red' : '1px solid black',
          }}
          {...rest}
        />
        {required && <p style={{ color: 'red', marginTop: 0, fontSize: 8 }}>Required</p>}
      </div>
      {onRemove && (
        <button type="button" onClick={onRemove}>
          x
        </button>
      )}
    </div>
  );
});
