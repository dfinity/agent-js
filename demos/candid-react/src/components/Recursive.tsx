import { ExtractedField } from '@dfinity/candid';
import { useState, useEffect } from 'react';
import { UseFormResetField, UseFormTrigger, Control, UseFormSetValue } from 'react-hook-form';
import FormField from './FormField';

interface RecursiveProps {
  field: ExtractedField;
  registerName: string;
  resetField: UseFormResetField<{}>;
  trigger: UseFormTrigger<{}>;
  setValue: UseFormSetValue<{}>;
  control: Control<any, any>;
  error?: any;
}

const Recursive: React.FC<RecursiveProps> = ({ field, error, ...rest }) => {
  const [extractedField, setExtractedFields] = useState<ExtractedField>();

  useEffect(() => {
    const fields = field.extract?.();
    console.log('fields', fields);
    setExtractedFields(fields);
  }, [field]);

  return extractedField ? (
    <FormField field={extractedField} error={error?.[field.label]} {...rest} />
  ) : (
    <div>Loading...</div>
  );
};
export default Recursive;
