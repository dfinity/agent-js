import { ExtractedField } from '@dfinity/candid';
import { Control, UseFormResetField, UseFormTrigger, useFieldArray } from 'react-hook-form';
import FormField from './FormField';
import { cn } from '../utils';

interface OptionalProps {
  control: Control<any, any>;
  field: ExtractedField;
  registerName: string;
  resetField: UseFormResetField<{}>;
  trigger: UseFormTrigger<{}>;
  error?: any;
}

const Optional: React.FC<OptionalProps> = ({
  control,
  field,
  error,
  registerName,
  resetField,
  trigger,
  ...rest
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: registerName as never,
  });

  return (
    <div>
      <label htmlFor={registerName}>{field.label}</label>
      <input
        className="hidden"
        id={registerName}
        onChange={e => (e.target.checked ? append('') : remove(0))}
        type="checkbox"
      />
      <label
        className={cn(
          'relative inline-block w-12 h-6 rounded-full cursor-pointer transition duration-200',
          fields.length > 0 ? 'bg-green-400' : 'bg-gray-600',
        )}
        htmlFor={registerName}
      >
        <span
          className={cn(
            'absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform transform',
            fields.length > 0 ? 'translate-x-6' : 'translate-x-0',
          )}
        />
      </label>
      {fields.length > 0 && (
        <FormField
          field={field.fields?.[0]}
          error={error?.[0]}
          control={control}
          registerName={`${registerName}.[0]`}
          resetField={resetField}
          trigger={trigger}
          {...rest}
        />
      )}
    </div>
  );
};
export default Optional;
