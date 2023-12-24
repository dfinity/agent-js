import { ExtractFields } from '@dfinity/candid';
import { useState } from 'react';
import { UseFormResetField, UseFormTrigger, Control } from 'react-hook-form';
import FormField from './FormField';

interface SelectProps {
  registerName: string;
  fields: ExtractFields;
  resetField: UseFormResetField<{}>;
  trigger: UseFormTrigger<{}>;
  control: Control<any, any>;
  error?: any;
}

const Select: React.FC<SelectProps> = ({
  fields,
  registerName,
  control,
  resetField,
  error,
  ...rest
}) => {
  const [value, setValue] = useState(fields.options?.[0]);
  const field = fields.fields?.find(field => field.label === value);

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}
      >
        <label htmlFor={registerName}>{fields.type}</label>
        <select
          style={{
            width: '100%',
            height: 30,
            paddingLeft: 10,
            paddingRight: 30,
            marginLeft: 10,
          }}
          onChange={e => {
            resetField(`${registerName}.${value}` as never);
            control.unregister(registerName);
            setValue(e.target.value);
          }}
        >
          {fields.options?.map((label, index) => (
            <option key={index} value={label}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {field ? (
        <FormField
          fieldLabel={field.label}
          registerName={`${registerName}.${value}`}
          field={field}
          resetField={resetField}
          control={control}
          error={error?.[value as never]}
          {...rest}
        />
      ) : (
        <div>Field not found</div>
      )}
    </div>
  );
};
export default Select;
