import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    rules: {
      'max-lines': ['error', { max: 450, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
  { ignores: ['dist/**'] },
);
