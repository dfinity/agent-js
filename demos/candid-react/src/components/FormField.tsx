import React from 'react';
import { ExtractedField } from '@dfinity/candid';
import { Control, UseFormResetField, UseFormTrigger } from 'react-hook-form';
import Vector from './Vector';
import Input from './Input';
import Optional from './Optional';
import Variant from './Variant';
import Recursive from './Recursive';

interface FormFieldsProps {
  field: ExtractedField;
  registerName: string;
  control: Control<any, any>;
  onRemove?: () => void;
  resetField: UseFormResetField<{}>;
  trigger: UseFormTrigger<{}>;
  error?: any;
}

const FormField: React.FC<FormFieldsProps> = ({ field, error, registerName, ...rest }) => {
  console.log('field', field.type, field.fields);
  switch (field.type) {
    case 'vector':
      return <Vector field={field} registerName={registerName} error={error} {...rest} />;
    case 'optional':
      return <Optional field={field} registerName={registerName} error={error} {...rest} />;
    case 'record':
      return (
        <fieldset className="w-full">
          <legend className="font-semibold">{field.label}</legend>
          {field.fields?.map((field, index) => (
            <FormField
              key={index}
              registerName={`${registerName}.${field.label}`}
              field={field}
              error={error?.[field.label]}
              {...rest}
            />
          ))}
        </fieldset>
      );
    case 'tuple':
      return (
        <fieldset className="w-full">
          <legend className="font-semibold">{field.label}</legend>
          {field.fields?.map((field, index) => (
            <FormField
              key={index}
              registerName={`${registerName}.[${index}]`}
              field={field}
              error={error?.[index]}
              {...rest}
            />
          ))}
        </fieldset>
      );
    case 'variant':
      return <Variant registerName={registerName} fields={field} error={error} {...rest} />;
    default:
      return field.type === 'recursive' && typeof field.extract === 'function' ? (
        <Recursive field={field} registerName={registerName} error={error} {...rest} />
      ) : (
        <Input
          {...rest}
          {...rest.control.register(registerName, field)}
          type={field.type}
          label={field.label}
          error={error?.message?.toString()}
          isError={!!error}
          required={field.required}
        />
      );
  }
};

export default FormField;
