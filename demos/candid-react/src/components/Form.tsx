import { ExtractedField } from '@dfinity/candid';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from './Button';
import FormField from './FormField';
import { actor } from './Candid';

interface FormProps {
  field: ExtractedField;
  functionName: string;
}

const Form: React.FC<FormProps> = ({ field, functionName }) => {
  const [argState, setArgState] = useState<any>(null);
  const [argErrorState, setArgErrorState] = useState<any>(null); // [arg, error
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
    const args = (Object.values(data)[0] || []) as any;
    console.log('args', args);
    setArgState(args);
    setResultState(null);
    try {
      // if (args.length !== field.fields?.length) throw new Error('Invalid argument');
      // args.forEach((arg: any, index: number) => {
      //   console.log(field.fields[index].validate(arg));
      // });
    } catch (error) {
      console.log('error', error);
      setArgErrorState((error as Error).message);
    }
  };

  const onCall = async (data: any) => {
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
    <form onSubmit={handleSubmit(onSubmit)} className="border border-black rounded p-2 mt-2 w-full">
      <h1 className="text-xl font-bold mb-4">{functionName}</h1>
      {field.fields?.map((field, index) => {
        return (
          <div key={index} className="mb-2">
            <FormField
              control={control}
              field={field}
              resetField={resetField}
              trigger={trigger}
              error={errors[functionName as never]?.[index]}
              registerName={`${functionName}.[${index}]`}
            />
          </div>
        );
      })}
      {argState && (
        <fieldset className="border p-2 my-2">
          <legend className="font-semibold">Arguments</legend>
          <span className="text-sm">
            ( {argState.map((arg: any) => JSON.stringify(arg, null, 2)).join(', ')} )
          </span>
        </fieldset>
      )}
      {resultState && (
        <fieldset className="border p-2 my-2">
          <legend className="font-semibold">Results</legend>
          <span className="text-sm">
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
      <div className="flex items-center">
        <Button
          type="submit"
          className="mt-2 py-2 px-4 text-lg bg-green-500 hover:bg-green-700 text-white font-bold rounded"
        >
          Verify Args
        </Button>
        <Button
          className="mt-2 ml-2 py-2 px-4 text-lg bg-blue-500 hover:bg-blue-700 text-white font-bold rounded"
          onClick={handleSubmit(onCall)}
        >
          Call
        </Button>
      </div>
    </form>
  );
};

export default Form;
