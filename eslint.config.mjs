import { defineConfig, globalIgnores } from 'eslint/config';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  globalIgnores([
    'docs/',
    '.dfx/',
    '**/lib/',
    '**/dist/',
    '**/__certificates__/',
    '**/declarations/',
    '**/types/',
  ]),
  {
    files: ['**/*.{ts,tsx,js,jsx}'],

    extends: compat.extends(
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:jsdoc/recommended',
    ),

    plugins: { '@typescript-eslint': typescriptEslint },

    languageOptions: { parser: tsParser },

    rules: {
      'jsdoc/newline-after-description': 'off',
      'jsdoc/require-returns-type': 'off',
      'jsdoc/require-param-type': 'off',

      'jsdoc/require-jsdoc': ['error', { publicOnly: true }],

      'jsdoc/check-tag-names': ['warn', { definedTags: ['jest-environment'] }],

      'jsdoc/require-returns': 'off',
      'jsdoc/require-returns-description': 'warn',
    },
  },
]);
