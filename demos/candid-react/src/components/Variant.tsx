import React, { useState } from 'react';
import FormField, { FormFieldsProps } from './FormField';
import { useFormContext } from 'react-hook-form';

interface VariantProps extends FormFieldsProps {}

const Variant: React.FC<VariantProps> = ({ field, registerName, errors }) => {
  const { unregister, resetField } = useFormContext();

  const [select, setSelect] = useState(field.options?.[0]);
  const selectedField = field.fields?.find(field => field.label === select);

  return (
    <div className="w-full flex-col">
      <label htmlFor={registerName} className="block mr-2">
        {field.label}
      </label>
      <select
        className="w-full h-8 pl-2 pr-8 border rounded border-gray-300"
        onChange={e => {
          resetField(`${registerName}.${select}` as never);
          unregister(registerName as never);
          setSelect(e.target.value);
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
          registerName={`${registerName}.${select}`}
          errors={errors?.[select as never]}
          field={selectedField}
        />
      ) : (
        <div className="mt-2">Field not found</div>
      )}
    </div>
  );
};

export default Variant;
