import { Actor } from '@dfinity/agent';
import { createActor } from './small';
import { Control, useFieldArray, useForm } from 'react-hook-form';
import React from 'react';
import { ExtractFields, FieldInputs } from '@dfinity/candid';

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
      {fields.map(({ functionName, fieldNames, inputs, fields, ...rest }) => {
        console.log({ functionName, fieldNames, inputs, fields, ...rest });
        return (
          <Form key={functionName} inputs={inputs} fields={fields} functionName={functionName} />
        );
      })}
    </div>
  );
};

export default Candid2;

const Form = ({
  fields,
  inputs,
  functionName,
}: {
  inputs:
    | FieldInputs
    | {
        [name: string]: FieldInputs;
      };
  fields: ExtractFields[];
  functionName: string;
}) => {
  const {
    formState: { errors },
    control,
    handleSubmit,
  } = useForm({
    shouldUseNativeValidation: true,
    mode: 'onChange',
    values: {},
  });

  return (
    <form onSubmit={handleSubmit(data => console.log(Object.values(data)))}>
      <div>
        <h1>{functionName}</h1>
        {fields.map((field, index) => (
          <div key={index}>
            <h2>{field.parent}</h2>
            <h3>{field.parentName}</h3>
            <FormField
              control={control}
              field={field}
              inputs={inputs}
              error={errors[functionName as never]?.[index]}
              recursiveNumber={1}
              registerName={`${functionName}.[${index}]`}
            />
          </div>
        ))}
        <input type="submit" />
      </div>
    </form>
  );
};

const FormField = ({
  field,
  error,
  registerName,
  recursiveNumber = 0,
  ...rest
}: {
  inputs?:
    | FieldInputs
    | {
        [name: string]: FieldInputs;
      };
  recursiveNumber?: number;
  field: ExtractFields;
  registerName: string;
  control: Control<any, any>;
  onRemove?: () => void;
  error?: any;
}) => {
  switch (field.fieldNames[recursiveNumber]) {
    case 'vector':
      return (
        <ArrayField
          field={field}
          recursiveNumber={recursiveNumber + 1}
          registerName={registerName}
          error={error}
          {...rest}
        />
      );
    case 'optional':
      return (
        <OptionalField
          field={field}
          recursiveNumber={recursiveNumber + 1}
          registerName={registerName}
          error={error}
          {...rest}
        />
      );
    case 'record':
    case 'variant':
      return (
        <fieldset>
          <legend>{registerName}</legend>
          {field.fields?.map((field, index) => (
            <FormField
              key={index}
              recursiveNumber={recursiveNumber + 1}
              registerName={`${registerName}.${field.label}`}
              field={field}
              error={error?.[field.label]}
              {...rest}
            />
          ))}
        </fieldset>
      );
    default:
      console.log({ registerName }, rest.inputs);
      return (
        <Input
          {...rest}
          {...rest.control.register(registerName, field)}
          type={field.type}
          label={field.label}
          error={error?.message?.toString()}
          required={field.required}
        />
      );
  }
};

const ArrayField = ({
  control,
  field,
  error,
  registerName,
  recursiveNumber = 0,
  ...rest
}: {
  recursiveNumber?: number;
  control: Control<any, any>;
  registerName: string;
  field: ExtractFields;
  error?: any;
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: registerName as never,
  });

  return (
    <div>
      <label>Vector</label>
      <button type="button" onClick={() => append('')}>
        +
      </button>
      {fields.map((item, index) => (
        <div key={item.id} style={{ display: 'flex', alignItems: 'end' }}>
          <FormField
            key={index}
            field={field}
            error={error?.[index]}
            control={control}
            registerName={`${registerName}.[${index}]`}
            recursiveNumber={recursiveNumber}
            {...rest}
          />
          <button type="button" onClick={() => remove(index)}>
            x
          </button>
        </div>
      ))}
    </div>
  );
};

const OptionalField = ({
  control,
  field,
  error,
  recursiveNumber = 0,
  registerName,
  ...rest
}: {
  recursiveNumber?: number;
  control: Control<any, any>;
  field: ExtractFields;
  registerName: string;
  error?: any;
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: registerName as never,
  });

  return (
    <div>
      <label htmlFor={registerName}>Optional</label>
      <input
        type="checkbox"
        id={registerName}
        onChange={e => (e.target.checked ? append('') : remove(0))}
      />
      {fields.length > 0 && (
        <FormField
          field={field}
          error={error?.[0]}
          control={control}
          registerName={`${registerName}.[0]`}
          recursiveNumber={recursiveNumber}
          {...rest}
        />
      )}
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
> = React.forwardRef(({ label, onRemove, isError, name, type, required, error, ...rest }, ref) => {
  return (
    <div>
      <label
        style={{
          margin: 0,
          marginBottom: 1,
          fontSize: 10,
        }}
        htmlFor={name}
      >
        {label}
      </label>
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
        </div>
        {onRemove && (
          <button type="button" onClick={onRemove}>
            -
          </button>
        )}
      </div>
    </div>
  );
});
