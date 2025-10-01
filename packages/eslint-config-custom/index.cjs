const js = require('@eslint/js');
const globals = require('globals');
const tseslint = require('typescript-eslint');

/**
 * Base ESLint flat config shared across packages.
 * Consumers may extend this array with workspace-specific
 * overrides (ignores, environment tweaks, etc.).
 */
const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
    },
  },
];

module.exports = baseConfig;
