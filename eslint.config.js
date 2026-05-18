import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['.cache/**', '.idea/**', '.n8n/**', 'node_modules/**', 'src/05-security-observability/trace.jsonl'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
];
