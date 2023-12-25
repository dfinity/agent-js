import { ExtractedField } from '@dfinity/candid';
import { Control, UseFormResetField, UseFormTrigger } from 'react-hook-form';
import FormField from './FormField';

interface RecordProps {
  control: Control<any, any>;
  field: ExtractedField;
  registerName: string;
  resetField: UseFormResetField<{}>;
  trigger: UseFormTrigger<{}>;
  error?: any;
}

const Record: React.FC<RecordProps> = ({ field, registerName, error, ...rest }) => {
  return (
    <div className="w-full">
      <div className="font-semibold">{field.label}</div>
      {field.fields?.map((field, index) => (
        <FormField
          key={index}
          registerName={`${registerName}.${field.label}`}
          field={field}
          error={error?.[field.label]}
          {...rest}
        />
      ))}
    </div>
  );
};

export default Record;
