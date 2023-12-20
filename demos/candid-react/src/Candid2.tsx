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

function extractInputs(fields: ExtractFields[]) {
  const inputs = fields.reduce((acc, field, index) => {
    const optional = field.optional || field.parent === 'vector';
    const name = `${field.label}-${index}`;

    if (field.type === 'record' || field.parent === 'variant') {
      field.fields?.reduce((acc, field, index) => {
        const optional = field.optional || field.parent === 'vector';
        const name = `${field.parentName}-${field.type}-${index}`;

        acc[`${name}-${index}`] = optional ? [] : [{ value: '' }];

        return acc;
      }, {} as any);
    }

    acc[name] = optional ? [] : [{ value: '' }];

    return acc;
  }, {} as any);

  return inputs;
}

interface CandidProps {}

const Candid2: React.FC<CandidProps> = () => {
  return (
    <div>
      {fields.map(({ functionName, fields, inputs }) => {
        console.log(fields);
        return (
          <div key={functionName}>
            <h1>{functionName}</h1>
            <RenderForm fields={fields} inputs={inputs} />
          </div>
        );
      })}
    </div>
  );
};

export default Candid2;

type FromInputs = {
  [name: string]: Array<{
    value: string;
  }>;
};

type FormValues = {
  inputs:
    | FromInputs
    | {
        [name: string]: FromInputs;
      };
};

const RenderForm = ({ fields, inputs }: { fields: ExtractFields[]; inputs: FromInputs }) => {
  const {
    formState: { errors },
    control,
    handleSubmit,
  } = useForm<FormValues>({
    shouldUseNativeValidation: true,
    mode: 'onChange',
    values: { inputs },
  });

  return (
    <form onSubmit={handleSubmit(data => console.log(data))}>
      {fields.map((field, index) => (
        <div key={index}>
          <h2>{field.parent}</h2>
          <h3>{field.parentName}</h3>
          <RenderFormField
            control={control}
            field={field}
            name={field.fieldNames}
            error={errors.inputs?.[`${field.label}-${index}`]}
          />
        </div>
      ))}
      <input type="submit" />
    </form>
  );
};

const RenderFormField = ({
  field,
  name,
  ...rest
}: {
  field: ExtractFields;
  control: any;
  name: string[];
  error?: any;
}) => {
  console.log(name);
  if (field.type === 'record' || field.parent === 'variant') {
    return (
      <fieldset>
        {field.fields?.map((field, index) => (
          <RenderField key={index} field={field} name={name[index]} {...rest} />
        ))}
      </fieldset>
    );
  }

  return <RenderField field={field} name={name[0]} {...rest} />;
};

const RenderField = ({
  control,
  field,
  name,
  error,
}: {
  control: any;
  field: ExtractFields;
  name: string;
  error?: any;
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  const handleAppend = () => {
    append('', { shouldFocus: true });
  };

  const activeAdd = field.parent === 'vector' || (field.optional && fields.length === 0);
  const activeRemove = field.parent === 'vector' || (field.optional && fields.length > 0);

  return (
    <div>
      <label>{name}</label>
      {activeAdd && (
        <button type="button" onClick={handleAppend}>
          +
        </button>
      )}
      {fields.map((item, index) => {
        return (
          <div key={item.id}>
            <Input
              {...control.register(`${name}.value`, field)}
              type={field.type}
              isError={!!error?.[index]}
              error={error?.[index]?.value?.message?.toString()}
              required={field.required}
              onRemove={activeRemove ? () => remove(index) : undefined}
            />
          </div>
        );
      })}
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
