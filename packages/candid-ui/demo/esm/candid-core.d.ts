import { IDL } from '@dfinity/candid';
export interface ParseConfig {
  random?: boolean;
}
export interface UIConfig {
  input?: HTMLElement;
  form?: InputForm;
  parse(t: IDL.Type, config: ParseConfig, v: string): any;
}
export interface FormConfig {
  open?: HTMLElement;
  event?: string;
  labelMap?: Record<string, string>;
  container?: HTMLElement;
  render(t: IDL.Type): InputBox;
}
export declare class InputBox {
  idl: IDL.Type;
  ui: UIConfig;
  status: HTMLElement;
  label: string | null;
  value: any;
  constructor(idl: IDL.Type, ui: UIConfig);
  isRejected(): boolean;
  parse(config?: ParseConfig): any;
  render(dom: HTMLElement): void;
}
export declare abstract class InputForm {
  ui: FormConfig;
  form: InputBox[];
  constructor(ui: FormConfig);
  abstract parse(config: ParseConfig): any;
  abstract generateForm(): any;
  renderForm(dom: HTMLElement): void;
  render(dom: HTMLElement): void;
}
export declare class RecordForm extends InputForm {
  fields: Array<[string, IDL.Type]>;
  ui: FormConfig;
  constructor(fields: Array<[string, IDL.Type]>, ui: FormConfig);
  generateForm(): void;
  parse(config: ParseConfig): Record<string, any> | undefined;
}
export declare class TupleForm extends InputForm {
  components: IDL.Type[];
  ui: FormConfig;
  constructor(components: IDL.Type[], ui: FormConfig);
  generateForm(): void;
  parse(config: ParseConfig): any[] | undefined;
}
export declare class VariantForm extends InputForm {
  fields: Array<[string, IDL.Type]>;
  ui: FormConfig;
  constructor(fields: Array<[string, IDL.Type]>, ui: FormConfig);
  generateForm(): void;
  parse(config: ParseConfig): Record<string, any> | undefined;
}
export declare class OptionForm extends InputForm {
  ty: IDL.Type;
  ui: FormConfig;
  constructor(ty: IDL.Type, ui: FormConfig);
  generateForm(): void;
  parse<T>(config: ParseConfig): [T] | [] | undefined;
}
export declare class VecForm extends InputForm {
  ty: IDL.Type;
  ui: FormConfig;
  constructor(ty: IDL.Type, ui: FormConfig);
  generateForm(): void;
  parse<T>(config: ParseConfig): T[] | undefined;
}
