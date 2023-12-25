import React, { useState } from 'react';
import { ExtractedField } from '@dfinity/candid';
import { UseFormResetField, UseFormTrigger, Control } from 'react-hook-form';
import FormField from './FormField';

interface VariantProps {
  registerName: string;
  fields: ExtractedField;
  resetField: UseFormResetField<{}>;
  trigger: UseFormTrigger<{}>;
  control: Control<any, any>;
  error?: any;
}

const Variant: React.FC<VariantProps> = ({
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
    <div className="w-full box-border">
      <div className="flex items-center w-full box-border">
        <label htmlFor={registerName} className="block mr-2">
          {fields.label}
        </label>
        <select
          className="w-full h-8 pl-2 pr-8 ml-2 border rounded"
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
          registerName={`${registerName}.${value}`}
          field={field}
          resetField={resetField}
          control={control}
          error={error?.[value as never]}
          {...rest}
        />
      ) : (
        <div className="mt-2">Field not found</div>
      )}
    </div>
  );
};

export default Variant;
