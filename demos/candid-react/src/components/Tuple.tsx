import FormField, { FormFieldsProps } from './FormField';

interface TupleProps extends FormFieldsProps {}

const Tuple: React.FC<TupleProps> = ({ field, registerName, errors }) => {
  return (
    <div className="w-full">
      <div className="font-semibold">{field.label}</div>
      {field.fields?.map((field, index) => (
        <FormField
          key={index}
          registerName={`${registerName}.[${index}]`}
          errors={errors?.[index as never]}
          field={field}
        />
      ))}
    </div>
  );
};

export default Tuple;
