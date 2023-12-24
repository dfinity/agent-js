import { ExtractFields } from '@dfinity/candid';
import { useState, useEffect } from 'react';
import { UseFormResetField, UseFormTrigger, Control } from 'react-hook-form';
import FormField from './FormField';

interface RecursiveProps {
  field: ExtractFields;
  registerName: string;
  resetField: UseFormResetField<{}>;
  trigger: UseFormTrigger<{}>;
  control: Control<any, any>;
  error?: any;
}

const Recursive: React.FC<RecursiveProps> = ({ field, error, ...rest }) => {
  const [extractedField, setExtractedFields] = useState<ExtractFields>();

  useEffect(() => {
    const fields = field.extract();
    setExtractedFields(fields);
  }, [field]);

  return extractedField ? (
    <FormField
      fieldLabel={field.label}
      field={extractedField}
      recursiveNumber={1}
      error={error?.[field.label]}
      {...rest}
    />
  ) : (
    <div>Loading...</div>
  );
};
export default Recursive;
