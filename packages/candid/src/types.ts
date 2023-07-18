/* eslint-disable @typescript-eslint/no-empty-interface */

import JSBI from 'jsbi';

/* eslint-disable jsdoc/require-jsdoc */
export interface JsonArray extends Array<JsonValue> {}

export interface JsonObject extends Record<string, JsonValue> {}

export type JsonValue = boolean | string | number | JsonArray | JsonObject | JSBI;
