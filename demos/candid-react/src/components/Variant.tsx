import React, { useEffect, useRef } from 'react';
import FormField, { FormFieldsProps } from './FormField';
import { useFormContext } from 'react-hook-form';

interface VariantProps extends FormFieldsProps {}

const Variant: React.FC<VariantProps> = ({ field, registerName, errors }) => {
  const { unregister, setValue, resetField } = useFormContext();
  const selectedRef = useRef<string>(field.options?.[0] as string);

  useEffect(() => {
    const select = selectedRef.current;
    setValue(registerName as never, { [select]: field.defaultValues?.[select] } as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeHandler = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const inputValue = e.target.value;
    const select = selectedRef.current;

    resetField(`${registerName}.${select}`);
    unregister(registerName as never);
    setValue(registerName as never, { [inputValue]: field.defaultValues?.[inputValue] } as never);
    selectedRef.current = inputValue;
  };

  const selectedField = field.fields?.find(field => field.label === selectedRef.current);

  return (
    <div className="w-full flex-col">
      <label className="block mr-2">{field.label}</label>
      <select
        className="w-full h-8 pl-2 pr-8 border rounded border-gray-300"
        onChange={changeHandler}
      >
        {field.options?.map((label, index) => (
          <option key={index} value={label}>
            {label}
          </option>
        ))}
      </select>
      {selectedField ? (
        <FormField
          registerName={`${registerName}.${selectedRef.current}`}
          errors={errors?.[selectedRef.current as never]}
          field={selectedField}
        />
      ) : (
        <div className="mt-2">Field not found</div>
      )}
    </div>
  );
};

export default Variant;
