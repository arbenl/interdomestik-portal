import { globalIgnores } from 'eslint/config'
import tsParser from '@typescript-eslint/parser'

export default [
  globalIgnores(['lib', 'node_modules']),
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'commonjs',
    },
    rules: {
      'no-console': 'off',
    },
  },
]
