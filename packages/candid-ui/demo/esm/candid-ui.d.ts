import { IDL } from '@dfinity/candid';
import * as UI from './candid-core';
declare type InputBox = UI.InputBox;
declare const FormConfig: UI.FormConfig;
export declare const inputBox: (t: IDL.Type, config: Partial<UI.UIConfig>) => UI.InputBox;
export declare const recordForm: (
  fields: Array<[string, IDL.Type]>,
  config: Partial<UI.FormConfig>,
) => UI.RecordForm;
export declare const tupleForm: (
  components: IDL.Type[],
  config: Partial<UI.FormConfig>,
) => UI.TupleForm;
export declare const variantForm: (
  fields: Array<[string, IDL.Type]>,
  config: Partial<UI.FormConfig>,
) => UI.VariantForm;
export declare const optForm: (ty: IDL.Type, config: Partial<UI.FormConfig>) => UI.OptionForm;
export declare const vecForm: (ty: IDL.Type, config: Partial<UI.FormConfig>) => UI.VecForm;
export declare class Render extends IDL.Visitor<null, InputBox> {
  visitType<T>(t: IDL.Type<T>, d: null): InputBox;
  visitNull(t: IDL.NullClass, d: null): InputBox;
  visitRecord(t: IDL.RecordClass, fields: Array<[string, IDL.Type]>, d: null): InputBox;
  visitTuple<T extends any[]>(t: IDL.TupleClass<T>, components: IDL.Type[], d: null): InputBox;
  visitVariant(t: IDL.VariantClass, fields: Array<[string, IDL.Type]>, d: null): InputBox;
  visitOpt<T>(t: IDL.OptClass<T>, ty: IDL.Type<T>, d: null): InputBox;
  visitVec<T>(t: IDL.VecClass<T>, ty: IDL.Type<T>, d: null): InputBox;
  visitRec<T>(t: IDL.RecClass<T>, ty: IDL.ConstructType<T>, d: null): InputBox;
}
/**
 *
 * @param t an IDL type
 * @returns an input for that type
 */
export declare function renderInput(t: IDL.Type): InputBox;
/**
 *
 * @param t an IDL Type
 * @param input an InputBox
 * @param value any
 * @returns rendering that value to the provided input
 */
export declare function renderValue(t: IDL.Type, input: InputBox, value: any): void;
export {};
