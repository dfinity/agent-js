import React, { useState } from 'react';
import { ExtractedField } from '@dfinity/candid';
import { UseFormResetField, UseFormTrigger, Control, UseFormSetValue } from 'react-hook-form';
import FormField from './FormField';

interface VariantProps {
  registerName: string;
  field: ExtractedField;
  resetField: UseFormResetField<{}>;
  trigger: UseFormTrigger<{}>;
  setValue: UseFormSetValue<{}>;
  control: Control<any, any>;
  error?: any;
}

const Variant: React.FC<VariantProps> = ({
  field,
  registerName,
  control,
  resetField,
  error,
  ...rest
}) => {
  const [value, setValue] = useState(field.options?.[0]);
  const selectedField = field.fields?.find(field => field.label === value);

  return (
    <div className="w-full flex-col">
      <label htmlFor={registerName} className="block mr-2">
        {field.label}
      </label>
      <select
        className="w-full h-8 pl-2 pr-8 border rounded border-gray-300"
        onChange={e => {
          resetField(`${registerName}.${value}` as never);
          control.unregister(registerName);
          setValue(e.target.value);
        }}
      >
        {field.options?.map((label, index) => (
          <option key={index} value={label}>
            {label}
          </option>
        ))}
      </select>
      {selectedField ? (
        <FormField
          registerName={`${registerName}.${value}`}
          field={selectedField}
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
