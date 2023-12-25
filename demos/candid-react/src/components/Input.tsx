import { Control, FieldErrors, UseFormResetField, UseFormTrigger } from 'react-hook-form';
import { cn } from '../utils';
import { ExtractedField } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';

interface InputProps {
  control: Control<any, any>;
  registerName: string;
  field: ExtractedField;
  error: FieldErrors<{}>['root'];
  trigger: UseFormTrigger<{}>;
  resetField: UseFormResetField<{}>;
}

const Input: React.FC<InputProps> = ({
  resetField,
  trigger,
  registerName,
  error,
  field,
  control,
}) => {
  const validate = (x: any) => {
    if (field.type === 'principal') {
      try {
        if (x.length > 7) {
          return field.validate(Principal.fromText(x));
        } else {
          throw new Error('Principal is too short');
        }
      } catch (error) {
        return (error as Error).message;
      }
    } else {
      return field.validate(x);
    }
  };

  const errorMessage = error?.message?.toString();

  return (
    <div className="w-full p-1">
      <label htmlFor={registerName} className="block">
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
        {errorMessage && <span className="text-red-500 text-xs ml-1">( {errorMessage} )</span>}
      </label>
      <div className="relative">
        <input
          {...control.register(registerName, { ...field, validate })}
          className={cn(
            'w-full h-8 pl-2 pr-8 border rounded',
            !!error ? 'border-red-500' : 'border-gray-300',
          )}
          id={registerName}
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
  );
};

export default Input;
