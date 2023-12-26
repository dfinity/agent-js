import FormField, { FormFieldsProps } from './FormField';

interface RecordProps extends FormFieldsProps {}

const Record: React.FC<RecordProps> = ({ field, errors, registerName }) => {
  return (
    <div className="w-full">
      <div className="font-semibold">{field.label}</div>
      {field.fields?.map((field, index) => (
        <FormField
          key={index}
          registerName={`${registerName}.${field.label}`}
          field={field}
          errors={errors?.[field.label as never]}
        />
      ))}
    </div>
  );
};

export default Record;
