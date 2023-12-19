import { useFieldArray, useForm } from 'react-hook-form';
import React from 'react';
import { ExtractFields } from '@dfinity/candid';
import { Actor } from '@dfinity/agent';
import { createActor } from './small';

const actor = createActor('xeka7-ryaaa-aaaal-qb57a-cai', {
  agentOptions: {
    host: 'https://ic0.app',
  },
});

const fields = Actor.interfaceOf(actor).extractFields();

interface CandidProps {}

const Candid: React.FC<CandidProps> = () => {
  return (
    <div>
      {fields.map(({ functionName, fields }) => {
        console.log({ functionName, fields });
        return (
          <div key={functionName}>
            <h1>{functionName}</h1>
            <RenderVector field={{ parentName: functionName, ...fields[1] }} />
          </div>
        );
      })}
    </div>
  );
};

export default Candid;

let renderCount = 0;

type FormInputs = {
  inputs: Array<{
    value: string;
  }>;
};

const RenderVector = ({ field }: { field: ExtractFields }) => {
  const { register, formState, control, handleSubmit } = useForm<FormInputs>({
    shouldUseNativeValidation: true,
    reValidateMode: 'onSubmit',
    values: {
      inputs: [],
    },
  });

  const { fields, append, remove } = useFieldArray<FormInputs>({
    control,
    name: 'inputs',
  });

  const onSubmit = (submitData: any) => {
    console.log('submitData', submitData);
  };

  const handleAppend = () => {
    append({ value: '' }, { shouldFocus: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h3>{field.parentName}</h3>
      <span className="counter">Render Count: {renderCount}</span>
      <ul>
        {fields.map((item, index) => (
          <li key={item.id} style={{ display: 'flex' }}>
            <Input
              {...register(`inputs.${index}.value`, field)}
              type={field.type}
              required={field.required}
              onRemove={() => remove(index)}
            />
          </li>
        ))}
      </ul>
      <button type="button" onClick={handleAppend}>
        +
      </button>
      <input type="submit" />
    </form>
  );
};

const RenderSimpleForm = ({ field }: { field: ExtractFields }) => {
  const {
    register,
    control,
    formState: { errors },
    handleSubmit,
  } = useForm<FormInputs>({
    shouldUseNativeValidation: true,
    values: {
      inputs: field.optional ? [] : [{ value: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray<FormInputs>({
    control,
    name: 'inputs',
  });

  const onSubmit = async (submitData: any) => {
    console.log({ submitData });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h3>{field.label}</h3>
      {fields.map((item, index) => (
        <div key={item.id}>
          <Input
            {...register(`inputs.${index}.value`, field)}
            type={field.type}
            error={errors.inputs?.[index]?.message}
            isError={!!errors.inputs?.[index]}
            required={field.required}
            onRemove={field.optional ? () => remove(index) : undefined}
          />
        </div>
      ))}
      {field.optional && fields.length === 0 && (
        <button type="button" onClick={() => append({ value: '' })}>
          +
        </button>
      )}
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
