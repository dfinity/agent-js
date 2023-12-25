import { ExtractedField } from '@dfinity/candid';
import { Control, UseFormResetField, UseFormTrigger } from 'react-hook-form';
import FormField from './FormField';

interface TupleProps {
  control: Control<any, any>;
  field: ExtractedField;
  registerName: string;
  resetField: UseFormResetField<{}>;
  trigger: UseFormTrigger<{}>;
  error?: any;
}

const Tuple: React.FC<TupleProps> = ({ field, registerName, error, ...rest }) => {
  return (
    <div className="w-full">
      <div className="font-semibold">{field.label}</div>
      {field.fields?.map((field, index) => (
        <FormField
          key={index}
          registerName={`${registerName}.[${index}]`}
          field={field}
          error={error?.[index]}
          {...rest}
        />
      ))}
    </div>
  );
};

export default Tuple;
