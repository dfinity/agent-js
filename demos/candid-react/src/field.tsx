// @ts-nocheck
import React from 'react';
import { Controller } from 'react-hook-form';

function FieldArray({ values }: { values: any }) {
  const { control, register } = useForm({
    values,
  });
  const { fields, insert, remove } = useFieldArray({
    control,
    name: 'test',
  });

  return (
    <ul>
      {fields.map((item, index) => (
        <li key={item.id}>
          <input {...register(`test.${index}.firstName`, { required: true })} />
          <Controller
            render={({ field }) => <input {...field} />}
            name={`test.${index}.lastName`}
            control={control}
          />
          <button type="button" onClick={() => remove(index)}>
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}

const SelectForm = ({
  fields,
  control,
  handleSubmit,
}: {
  fields: ExtractFields;
  control: any;
  handleSubmit: any;
}) => {
  return (
    <div>
      <label>{fields.label}</label>
      <Controller
        render={({ field }) => (
          <select {...field}>
            {fields.options?.map((label, index) => (
              <option key={index} value={label}>
                {label}
              </option>
            ))}
          </select>
        )}
        control={control}
        name="test"
      />
    </div>
  );
};
