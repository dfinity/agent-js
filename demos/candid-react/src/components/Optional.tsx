import { useFieldArray, useFormContext } from 'react-hook-form';
import FormField, { FormFieldsProps } from './FormField';
import { cn } from '../utils';

interface OptionalProps extends FormFieldsProps {}

const Optional: React.FC<OptionalProps> = ({ field, registerName, errors }) => {
  const { control } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: registerName as never,
  });

  return (
    <div className="flex flex-col">
      <div
        className="flex space-x-2"
        onClick={() => (fields.length === 0 ? append('') : remove(0))}
      >
        <label className="block text-lg font-medium">{field.label}</label>
        <div className="flex-1">
          <input className="hidden" type="checkbox" />
          <label
            className={cn(
              'relative inline-block w-12 h-6 rounded-full cursor-pointer transition duration-200',
              fields.length > 0 ? 'bg-green-400' : 'bg-gray-600',
            )}
          >
            <span
              className={cn(
                'absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform transform',
                fields.length > 0 ? 'translate-x-6' : 'translate-x-0',
              )}
            />
          </label>
        </div>
      </div>
      <div className="flex-1">
        {fields.length > 0 && (
          <FormField
            field={field.fields?.[0]}
            registerName={`${registerName}.[0]`}
            errors={errors?.[0 as never]}
          />
        )}
      </div>
    </div>
  );
};
export default Optional;
