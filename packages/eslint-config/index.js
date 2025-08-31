module.exports = {
  root: false,
  env: { browser: true, es2021: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react-refresh'],
  extends: [
    'eslint:recommended'
  ],
  rules: {
    'no-unused-vars': 'warn'
  }
};
