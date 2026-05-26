module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  ignorePatterns: ['out/', 'media/webview/', 'node_modules/', '*.vsix', '*.d.ts'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    eqeqeq: ['error', 'always'],
    curly: ['error', 'multi-line'],
  },
};
