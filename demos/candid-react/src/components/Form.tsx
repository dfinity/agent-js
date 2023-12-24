import { ExtractFields } from '@dfinity/candid';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from './Button';
import { actor } from '../Candid';
import FormField from './FormField';

interface FormProps {
  fields: ExtractFields[];
  functionName: string;
}

const Form: React.FC<FormProps> = ({ fields, functionName }) => {
  const [argState, setArgState] = useState<any>(null);
  const [resultState, setResultState] = useState<any>(null);

  const {
    formState: { errors },
    control,
    handleSubmit,
    resetField,
    trigger,
  } = useForm({
    shouldUseNativeValidation: true,
    reValidateMode: 'onChange',
    mode: 'onChange',
    values: {},
  });

  const onSubmit = async (data: any) => {
    const args = Object.values(data)[0] || [];
    setArgState(args);
    setResultState(null);
    try {
      const result = await actor[functionName as keyof typeof actor](...(args as any));
      console.log('result', result);
      setResultState(result);
    } catch (error) {
      console.log('error', error);
      setResultState((error as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div
        style={{
          border: '1px solid black',
          padding: 10,
          marginTop: 10,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <h1>{functionName}</h1>
        {fields.map((field, index) => (
          <FormField
            key={index}
            control={control}
            field={field}
            resetField={resetField}
            trigger={trigger}
            error={errors[functionName as never]?.[index]}
            registerName={`${functionName}.[${index}]`}
          />
        ))}
        {argState && (
          <fieldset>
            <legend>Arguments</legend>
            <span>( {argState.map((arg: any) => JSON.stringify(arg, null, 2)).join(', ')} )</span>
          </fieldset>
        )}
        {argState && (
          <fieldset>
            <legend>Results</legend>
            <span>
              {!resultState ? (
                <div>Calling...</div>
              ) : (
                JSON.stringify(
                  resultState,
                  (_, value) => (typeof value === 'bigint' ? value.toString() : value),
                  2,
                )
              )}
            </span>
          </fieldset>
        )}
        <Button
          type="submit"
          style={{
            marginTop: 10,
            padding: 10,
            fontSize: 15,
          }}
        >
          Submit
        </Button>
      </div>
    </form>
  );
};
export default Form;
