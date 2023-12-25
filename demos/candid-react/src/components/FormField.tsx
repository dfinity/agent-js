import { FieldInputs, ExtractedFields } from '@dfinity/candid';
import { Control, UseFormResetField, UseFormTrigger } from 'react-hook-form';
import ArrayField from './Array';
import Input from './Input';
import Optional from './Optional';
import Select from './Select';
import Recursive from './Recursive';

interface FormFieldsProps {
  fieldLabel?: string;
  inputs?:
    | FieldInputs
    | {
        [name: string]: FieldInputs;
      };
  recursiveNumber?: number;
  field: ExtractedFields;
  registerName: string;
  control: Control<any, any>;
  onRemove?: () => void;
  resetField: UseFormResetField<{}>;
  trigger: UseFormTrigger<{}>;
  error?: any;
}

const FormField: React.FC<FormFieldsProps> = ({
  field,
  error,
  fieldLabel,
  registerName,
  recursiveNumber = 1,
  ...rest
}) => {
  switch (field.fieldNames[recursiveNumber]) {
    case 'vector':
      return (
        <ArrayField
          field={field}
          recursiveNumber={recursiveNumber + 1}
          registerName={registerName}
          error={error}
          fieldLabel={fieldLabel}
          {...rest}
        />
      );
    case 'optional':
      return (
        <Optional
          field={field}
          fieldLabel={field.fieldNames[recursiveNumber]}
          recursiveNumber={recursiveNumber + 1}
          registerName={registerName}
          error={error}
          {...rest}
        />
      );
    case 'record':
      return (
        <fieldset style={{ width: '100%', boxSizing: 'border-box' }}>
          <legend>{field.label}</legend>
          {field.fields?.map((field, index) => (
            <FormField
              key={index}
              fieldLabel={field.fieldNames[recursiveNumber]}
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
        <fieldset style={{ width: '100%', boxSizing: 'border-box' }}>
          <legend>{field.label}</legend>
          {field.fields?.map((field, index) => (
            <FormField
              key={index}
              fieldLabel={field.fieldNames[recursiveNumber]}
              registerName={`${registerName}.[${index}]`}
              field={field}
              error={error?.[index]}
              {...rest}
            />
          ))}
        </fieldset>
      );
    case 'variant':
      return <Select registerName={registerName} fields={field} error={error} {...rest} />;
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
