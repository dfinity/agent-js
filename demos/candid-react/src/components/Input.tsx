import { FieldType } from '@dfinity/candid';
import { forwardRef } from 'react';
import { UseFormResetField, UseFormTrigger } from 'react-hook-form';
import Button from './Button';

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
      <div style={{ width: '100%', padding: 5 }}>
        <label htmlFor={name}>
          {label}
          {required && <span style={{ color: 'red' }}>*</span>}
          {error && <span style={{ color: 'red', margin: 0, fontSize: 8 }}>({error})</span>}
        </label>
        <div
          style={{
            position: 'relative',
          }}
        >
          <input
            style={{
              width: '100%',
              height: 30,
              paddingLeft: 10,
              paddingRight: 30,
              border: !!isError ? '1px solid red' : '1px solid black',
              boxSizing: 'border-box',
            }}
            id={name}
            name={name}
            type={type}
            placeholder={type}
            ref={ref as never}
            {...rest}
          />
          {type !== 'checkbox' && (
            <Button
              style={{
                position: 'absolute',
                right: 0,
                top: '40%',
                transform: 'translateY(-50%)',
                height: 30,
                width: 30,
                background: 'transparent',
                color: 'red',
              }}
              onClick={() => {
                resetField(name as never);
                trigger(name as never, { shouldFocus: true });
              }}
            >
              x
            </Button>
          )}
        </div>
      </div>
    );
  },
);

export default Input;
