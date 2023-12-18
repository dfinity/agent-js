import { useFieldArray, useForm } from 'react-hook-form';

const RecursiveForm = () => {
  const { control, handleSubmit, register } = useForm();

  const onSubmit = (data: any) => {
    console.log('Form data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <label>
        First name:
        <input {...register('firstName')} />
      </label>

      <label>
        Last name:
        <input {...register('lastName')} />
      </label>

      <FriendFieldArray control={control} register={register} name="friends" />

      <input type="submit" />
    </form>
  );
};

// Recursive Friend Component
const FriendFieldArray = ({ control, register, name }: any) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name, // Field name in the form data
  });

  return (
    <div>
      {fields.map((field: any, index: number) => {
        return (
          <div key={field.id}>
            <label>
              {name}
              Friend's #{index + 1}
              <input
                {...register(`${name}.${index}.firstName` as const)}
                defaultValue={field.firstName}
              />
            </label>

            <label>
              Last name:
              <input
                {...register(`${name}.${index}.lastName` as const)}
                defaultValue={field.lastName}
              />
            </label>

            <FriendFieldArray
              control={control}
              register={register}
              name={`${name}.${index}.friends`}
            />

            <button type="button" onClick={() => remove(index)}>
              Delete
            </button>
          </div>
        );
      })}
      <button type="button" onClick={() => append({ firstName: '', lastName: '', friends: [] })}>
        Append
      </button>
    </div>
  );
};

export default RecursiveForm;
