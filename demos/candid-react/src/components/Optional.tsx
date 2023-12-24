import { ExtractFields } from '@dfinity/candid';
import { useEffect } from 'react';
import { Control, UseFormResetField, UseFormTrigger, useFieldArray } from 'react-hook-form';
import FormField from './FormField';

interface OptionalProps {
  recursiveNumber?: number;
  control: Control<any, any>;
  field: ExtractFields;
  registerName: string;
  resetField: UseFormResetField<{}>;
  trigger: UseFormTrigger<{}>;
  fieldLabel: string;
  error?: any;
}

const Optional: React.FC<OptionalProps> = ({
  control,
  field,
  error,
  recursiveNumber = 1,
  registerName,
  fieldLabel,
  ...rest
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: registerName as never,
  });

  // workaround for the argument to be []
  useEffect(() => {
    append('');
    setTimeout(() => {
      remove(0);
    }, 0);
  }, [append, remove]);

  return (
    <div>
      <label htmlFor={registerName}>{fieldLabel}</label>
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
export default Optional;
