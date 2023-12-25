import { ExtractedField } from '@dfinity/candid';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from './Button';
import FormField from './FormField';
import { actor } from './Candid';

interface FormProps {
  field: ExtractedField;
  functionName: string;
  defaultValues: any;
}

const Form: React.FC<FormProps> = ({ field, defaultValues, functionName }) => {
  const [argState, setArgState] = useState<any>(null);
  const [argErrorState, setArgErrorState] = useState<any>(null);
  const [resultState, setResultState] = useState<any>(null);

  const {
    formState: { errors },
    control,
    handleSubmit,
    resetField,
    trigger,
    setValue,
  } = useForm({
    shouldUseNativeValidation: true,
    reValidateMode: 'onChange',
    mode: 'onChange',
    defaultValues,
  });

  const onSubmit = useCallback(
    (data: any) => {
      setResultState(null);
      setArgState(null);
      setArgErrorState(null);
      const args = (Object.values(data)[0] || []) as any[];
      console.log('args', args);

      let errorMessages = '';
      const isInvalid = args.some((arg, i) => {
        const validateArg = field.fields[i]?.validate(arg);
        if (typeof validateArg === 'string') {
          errorMessages = validateArg;
          return false;
        }
        return true;
      });

      if (isInvalid === true) {
        setArgState(args);
        return args;
      } else {
        setArgErrorState(errorMessages);
      }
    },
    [field.fields],
  );

  const callHandler = useCallback(
    async (data: any) => {
      setResultState(null);
      setArgState(null);
      setArgErrorState(null);
      const args = (Object.values(data)[0] || []) as any[];
      console.log('args', args);

      try {
        const result = await actor[functionName as keyof typeof actor](...(args as any));
        console.log('result', result);
        setArgState(args);
        setResultState(result);
      } catch (error) {
        console.log('error', error);
        setResultState((error as Error).message);
      }
    },
    [functionName],
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border border-gray-500 rounded p-2 mt-2 w-full"
    >
      <h1 className="text-xl font-bold mb-4">{functionName}</h1>
      {field.fields?.map((field, index) => {
        return (
          <div key={index} className="mb-2">
            <FormField
              control={control}
              field={field}
              resetField={resetField}
              setValue={setValue}
              trigger={trigger}
              error={(errors as any)[functionName]?.[index]}
              registerName={`${functionName}.[${index}]`}
            />
          </div>
        );
      })}
      {argState && (
        <fieldset className="border p-2 my-2 rounded">
          <legend className="font-semibold">Arguments</legend>
          <span className="text-sm">
            ( {argState.map((arg: any) => JSON.stringify(arg, null, 2)).join(', ')} )
          </span>
        </fieldset>
      )}
      {argErrorState && (
        <fieldset className="border p-2 my-2 text-red-500 border-red-500 rounded">
          <legend className="font-semibold">Arguments Error</legend>
          <span className="text-sm">
            <div>{argErrorState}</div>
          </span>
        </fieldset>
      )}
      {resultState && (
        <fieldset className="border p-2 my-2 rounded">
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
          className="mt-2 py-2 px-4 text-lg bg-blue-500 hover:bg-blue-700 text-white font-bold rounded"
        >
          Verify Args
        </Button>
        <Button
          className="mt-2 ml-2 py-2 px-4 text-lg bg-green-500 hover:bg-green-700 text-white font-bold rounded"
          onClick={handleSubmit(callHandler)}
        >
          Call
        </Button>
      </div>
    </form>
  );
};

export default Form;
