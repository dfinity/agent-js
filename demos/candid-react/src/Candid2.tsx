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
            <h1>{functionName}</h1>
            <RenderForm fields={fields} />
          </div>
        );
      })}
    </div>
  );
};

export default Candid2;

type FormValues = {
  inputs: {
    [name: string]: Array<{
      value: string;
    }>;
  };
};

const RenderForm = ({ fields }: { fields: ExtractFields[] }) => {
  const { register, formState, control, handleSubmit } = useForm<FormValues>({
    shouldUseNativeValidation: true,
    reValidateMode: 'onSubmit',
    values: {
      inputs: fields.reduce((acc, _, index) => {
        acc[index] = [];
        return acc;
      }, {} as FormValues['inputs']),
    },
  });

  return (
    <form onSubmit={handleSubmit(data => console.log(data))}>
      {fields.map((field, index) => {
        return (
          <div key={index}>
            <h3>{field.parentName}</h3>
            <RenderField
              control={control}
              field={field}
              name={`inputs.${index}`}
              register={register}
            />
          </div>
        );
      })}
      <input type="submit" />
    </form>
  );
};

const RenderField = ({
  control,
  field,
  name,
  register,
}: {
  control: any;
  field: ExtractFields;
  name: string;
  register: any;
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  const handleAppend = () => {
    append({}, { shouldFocus: true });
  };

  return (
    <div>
      <label>{field.label}</label>
      <button type="button" onClick={handleAppend}>
        +
      </button>
      {fields.map((item, index) => (
        <div key={item.id}>
          <Input
            {...register(`inputs.${name}[${index}].value`, field)}
            type={field.type}
            required={field.required}
            onRemove={() => remove(index)}
          />
        </div>
      ))}
    </div>
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
