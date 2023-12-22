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
      {fields.map(({ functionName, fieldNames, fields, ...rest }) => {
        console.log({ functionName, fieldNames, fields, ...rest });
        return <Form key={functionName} fields={fields} functionName={functionName} />;
      })}
    </div>
  );
};

export default Candid2;

type FormValues = ServiceClassFields['inputs'];

const Form = ({ fields, functionName }: { fields: ExtractFields[]; functionName: string }) => {
  const {
    formState: { errors },
    control,

    handleSubmit,
  } = useForm<FormValues>({
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
              error={errors}
              recursiveNumber={1}
              registerName={functionName}
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
  recursiveNumber?: number;
  field: ExtractFields;
  registerName: string;
  control: Control<FormValues, any>;
  onRemove?: () => void;
  error?: FieldErrors<FormValues>;
}) => {
  console.log(registerName);
  switch (field.fieldNames[recursiveNumber]) {
    case 'vector':
      return (
        <ArrayField
          field={field}
          error={error?.[field.fieldName]}
          recursiveNumber={recursiveNumber + 1}
          registerName={registerName}
          {...rest}
        />
      );
    case 'optional':
      return (
        <OptionalField
          field={field}
          error={error?.[field.fieldName]}
          recursiveNumber={recursiveNumber + 1}
          registerName={registerName}
          {...rest}
        />
      );
    case 'record':
    case 'variant':
      return (
        <fieldset>
          <legend>{field.fieldName}</legend>
          {field.fields?.map(field => (
            <FormField
              key={field.fieldName}
              recursiveNumber={recursiveNumber + 1}
              registerName={`${registerName}.${field.label}`}
              field={field}
              error={error}
              {...rest}
            />
          ))}
        </fieldset>
      );
    default:
      return (
        <Input
          {...rest}
          {...rest.control.register(registerName, field)}
          type={field.type}
          label={field.label}
          error={error?.[field.fieldName]?.message?.toString()}
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
  control: Control<FormValues, any>;
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
      {fields.map((item, index) => {
        return (
          <div key={item.id} style={{ display: 'flex', alignItems: 'start' }}>
            <FormField
              key={index}
              field={field}
              error={error}
              control={control}
              registerName={`${registerName}.[${index}]`}
              recursiveNumber={recursiveNumber}
              {...rest}
            />
            <button type="button" onClick={() => remove(index)}>
              x
            </button>
          </div>
        );
      })}
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
  control: Control<FormValues, any>;
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
      <label>Optional</label>
      {fields.length > 0 && (
        <button type="button" onClick={() => remove(0)}>
          x
        </button>
      )}
      {fields.length === 0 ? (
        <button type="button" onClick={() => append('')}>
          +
        </button>
      ) : (
        <FormField
          field={field}
          error={error}
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
          {required && <p style={{ color: 'red', marginTop: 0, fontSize: 8 }}>Required</p>}
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
