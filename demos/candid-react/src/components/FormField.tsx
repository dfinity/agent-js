import React from 'react';
import { ExtractedField } from '@dfinity/candid';
import Vector from './Vector';
import Input from './Input';
import Optional from './Optional';
import Variant from './Variant';
import Recursive from './Recursive';
import Record from './Record';
import Tuple from './Tuple';
import { FieldError, FieldErrorsImpl, Merge } from 'react-hook-form';
import Principal from './Principal';

export interface FormFieldsProps {
  field: ExtractedField;
  registerName: string;
  errors: FieldError | Merge<FieldError, FieldErrorsImpl<any>> | undefined;
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
    case 'principal':
      return <Principal {...props} />;
    default:
      return <Input {...props} />;
  }
};

export default FormField;
