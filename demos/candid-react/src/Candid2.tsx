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
            <Form fields={fields} inputs={inputs} />
          </div>
        );
      })}
    </div>
  );
};

export default Candid2;

type FormValues = ServiceClassFields['inputs'];

const Form = ({ fields, inputs }: { fields: ExtractFields[]; inputs: FormValues }) => {
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
          <FormField
            control={control}
            field={field}
            error={errors}
            recursiveNumber={1}
            registerName={field.fieldName}
          />
        </div>
      ))}
      <input type="submit" />
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
  console.log(field.fieldNames[recursiveNumber], recursiveNumber);
  if (field.fieldNames[recursiveNumber] === 'vector') {
    return (
      <ArrayField
        field={field}
        error={error?.[field.fieldName]}
        name={field.fieldNames[recursiveNumber]}
        recursiveNumber={recursiveNumber + 1}
        fromVectors
        {...rest}
      />
    );
  }
  if (field.fieldNames[recursiveNumber] === 'optional') {
    return (
      <ArrayField
        field={field}
        error={error?.[field.fieldName]}
        name={field.fieldNames[recursiveNumber]}
        recursiveNumber={recursiveNumber + 1}
        fromOptional
        {...rest}
      />
    );
  }
  if (
    field.fieldNames[recursiveNumber] === 'record' ||
    field.fieldNames[recursiveNumber] === 'variant'
  ) {
    return (
      <fieldset>
        <legend>{field.fieldName}</legend>
        {field.fields?.map(field => (
          <FormField
            key={field.fieldName}
            recursiveNumber={recursiveNumber + 1}
            registerName={`${registerName}.${field.fieldName}`}
            field={field}
            error={error}
            {...rest}
          />
        ))}
      </fieldset>
    );
  }

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
};

const ArrayField = ({
  control,
  field,
  error,
  name,
  fromOptional,
  fromVectors,
  recursiveNumber = 0,
  ...rest
}: {
  recursiveNumber?: number;
  control: Control<FormValues, any>;
  field: ExtractFields;
  error?: any;
  name: string;
  fromVectors?: boolean;
  fromOptional?: boolean;
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: field.fieldName as never,
  });

  const handleAppend = () => {
    append('');
  };

  const activeAdd = (fromOptional && fields.length === 0) || fromVectors;
  const activeRemove = (fromOptional && fields.length > 0) || fromVectors;

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
            <FormField
              key={index}
              field={field}
              error={error}
              control={control}
              registerName={`${name}.[${index}]`}
              recursiveNumber={recursiveNumber}
              onRemove={activeRemove ? () => remove(index) : undefined}
              {...rest}
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
