const js = require('@eslint/js');
const globals = require('globals');
const tseslint = require('typescript-eslint');
const eslintPluginReactHooks = require('eslint-plugin-react-hooks');
const eslintPluginReactRefresh = require('eslint-plugin-react-refresh');

module.exports = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    plugins: {
      'react-hooks': eslintPluginReactHooks,
      'react-refresh': eslintPluginReactRefresh,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
];
