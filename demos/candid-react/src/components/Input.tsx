import { cn } from '../utils';
import { useFormContext } from 'react-hook-form';
import { FormFieldsProps } from './FormField';

interface InputProps extends FormFieldsProps {}

const Input: React.FC<InputProps> = ({ registerName, errors, field }) => {
  const { register, resetField, trigger } = useFormContext();

  const validate = (x: any) => {
    if (field.type === 'null') {
      return field.validate(null);
    } else {
      return field.validate(x);
    }
  };

  const errorMessage = errors?.message?.toString();

  return field.type !== 'null' ? (
    <div className="w-full p-1">
      <label className="block">
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
        {errorMessage && <span className="text-red-500 text-xs ml-1">( {errorMessage} )</span>}
      </label>
      <div className="relative">
        <input
          {...register(registerName as never, { ...field, validate })}
          className={cn(
            'w-full h-8 pl-2 pr-8 border rounded',
            !!errors ? 'border-red-500' : 'border-gray-300',
          )}
          type={field.type === 'principal' ? 'text' : field.type}
          placeholder={field.type}
        />
        {field.type !== 'checkbox' && (
          <div
            className="absolute inset-y-0 right-0 flex items-center justify-center w-8 text-red-500 pb-1 px-1 cursor-pointer"
            onClick={() => {
              resetField(registerName as never);
              trigger(registerName as never, { shouldFocus: true });
            }}
          >
            <span className="text-2xl leading-5 font-bold">×</span>
          </div>
        )}
      </div>
    </div>
  ) : null;
};

export default Input;
