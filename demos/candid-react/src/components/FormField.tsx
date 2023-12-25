import React from 'react';
import { ExtractedField } from '@dfinity/candid';
import {
  Control,
  FieldError,
  FieldErrorsImpl,
  Merge,
  UseFormResetField,
  UseFormSetValue,
  UseFormTrigger,
} from 'react-hook-form';
import Vector from './Vector';
import Input from './Input';
import Optional from './Optional';
import Variant from './Variant';
import Recursive from './Recursive';
import Record from './Record';
import Tuple from './Tuple';

interface FormFieldsProps {
  field: ExtractedField;
  registerName: string;
  control: Control<any, any>;
  onRemove?: () => void;
  resetField: UseFormResetField<{}>;
  trigger: UseFormTrigger<{}>;
  error: any;
  setValue: UseFormSetValue<{}>;
}

const FormField: React.FC<FormFieldsProps> = props => {
  switch (props.field.type) {
    case 'vector':
      return <Vector {...props} />;
    case 'optional':
      return <Optional {...props} />;
    case 'record':
      return <Record {...props} />;
    case 'tuple':
      return <Tuple {...props} />;
    case 'variant':
      return <Variant {...props} />;
    case 'recursive':
      return <Recursive {...props} />;
    default:
      return <Input {...props} />;
  }
};

export default FormField;
