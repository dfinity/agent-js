import { ExtractedFields } from '@dfinity/candid';
import { useEffect } from 'react';
import { Control, UseFormResetField, UseFormTrigger, useFieldArray } from 'react-hook-form';
import Button from './Button';
import FormField from './FormField';

interface ArrayFieldProps {
  recursiveNumber?: number;
  control: Control<any, any>;
  registerName: string;
  field: ExtractedFields;
  resetField: UseFormResetField<{}>;
  trigger: UseFormTrigger<{}>;
  fieldLabel?: string;
  error?: any;
}

const ArrayField: React.FC<ArrayFieldProps> = ({
  control,
  field,
  error,
  registerName,
  recursiveNumber = 1,
  fieldLabel,
  ...rest
}: ArrayFieldProps) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: registerName as never,
  });

  // workaround for the argument to be []
  useEffect(() => {
    append('');
    setTimeout(() => {
      remove(0);
    }, 0);
  }, [append, remove]);

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      <label>{fieldLabel}</label>
      <Button style={{ marginBottom: 5, marginTop: 5 }} onClick={() => append('')}>
        +
      </Button>
      {fields.map((item, index) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'start',
            border: '1px dashed black',
            justifyContent: 'space-between',
            padding: 5,
            marginBottom: 5,
            width: '100%',
            boxSizing: 'border-box',
          }}
          key={item.id}
        >
          <FormField
            field={field}
            error={error?.[index]}
            control={control}
            registerName={`${registerName}.[${index}]`}
            recursiveNumber={recursiveNumber}
            {...rest}
          />
          <Button
            style={{
              height: 35,
              width: 35,
              marginLeft: 10,
            }}
            onClick={() => remove(index)}
          >
            x
          </Button>
        </div>
      ))}
    </div>
  );
};
export default ArrayField;
