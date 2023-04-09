import 'reflect-metadata';
/**
 *
 * @param strings - template strings
 * @param values - values to be escaped
 * @returns - escaped string
 */
export declare function html(strings: TemplateStringsArray, ...values: unknown[]): string;
/**
 *
 * @param strings - template strings
 * @param values - values to be escaped
 * @returns - joined string
 */
export declare function css(strings: TemplateStringsArray, ...values: unknown[]): string;
