import React from 'react';
import { Controller, FieldValues, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';

// MyForm component
export default function MyForm({ schema }: { schema: zod.ZodObject<any, any> }) {
  const { handleSubmit, control } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  const { fields, append } = useFieldArray({
    name: 'urls',
    control,
  });
  console.log(schema, fields);

  const onSubmit = (data: FieldValues) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field, index) => (
        <Controller
          control={control}
          key={field.id}
          name={`urls.${index}.value`}
          render={({ field }) => (
            <input
              type="text"
              placeholder={field.name}
              onChange={e => {
                console.log(e.target.value);
              }}
            />
          )}
        />
      ))}
      <button type="submit">Submit</button>
    </form>
  );
}
