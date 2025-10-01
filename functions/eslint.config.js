import { globalIgnores } from 'eslint/config'
import tsParser from '@typescript-eslint/parser'
import baseConfig from 'eslint-config-custom'

export default [
  ...baseConfig,
  globalIgnores(['lib', 'node_modules']),
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-empty': 'off',
      'no-useless-escape': 'off',
      'prefer-const': 'off',
    },
  },
]
