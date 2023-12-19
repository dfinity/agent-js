/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable jsdoc/require-jsdoc */
export interface JsonArray extends Array<JsonValue> {}

export interface JsonObject extends Record<string, JsonValue> {}

export type JsonValue = boolean | string | number | JsonArray | JsonObject;

export type FieldComponent = 'form' | 'input' | 'select' | 'option' | 'div';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyValue = any;

export type ExtractFields = {
  label: string;
  type: string;
  parent?: string;
  parentLabel?: string;
  options?: string[];
  component?: FieldComponent;
} & Partial<{
  required: boolean;
  min: number | string;
  max: number | string;
  maxLength: number;
  minLength: number;
  validate: (value: AnyValue) => boolean | string;
  value: AnyValue;
  setValueAs: (value: AnyValue) => AnyValue;
  shouldUnregister?: boolean;
  onChange?: (event: Event) => void;
  onBlur?: (event: Event) => void;
  disabled: boolean;
  deps: AnyValue | AnyValue[];
}> &
  (
    | {
        pattern?: RegExp;
        valueAsNumber?: false;
        valueAsDate?: false;
      }
    | {
        pattern?: undefined;
        valueAsNumber?: false;
        valueAsDate?: true;
      }
    | {
        pattern?: undefined;
        valueAsNumber?: true;
        valueAsDate?: false;
      }
  );

export type ExtractFieldsArgs = {
  label?: string;
  parent?: string;
  parentLabel?: string;
  recursive?: boolean;
  required?: boolean;
};
