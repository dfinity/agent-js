import { cn } from '../utils';
import { Principal as PrincipalId } from '@dfinity/principal';
import { useFormContext } from 'react-hook-form';
import { FormFieldsProps } from './FormField';

interface PrincipalProps extends FormFieldsProps {}

const Principal: React.FC<PrincipalProps> = ({ registerName, errors, field }) => {
  const { setValue, register, resetField, setError } = useFormContext();

  const blurHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === '') {
      setValue(registerName as never, '' as never);
      return;
    }
    const inputValue = e.target.value;
    resetField(registerName as never, { defaultValue: inputValue as never });
    const isValid = validate(inputValue);

    if (isValid === true) {
      const principal = PrincipalId.fromText(inputValue);

      setValue(registerName as never, principal as never);
    } else {
      setError(registerName as never, {
        type: 'manual',
        message: isValid,
      });
    }
  };

  function validate(x: any) {
    if (x._isPrincipal === true) {
      return true;
    }
    try {
      if (x.length < 7) {
        throw new Error('Principal is too short');
      }
      const principal = PrincipalId.fromText(x);

      let validate = field.validate(principal);

      if (typeof validate === 'string') {
        throw new Error(validate);
      }
      return true;
    } catch (error) {
      return (error as any).message;
    }
  }

  const errorMessage = errors?.message?.toString();

  return (
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
          type="text"
          placeholder={field.type}
          onBlur={blurHandler}
        />
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-center w-8 text-red-500 pb-1 px-1 cursor-pointer"
          onClick={() => setValue(registerName as never, '' as never)}
        >
          <span className="text-2xl leading-5 font-bold">×</span>
        </div>
      </div>
    </div>
  );
};

export default Principal;
