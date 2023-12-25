/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable jsdoc/require-jsdoc */
export interface JsonArray extends Array<JsonValue> {}

export interface JsonObject extends Record<string, JsonValue> {}

export type JsonValue = boolean | string | number | JsonArray | JsonObject;

export type FieldInputs = {
  [name: string]: Array<string> | string;
};

export type ServiceClassFields = {
  functionName: string;
  inputs: FieldInputs | { [name: string]: FieldInputs };
  fieldNames: string[];
  fields: ExtractedFields[];
};

export type FieldComponent = 'form' | 'input' | 'select' | 'option' | 'span' | 'fieldset';

export type FieldType =
  | 'text'
  | 'number'
  | 'checkbox'
  | 'select'
  | 'textarea'
  | 'recursive'
  | 'reserved'
  | 'record'
  | 'variant'
  | 'tuple'
  | 'null'
  | 'empty'
  | 'principal'
  | 'unknown';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyValue = any;

export type InputFormFields = Partial<{
  required: boolean;
  min: number | string;
  max: number | string;
  maxLength: number;
  minLength: number;
  valueAsNumber: boolean;
}>;

export interface ExtractedFields extends InputFormFields {
  label: string;
  type: FieldType;
  component: FieldComponent;
  options?: string[];
  fields?: ExtractedFields[];
  fieldNames: string[];
  extract?: () => ExtractedFields;
  validate: (value: AnyValue) => boolean | string;
}

export type ExtractFieldsArgs = {
  label?: string;
  fieldNames: string[];
};
