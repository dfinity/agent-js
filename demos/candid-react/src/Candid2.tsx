import { Actor } from '@dfinity/agent';
import { createActor } from './small';
import { Control, FieldErrors, useFieldArray, useForm } from 'react-hook-form';
import React from 'react';
import { ExtractFields, ServiceClassFields } from '@dfinity/candid';

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
      {fields.map(({ functionName, fieldNames, fields, inputs }) => {
        console.log({ functionName, fieldNames, fields, inputs });
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

type FromInputs = ServiceClassFields['inputs'];

type FormValues =
  | FromInputs
  | {
      [name: string]: FromInputs;
    };

const RenderForm = ({ fields, inputs }: { fields: ExtractFields[]; inputs: FromInputs }) => {
  const {
    formState: { errors },
    control,
    handleSubmit,
  } = useForm<FormValues>({
    shouldUseNativeValidation: true,
    mode: 'onChange',
    values: inputs,
  });

  return (
    <form onSubmit={handleSubmit(data => console.log(data))}>
      {fields.map((field, index) => (
        <div key={index}>
          <h2>{field.parent}</h2>
          <h3>{field.parentName}</h3>
          <RenderFormField control={control} field={field} error={errors} />
        </div>
      ))}
      <input type="submit" />
    </form>
  );
};

const RenderFormField = ({
  field,
  error,
  fromVectors,
  ...rest
}: {
  fromVectors?: boolean;
  field: ExtractFields;
  control: Control<FormValues, any>;
  error?: FieldErrors<FormValues>;
}) => {
  if ((field.optional || field.parent === 'vector') && !fromVectors) {
    return (
      <RenderVectors
        field={field}
        error={error?.[field.fieldName]}
        name={field.fieldName}
        {...rest}
      />
    );
  }

  if (field.type === 'record' || field.parent === 'variant') {
    return (
      <fieldset>
        {field.fields?.map(field => (
          <RenderFormField key={field.fieldName} field={field} error={error} {...rest} />
        ))}
      </fieldset>
    );
  }

  return (
    <Input
      {...rest.control.register(field.fieldName, field)}
      type={field.type}
      error={error?.[field.fieldName]?.message?.toString()}
      required={field.required}
    />
  );
};

const RenderVectors = ({
  control,
  field,
  error,
  name,
}: {
  control: Control<FormValues, any>;
  field: ExtractFields;
  error?: any;
  name: string;
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: field.fieldName as never,
  });

  const handleAppend = () => {
    append('', { shouldFocus: true });
  };

  const activeAdd = (field.optional && fields.length === 0) || field.parent === 'vector';
  const activeRemove = (field.optional && fields.length > 0) || field.parent === 'vector';

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
            <RenderFormField
              key={index}
              field={field}
              control={control}
              error={error}
              fromVectors
            />
            {activeRemove && (
              <button type="button" onClick={() => remove(index)}>
                -
              </button>
            )}
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
