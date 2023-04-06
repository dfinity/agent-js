/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/ban-types */

import 'reflect-metadata';
const requiredMetadataKey = Symbol('required');
/**
 *
 * @param strings - template strings
 * @param values - values to be escaped
 * @returns - escaped string
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]) {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      result += escapeHtml(values[i]);
    }
  }
  return result;
}

function escapeHtml(unsafe: unknown) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 *
 * @param strings - template strings
 * @param values - values to be escaped
 * @returns - joined string
 */
export function css(strings: TemplateStringsArray, ...values: unknown[]) {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      result += values[i];
    }
  }
  return result;
}
