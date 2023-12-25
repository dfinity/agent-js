import React, { forwardRef } from 'react';
import { FieldType } from '@dfinity/candid';
import { UseFormResetField, UseFormTrigger } from 'react-hook-form';
import { cn } from '../utils';

interface InputProps {
  label: string;
  type: FieldType;
  name: string;
  required?: boolean;
  isError?: boolean;
  error?: string;
  trigger: UseFormTrigger<{}>;
  resetField: UseFormResetField<{}>;
}

const Input: React.FC<InputProps> = forwardRef(
  ({ label, resetField, trigger, isError, name, type, required, error, ...rest }, ref) => {
    return (
      <div className="w-full p-1">
        <label htmlFor={name} className="block">
          {label}
          {required && <span className="text-red-500">*</span>}
          {error && <span className="text-red-500 text-xs ml-1">({error})</span>}
        </label>
        <div className="relative">
          <input
            className={cn(
              'w-full h-8 pl-2 pr-8 border rounded',
              isError ? 'border-red-500' : 'border-gray-400',
            )}
            id={name}
            name={name}
            type={type}
            placeholder={type}
            ref={ref as never}
            {...rest}
          />
          {type !== 'checkbox' && (
            <div
              className="absolute inset-y-0 right-0 flex items-center justify-center w-8 text-red-500 pb-1 px-1 cursor-pointer"
              onClick={() => {
                resetField(name as never);
                trigger(name as never, { shouldFocus: true });
              }}
            >
              <span className="text-2xl leading-5 font-bold">×</span>
            </div>
          )}
        </div>
      </div>
    );
  },
);

export default Input;
